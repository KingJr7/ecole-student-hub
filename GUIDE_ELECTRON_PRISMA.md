# Guide : Intégration de Prisma & SQLite dans une Application Electron

Ce document explique la démarche complète et la configuration requise pour faire fonctionner de manière fiable une base de données Prisma/SQLite dans une application Electron, en particulier après avoir été packagée avec `electron-builder` et l'archivage ASAR.

## Le Défi

Intégrer Prisma et SQLite dans Electron présente trois défis majeurs :
1.  **Modules Natifs et ASAR** : Prisma utilise un moteur de requête binaire (un fichier `.node`) et `sqlite3` est également un module natif. Ces fichiers ne peuvent pas être exécutés depuis l'intérieur d'une archive `app.asar` (qui est un fichier en lecture seule).
2.  **Chemins de Fichiers** : En développement, la base de données peut se trouver dans le projet. En production, l'application est installée dans un dossier système (ex: `Program Files`) où elle n'a pas le droit d'écrire. La base de données doit donc résider dans un dossier de données utilisateur (comme `AppData`).
3.  **Détection de l'Environnement** : L'application doit distinguer de manière fiable si elle s'exécute en mode développement ou en production (packagée) pour utiliser les bons chemins.

## La Solution Complète : Étape par Étape

Voici la configuration finale et fonctionnelle qui résout ces problèmes.

### Étape 1: `package.json` - Le Chef d'Orchestre

Ce fichier est crucial pour dire à `electron-builder` comment se comporter.

```json
{
  "scripts": {
    "build": "prisma generate && vite build",
    // ...
  },
  "build": {
    "asar": true,
    "appId": "com.ntik.school",
    "productName": "Ntik",
    "files": [
      "dist/**/*",
      "electron/**/*",
      "src/generated/prisma/**/*", // Important d'inclure le client généré
      "package.json"
    ],
    "asarUnpack": [
      "**/node_modules/sqlite3/**",
      "**/node_modules/prisma/**",
      "**/node_modules/@prisma/engines/**"
    ],
    "extraResources": [
      ".env",
      "database.sqlite"
    ]
  }
}
```

*   **`"build": "prisma generate && vite build"`** : Nous avons ajouté `prisma generate` ici. Cela garantit que votre client Prisma est toujours synchronisé avec votre schéma avant chaque build.
*   **`"asar": true`** : Nous utilisons l'archivage ASAR pour des temps de chargement plus rapides.
*   **`asarUnpack`** : C'est la section la plus critique. Elle indique à `electron-builder` de laisser les dossiers contenant les modules natifs en dehors de `app.asar`. Ils seront placés dans un dossier `app.asar.unpacked` à la place, où ils peuvent être exécutés normalement.
*   **`extraResources`** : Permet d'inclure des fichiers supplémentaires dans le build. Nous l'utilisons pour embarquer notre `database.sqlite` "modèle", qui servira de base pour les nouveaux utilisateurs.

### Étape 2: `prisma/schema.prisma` - La Source de Vérité

La configuration du générateur Prisma est essentielle pour que le client soit trouvé par Vite/TypeScript.

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma" // Chemin de sortie personnalisé
}
```

*   **`output`** : En forçant la génération du client dans le dossier `src` de notre application, nous nous assurons qu'il est traité comme faisant partie de notre code source et qu'il est correctement inclus dans le build final.

### Étape 3: `electron/ipc/database.cjs` - La Logique d'Initialisation

C'est le cœur de la solution. Ce fichier gère l'initialisation de la base de données de manière robuste.

```javascript
const { app, ipcMain } = require('electron');
// Import direct depuis le dossier généré !
const { PrismaClient } = require('../../src/generated/prisma'); 
const path = require('path');
const fs = require('fs');

// 1. Détection fiable de l'environnement
const isProd = app.isPackaged;

// 2. Définition du chemin de la BDD en production (dans AppData)
const prodDbPath = path.join(app.getPath('userData'), 'database.sqlite');

// 3. Logique de copie au premier lancement
if (isProd) {
  // Chemin de la BDD "modèle" incluse dans le build
  const packagedDbPath = path.join(process.resourcesPath, 'database.sqlite');

  if (!fs.existsSync(prodDbPath)) {
    fs.copyFileSync(packagedDbPath, prodDbPath);
  }
}

// 4. Sélection du bon chemin et initialisation de Prisma
const dbPath = isProd ? prodDbPath : path.join(__dirname, '../../database.sqlite');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

// ... le reste de vos handlers IPC ...
```

*   **`app.isPackaged`** : C'est la seule manière fiable de savoir si l'application est en production.
*   **Logique de copie** : Le code copie la base de données depuis les ressources en lecture seule (`process.resourcesPath`) vers le dossier de données utilisateur accessible en écriture (`app.getPath('userData')`), et seulement si elle n'existe pas déjà.
*   **Import direct** : L'import `require('../../src/generated/prisma')` est la clé pour éviter l'erreur `Cannot find module '.prisma/client/default'`. Il contourne le mécanisme de recherche dynamique de Prisma qui échoue dans ASAR.

### Étape 4: `electron/main.cjs` - Un Démarrage Propre

Nous avons supprimé l'appel à `db push` en production pour éviter les boucles infinies de `spawn`. La logique de copie dans `database.cjs` est désormais la seule responsable de l'initialisation de la base de données.

```javascript
// ...
app.whenReady().then(async () => {
  // La logique de copie de la BDD depuis database.cjs est maintenant la seule responsable
  // de l'initialisation en production. Nous n'appelons plus runDbPush() ici pour
  // éviter la boucle infinie de spawn.
  setupDatabaseIPC(prisma);
  setupAuthIPC(prisma);
  setupSyncIPC(prisma);
  
  createWindow();
});
// ...
```

## Conclusion

Avec cette configuration, votre application Electron est robuste. Elle gère correctement les environnements de développement et de production, assure l'intégrité de la base de données, et évite tous les pièges connus liés à l'utilisation de modules natifs avec ASAR.

# Rapport de Vulnérabilités - Application Ntik

Ce document résume les vulnérabilités de sécurité identifiées lors de l'analyse du code source de l'application Ntik le 2025-09-01. Chaque section détaille une faille, son niveau de risque, et un plan d'action pour la corriger.

---

### 1. Configuration d'Electron Incorrecte (Exécution de Code à Distance)

- **Criticité :** 🔥 **CRITIQUE**
- **Fichiers Concernés :** `electron/main.cjs`

#### Description

La configuration actuelle de la fenêtre principale (BrowserWindow) expose l'application à un risque majeur d'exécution de code à distance (RCE). Les options suivantes sont particulièrement dangereuses :

- `nodeIntegration: true` : Cette option donne au code du front-end (React) un accès complet aux API internes de Node.js (`fs` pour le système de fichiers, `child_process` pour exécuter des commandes, etc.).
- `contextIsolation: false` : Cette option supprime la barrière de sécurité entre le code de l'application et les scripts internes d'Electron.

**Risque :** Si un attaquant parvient à injecter du code malveillant dans le front-end (via une faille XSS, par exemple), il peut utiliser cet accès pour exécuter des commandes directement sur l'ordinateur de l'utilisateur, compromettant ainsi entièrement le système.

#### Plan d'Action

1.  **Modifier `electron/main.cjs`** pour adopter les pratiques de sécurité modernes :
    -   Passer `nodeIntegration` à `false`.
    -   Passer `contextIsolation` à `true`.
2.  **Créer un script de préchargement (`preload.js`)** : Ce script agira comme un pont sécurisé entre le front-end et le back-end (processus principal d'Electron).
3.  **Exposer les fonctions IPC via le `contextBridge`** dans le script de préchargement, afin que le front-end puisse appeler les fonctions du back-end de manière contrôlée et sécurisée, sans avoir accès à toutes les API de Node.js.

---

### 2. Mot de Passe Codé en Dur dans le Code Source

- **Criticité :** 🔥 **CRITIQUE**
- **Fichiers Concernés :** `ntik_password.txt`

#### Description

Un fichier texte contenant un mot de passe pour la base de données Supabase est présent à la racine du projet.

**Risque :** Si ce fichier est distribué avec l'application, n'importe qui peut le lire et obtenir un accès direct et potentiellement administratif à la base de données en ligne. Cela rend toutes les autres mesures de sécurité (authentification, permissions) inutiles, car la base de données peut être attaquée directement.

#### Plan d'Action

1.  **Supprimer immédiatement** le fichier `ntik_password.txt` du projet.
2.  **Changer immédiatement** le mot de passe de l'utilisateur Supabase concerné.
3.  **Stocker les secrets** (clés d'API, mots de passe) exclusivement dans des variables d'environnement via un fichier `.env` local.
4.  **S'assurer** que le fichier `.env` est bien listé dans `.gitignore` pour ne jamais être envoyé sur un dépôt de code.

---

### 3. Absence de Contrôle d'Accès sur les Points d'API Internes (IPC)

- **Criticité :** 🟡 **ÉLEVÉ**
- **Fichiers Concernés :** `electron/ipc/database.cjs`, `electron/ipc/auth.cjs`

#### Description

Les fonctions exposées via IPC (par exemple, `db:classes:delete`) acceptent des identifiants (`id`) directement du front-end et exécutent des opérations sur la base de données sans vérifier si l'utilisateur authentifié a l'autorisation d'effectuer cette action sur la ressource spécifique.

**Risque :** Un utilisateur authentifié (même avec des droits faibles) pourrait potentiellement deviner les `id` d'autres objets (par exemple, une classe ou un élève qui ne fait pas partie de son école) et envoyer des requêtes pour les lire, les modifier ou les supprimer. C'est une faille de type **IDOR (Insecure Direct Object Reference)**.

#### Plan d'Action

1.  **Récupérer le contexte de l'utilisateur** (son rôle, son `school_id`) au début de chaque handler IPC sensible.
2.  **Valider les données** reçues du front-end (par exemple, avec une librairie comme `zod`).
3.  **Ajouter une vérification d'autorisation** avant chaque opération critique. Par exemple, avant de supprimer une classe, vérifier que la classe demandée appartient bien au `school_id` de l'utilisateur connecté.
    ```javascript
    // Exemple pour la suppression d'une classe
    const user = await getUserFromSession(); // À implémenter
    const classToDelete = await prisma.classes.findUnique({ where: { id } });

    if (classToDelete.school_id !== user.school_id) {
      throw new Error("Accès non autorisé.");
    }
    // Procéder à la suppression...
    ```

---

### 4. Faille XSS (Cross-Site Scripting) dans le Composant de Graphique

- **Criticité :** 🟡 **ÉLEVÉ**
- **Fichiers Concernés :** `src/components/ui/chart.tsx`

#### Description

Le composant `ChartStyle` utilise la propriété `dangerouslySetInnerHTML` pour injecter une feuille de style (`<style>`) directement dans le DOM. Les couleurs de cette feuille de style proviennent des `props` du composant.

**Risque :** Les données (les couleurs) ne sont pas "nettoyées" (sanitized) avant d'être injectées. Si un attaquant trouve un moyen de contrôler la valeur d'une couleur passée à ce composant, il peut injecter du code HTML arbitraire, y compris des balises `<script>`. Combiné à la vulnérabilité n°1, cela peut mener à une exécution de code à distance (RCE).

#### Plan d'Action

1.  **Priorité 1 : Corriger la vulnérabilité n°1**. Cela réduira considérablement l'impact de cette faille XSS.
2.  **Nettoyer les données** : Avant de les injecter, valider que les valeurs de couleur sont bien des codes de couleur valides (ex: `#FFF`, `rgb(0,0,0)`, etc.) et ne contiennent aucun caractère HTML.
3.  **Refactoriser (Idéal)** : Modifier le composant pour qu'il n'utilise plus `dangerouslySetInnerHTML`. Appliquer les couleurs en tant que variables de style CSS (`style={{ '--color-key': color }}`) sur l'élément DOM principal du graphique, plutôt que d'injecter un bloc `<style>` entier.

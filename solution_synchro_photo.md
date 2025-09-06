# Solution pour la Synchronisation des Photos des Élèves

Ce document résume la solution implémentée pour synchroniser les photos des élèves avec Supabase Storage et la méthode pour résoudre les problèmes de cache du processus de développement.

## 1. Résolution des Problèmes de Cache

Si les modifications du code (en particulier pour les fichiers du processus principal d'Electron comme `sync.cjs`) ne semblent pas être prises en compte, il est probable qu'une version mise en cache de l'application soit utilisée.

**Procédure pour forcer une reconstruction complète :**

1.  **Arrêter** le serveur de développement (`npm run electron:dev`).
2.  **Supprimer les dossiers de build et de cache**. Depuis la racine du projet, exécutez :
    ```sh
    rm -rf dist build .vite .electron
    ```
3.  **(Optionnel)** Réinstaller les dépendances pour s'assurer qu'elles sont à jour :
    ```sh
    npm install
    ```
4.  **Redémarrer** le serveur de développement :
    ```sh
    npm run electron:dev
    ```

## 2. Code Final pour la Synchronisation des Photos

Voici les extraits de code clés qui ont été modifiés pour implémenter la fonctionnalité.

### Fichier : `electron/main.cjs`

Le chemin vers le dossier des images est passé au module de synchronisation.

```javascript
// ... dans la fonction app.whenReady().then(async () => { ...

  const imagesDir = path.join(app.getPath('userData'), 'images', 'students');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  setupDatabaseIPC(prisma);
  setupAuthIPC(prisma);
  // On passe le chemin des images à la configuration de la synchro
  setupSyncIPC(prisma, imagesDir);

// ...
```

### Fichier : `electron/ipc/sync.cjs`

De nouvelles fonctions et configurations ont été ajoutées pour gérer l'envoi des photos.

**a) Imports et initialisation**

```javascript
const fs = require('fs').promises;
const path = require('path');

let isSyncIpcSetup = false;
let localImagesDir; // Variable pour stocker le chemin

// ...

function setupSyncIPC(prisma, imagesDir) { // Accepte le chemin
  if (isSyncIpcSetup) {
    return;
  }
  isSyncIpcSetup = true;
  localImagesDir = imagesDir; // Stocke le chemin
  // ...
}
```

**b) Fonction d'aide pour l'envoi de photos**

Cette fonction gère la lecture du fichier local et l'envoi à Supabase.

```javascript
async function uploadStudentPhoto(supabase, pictureUrl) {
    if (!pictureUrl || pictureUrl.startsWith('http')) {
        return pictureUrl; // Déjà une URL ou pas de photo
    }

    const imagePath = path.join(localImagesDir, pictureUrl);
    try {
        const imageBody = await fs.readFile(imagePath);
        const { data, error } = await supabase.storage
            .from('student_pictures')
            .upload(pictureUrl, imageBody, {
                cacheControl: '3600',
                upsert: true, // Écrase si le fichier existe
            });

        if (error) {
            sendSyncLog('error', `  -> ❌ Erreur d'upload de la photo ${pictureUrl}`, { error: error.message });
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('student_pictures')
            .getPublicUrl(pictureUrl);
        
        sendSyncLog('info', `  -> 🖼️ Photo ${pictureUrl} uploadée avec succès. URL: ${publicUrl}`);
        return publicUrl;

    } catch (fileError) {
        sendSyncLog('error', `  -> ❌ Impossible de lire le fichier image local ${imagePath}`, { error: fileError.message });
        return null;
    }
}
```

**c) Mise à jour de la configuration de la table `students`**

La fonction `supabaseMap` est modifiée pour utiliser le helper `uploadStudentPhoto` et mettre à jour la base de données locale en retour.

```javascript
// Dans l'objet tableConfigs
students: {
    name: 'students', model: 'students',
    pullSelect: '*, registrations!inner(*)',
    pullFilterColumn: 'registrations.school_id',
    supabaseMap: async (row, schoolId, prisma, supabase) => {
        let newPictureUrl = row.picture_url;
        // Vérifie si on a une photo locale non synchronisée
        if (row.picture_url && !row.picture_url.startsWith('http')) {
            newPictureUrl = await uploadStudentPhoto(supabase, row.picture_url);
            if (newPictureUrl) {
                // Met à jour l'enregistrement local avec la nouvelle URL pour éviter les ré-uploads
                await prisma.students.update({
                    where: { id: row.id },
                    data: { picture_url: newPictureUrl }
                });
            }
        }
        
        return { 
            name: row.name,
            first_name: row.first_name,
            genre: row.genre,
            birth_date: row.birth_date,
            picture_url: newPictureUrl, // Utilise la nouvelle URL
            matricul: row.matricul
        };
    },
    localMap: (row) => ({ 
        name: row.name,
        first_name: row.first_name,
        genre: row.genre,
        birth_date: row.birth_date,
        picture_url: row.picture_url,
        matricul: row.matricul
    })
},
```

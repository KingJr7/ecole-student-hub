<div align="center">
  <br />
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Kingjr7/ecole-student-hub/main/build/icon.png">
    <img alt="Ntik Logo" width="150" src="https://raw.githubusercontent.com/Kingjr7/ecole-student-hub/main/build/icon.png">
  </picture>
  <br />
  <h1 align="center">Ntik - Système de Gestion Scolaire</h1>
  <p align="center">
    Une application de bureau complète pour la gestion d'établissements scolaires, construite avec Electron, React, Prisma et Supabase.
  </p>
  <p align="center">
    <img alt="Version" src="https://img.shields.io/github/package-json/v/Kingjr7/ecole-student-hub?style=for-the-badge&label=Version&logo=github"/>
    <img alt="Statut du Workflow" src="https://img.shields.io/github/actions/workflow/status/Kingjr7/ecole-student-hub/release.yml?style=for-the-badge&logo=githubactions&logoColor=white" />
    <img alt="Licence" src="https://img.shields.io/github/license/Kingjr7/ecole-student-hub?style=for-the-badge&color=blue" />
  </p>
</div>

---

## 📋 Sommaire

- [À Propos du Projet](#-à-propos-du-projet)
- [✨ Fonctionnalités Principales](#-fonctionnalités-principales)
- [🛠️ Stack Technique](#-stack-technique)
- [🏗️ Architecture](#️-architecture)
- [🚀 Démarrage Rapide](#-démarrage-rapide)
  - [Prérequis](#prérequis)
  - [Installation](#installation)
- [📜 Scripts Disponibles](#-scripts-disponibles)
- [📁 Structure du Projet](#-structure-du-projet)
- [🤝 Contribution](#-contribution)
- [📄 Licence](#-licence)

---

## 🎯 À Propos du Projet

**Ntik** est une solution de gestion scolaire (SMS) moderne et complète, conçue pour fonctionner comme une application de bureau multiplateforme (Windows, Linux). Elle offre une interface intuitive pour gérer tous les aspects de la vie scolaire, de l'inscription des élèves à la gestion financière, en passant par le suivi pédagogique.

L'application est bâtie sur une architecture **local-first**, garantissant une haute disponibilité et des performances rapides même sans connexion internet. Les données sont stockées localement dans une base de données SQLite et peuvent être synchronisées avec un backend Supabase pour la sauvegarde, l'analyse et l'accès multi-utilisateurs.

---

## ✨ Fonctionnalités Principales

Ntik couvre un large éventail de besoins pour une gestion scolaire efficace :

- **📊 Tableau de Bord Intuitif** : Visualisation des statistiques clés (élèves, présences, finances) en temps réel.
- **👨‍🎓 Gestion des Élèves** : Inscription, suivi des informations personnelles, gestion des photos et liaison avec les parents.
- **👨‍🏫 Gestion du Personnel** : Administration des fiches des professeurs et employés, suivi des heures de travail et paiement des salaires.
- **📚 Gestion Pédagogique** :
  - Création des classes, matières et coefficients.
  - Enregistrement des notes et calcul automatique des moyennes et des rangs.
  - Gestion des emplois du temps et suivi des présences.
- **💰 Gestion Financière Complète** :
  - Configuration des frais de scolarité (frais uniques, modèles de frais récurrents).
  - Enregistrement des paiements et impression de reçus.
  - Catégorisation des revenus/dépenses et règles de répartition automatique des revenus.
- **📅 Gestion des Événements** : Planification et communication des événements scolaires.
- **⚙️ Paramétrage Avancé** : Configuration des informations de l'école, de l'année scolaire active, etc.
- **🔄 Synchronisation des Données** : Synchronisation transparente avec un serveur distant (Supabase) pour la sauvegarde et la collaboration.

---

## 🛠️ Stack Technique

Ce projet intègre des technologies modernes pour offrir une expérience robuste et performante.

| Catégorie          | Technologie                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Application**    | ![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white) |
| **Frontend**       | ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)        |
| **Base de Données**| ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white) |
| **Backend & Sync** | ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white) |
| **Styling**        | ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) & [Shadcn/UI](https://shadcn.com) |
| **State Management**| ![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=flat-square&logo=tanstack&logoColor=white) |
| **Typage**         | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) |
| **Linting**        | ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white) |

---

## 🏗️ Architecture

L'application repose sur une architecture Electron classique mais puissante :

1.  **Processus Principal (Main Process)** :
    - Géré par `electron/main.cjs`.
    - Responsable de la création des fenêtres et de la gestion du cycle de vie de l'application.
    - Expose des **handlers IPC** (`electron/ipc/*.cjs`) qui sont les seuls à pouvoir communiquer avec la base de données Prisma. C'est la couche "backend" de l'application.

2.  **Processus de Rendu (Renderer Process)** :
    - C'est l'interface utilisateur, une application **React** (SPA) gérée par Vite.
    - Le code source se trouve dans `src/`.
    - La communication avec le processus principal se fait exclusivement via des appels IPC (définis dans `electron/preload.cjs`) pour demander ou envoyer des données.

3.  **Base de Données (Local-First)** :
    - **Prisma** est utilisé comme ORM pour interagir avec une base de données **SQLite** locale (`ntik.sqlite`).
    - En production, la base de données est stockée dans le dossier des données utilisateur (`AppData` sur Windows, `~/.config` sur Linux) pour permettre l'écriture.
    - Au premier lancement, une base de données vierge est copiée depuis les ressources de l'application vers le dossier utilisateur.

---

## 🚀 Démarrage Rapide

Suivez ces étapes pour lancer une instance de développement local.

### Prérequis

- [Node.js](https://nodejs.org/) (v18+ recommandé)
- [npm](https://www.npmjs.com/) (généralement inclus avec Node.js)

### Installation

1.  **Clonez le dépôt :**
    ```sh
    git clone https://github.com/Kingjr7/ecole-student-hub.git
    cd ecole-student-hub
    ```

2.  **Installez les dépendances :**
    ```sh
    npm install
    ```

3.  **Configurez la base de données :**
    Créez un fichier `.env` à la racine du projet et ajoutez le chemin vers votre base de données SQLite.
    ```env
    DATABASE_URL="file:./ntik.sqlite"
    ```

4.  **Appliquez les migrations Prisma :**
    Cette commande va créer la base de données `ntik.sqlite` et y appliquer le schéma.
    ```sh
    npx prisma migrate dev
    ```

5.  **(Optionnel) Remplissez la base de données avec des données de test :**
    ```sh
    npx prisma db seed
    ```

6.  **Lancez l'application en mode développement :**
    Ce script lance simultanément le serveur de développement Vite et l'application Electron.
    ```sh
    npm run start:dev
    ```

---

## 📜 Scripts Disponibles

Voici une liste des scripts `npm` les plus importants :

| Script              | Description                                                                          |
| ------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`       | Lance le serveur de développement Vite pour le frontend React.                       |
| `npm run electron:dev`| Lance l'application Electron en mode développement.                                  |
| `npm run start:dev` | **(Recommandé)** Lance `dev` et `electron:dev` en parallèle.                         |
| `npm run build`     | Génère le client Prisma et build le frontend Vite pour la production.                |
| `npm run dist`      | Build l'application et la package avec `electron-builder` pour la distribution.      |
| `npm run lint`      | Analyse le code avec ESLint pour trouver les erreurs de style et de syntaxe.         |
| `npm run clear-db`  | Script personnalisé pour nettoyer la base de données.                                |

---

## 📁 Structure du Projet

```
.
├── electron/              # Code du processus principal d'Electron
│   ├── ipc/               # Handlers IPC (logique backend)
│   ├── main.cjs           # Point d'entrée principal
│   └── preload.cjs        # Pont entre le main et le renderer process
├── prisma/                # Schéma, migrations et seed de la base de données
│   └── schema.prisma      # Définition des modèles de données
├── release/               # Fichiers de distribution générés par electron-builder
├── scripts/               # Scripts Node.js utilitaires
├── src/                   # Code source du frontend (React)
│   ├── components/        # Composants UI réutilisables (Shadcn)
│   ├── context/           # Contextes React (ex: AuthContext)
│   ├── generated/         # Client Prisma généré automatiquement
│   ├── hooks/             # Hooks personnalisés
│   ├── lib/               # Fonctions utilitaires, API, etc.
│   ├── pages/             # Composants de page principaux
│   └── App.tsx            # Composant racine de l'application React
├── package.json           # Dépendances et scripts du projet
└── vite.config.ts         # Configuration de Vite
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Si vous souhaitez améliorer le projet, veuillez forker le dépôt et créer une pull request. Pour des changements majeurs, merci d'ouvrir une issue au préalable pour discuter de ce que vous aimeriez changer.

---

## 📄 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.
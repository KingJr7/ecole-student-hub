# Guide d'Intégration : Processus de Transition Annuelle

## 1. Objectif

L'objectif de cette fonctionnalité est de fournir aux administrateurs un outil guidé, fiable et simple pour clôturer une année scolaire et préparer la suivante. Le processus doit gérer automatiquement la promotion des élèves, les redoublements, et l'archivage des données de l'année écoulée tout en préservant l'intégrité de l'historique.

---

## 2. Concepts Clés

- **Année Scolaire Active :** Le système doit toujours avoir une seule "année scolaire active". Toutes les opérations courantes (inscriptions, paiements, notes) se font par défaut sur cette année. L'administrateur doit pouvoir changer l'année active via le nouveau module.

- **Archivage Implicite :** Aucune donnée n'est supprimée. Les données d'une année scolaire (notes, paiements, absences) sont automatiquement "archivées" lorsque l'année active change. Elles restent consultables à tout moment.

- **Persistance des Entités :** Les fiches des élèves, professeurs, employés et parents sont des entités permanentes. Elles ne sont pas dupliquées chaque année. Seules les **inscriptions** des élèves sont spécifiques à une année.

---

## 3. Parcours Utilisateur (UI/UX)

### 3.1. Point d'Accès

Un nouvel élément de menu sera ajouté dans la barre latérale, sous "Paramètres" :
- **Gestion Année Scolaire**

Cette page sera le point d'entrée de l'assistant de transition.

### 3.2. L'Assistant de Transition

L'interface sera un assistant en plusieurs étapes pour guider l'administrateur.

#### **Étape 1 : Bilan de Fin d'Année ("Conseil de Classe")**

- **Description :** Un tableau affiche tous les élèves de l'année scolaire **active**. 
- **Colonnes du tableau :**
  - Nom de l'élève
  - Classe actuelle
  - Moyenne générale annuelle (calculée automatiquement)
  - **Décision (liste déroulante) :**
    - `Passe en classe supérieure` (valeur par défaut si moyenne >= 10)
    - `Redouble` (valeur par défaut si moyenne < 10)
    - `Départ / Transfert`
- **Action :** L'administrateur vérifie et ajuste les décisions pour chaque élève. Un bouton "Valider les décisions et passer à l'étape suivante" est présent.

#### **Étape 2 : Configuration de la Nouvelle Année**

- **Description :** Un formulaire pour paramétrer la nouvelle année scolaire.
- **Champs :**
  - **Nom de la nouvelle année scolaire :** (ex: "2025-2026").
  - **Gestion des classes :**
    - Option 1 : "Reconduire la structure des classes de l'année précédente" (pré-cochée).
    - Option 2 : Un outil simple pour ajouter/modifier/supprimer les classes pour la nouvelle année.
  - **Gestion des frais :** Un lien vers la page de gestion des frais pour inviter l'administrateur à définir les nouveaux tarifs pour l'année à venir.

#### **Étape 3 : Résumé et Confirmation**

- **Description :** Un écran de résumé affiche un bilan des actions qui vont être exécutées.
- **Exemple d'affichage :**
  - **Nouvelle année scolaire :** 2025-2026
  - **Élèves à promouvoir :** 145
  - **Élèves à faire redoubler :** 12
  - **Élèves sans nouvelle inscription (Départ/Transfert) :** 8
- **Action :** Un bouton principal : **"Lancer la transition"**. Un avertissement indique que l'action peut prendre plusieurs minutes et est irréversible.

#### **Étape 4 : Exécution et Finalisation**

- **Description :** Une barre de progression s'affiche pendant que le système traite les inscriptions en arrière-plan.
- **Fin du processus :** Un message de succès s'affiche.
- **Action finale :** Un dernier bouton apparaît : **"Activer l'année scolaire 2025-2026"**. En cliquant, l'administrateur bascule toute l'application sur la nouvelle année.

---

## 4. Modifications Techniques Nécessaires

### 4.1. Schéma de la Base de Données (Prisma)

- **Table `Settings` :**
  - S'assurer de la présence du champ `active_school_year` (type `String`).

- **Table `Classes` :**
  - **Ajouter un champ `level_index` (type `Int`)**. Ce champ est crucial pour automatiser la promotion. Ex: `6ème` -> `level_index: 6`, `5ème` -> `level_index: 5`. Cela permet de trouver la classe supérieure en faisant `level_index - 1`.

- **Table `Registrations` :**
  - Le champ `state` sera utilisé pour marquer les nouvelles inscriptions comme `pré-inscrit`.

### 4.2. Logique Backend (Nouveaux Handlers IPC)

De nouvelles fonctions seront nécessaires dans `electron/ipc/database.cjs` :

- `db:school-year:get-summary`: Récupère la liste des élèves avec leur moyenne annuelle pour l'affichage dans l'étape 1.
- `db:school-year:execute-transition`: La fonction transactionnelle principale qui lit les décisions et crée les nouvelles inscriptions pour tous les élèves concernés.
- `db:school-year:set-active-year`: Une fonction simple qui met à jour le champ `active_school_year` dans la table `Settings`.

---

## 5. Plan d'Implémentation Suggéré

1.  **Phase 1 (Backend & Base de données) :**
    - Créer la migration Prisma pour ajouter `level_index` à la table `Classes`.
    - Implémenter les trois nouveaux handlers IPC décrits ci-dessus.

2.  **Phase 2 (Frontend) :**
    - Créer le nouveau composant page `src/pages/SchoolYearManager.tsx`.
    - Développer l'assistant (wizard) avec ses 4 étapes.

3.  **Phase 3 (Intégration & Tests) :**
    - Lier les actions de l'interface utilisateur aux fonctions backend.
    - Tester rigoureusement le processus de bout en bout sur une base de données de test.

# Cahier des Charges - Application de Gestion Scolaire Ntik

Ce document détaille l'ensemble des fonctionnalités de l'application de gestion scolaire Ntik. Il est basé sur l'analyse des capacités du backend de l'application.

## 1. Tableau de Bord

Le tableau de bord offre une vue d'ensemble et centralisée des données clés de l'établissement.

- **Statistiques Générales** : Affichage du nombre total d'élèves, de professeurs et de classes.
- **Répartition par Genre** : Visualisation de la répartition des élèves par genre (Garçons / Filles).
- **Graphique des Présences** : Un graphique en anneau (Donut) montrant la répartition des présences pour la journée en cours (présents, absents, en retard).
- **Graphique des Paiements** : Un graphique en barres affichant l'évolution des paiements de scolarité sur les 6 derniers mois.
- **Graphique de Répartition des Élèves** : Un graphique en barres montrant le nombre d'élèves dans chaque classe.
- **Liste des Inscriptions Récentes** : Affichage des 5 derniers élèves inscrits.

## 2. Gestion des Élèves

Module complet pour la gestion des informations des élèves.

- **Liste des Élèves** : Afficher la liste complète de tous les élèves inscrits.
- **Création d'un Élève** : Ajouter un nouvel élève avec ses informations personnelles (nom, prénom, date de naissance, genre, photo).
- **Modification d'un Élève** : Mettre à jour les informations d'un élève existant.
- **Suppression d'un Élève** : Supprimer un élève (suppression logique, marquée comme `is_deleted`).
- **Gestion des Parents** : Lier un ou plusieurs parents à un élève avec la nature de la relation (père, mère, tuteur).

## 3. Gestion des Classes et Matières

Organisation de la structure pédagogique de l'école.

- **CRUD pour les Classes** : Créer, lire, mettre à jour et supprimer des classes (ex: 6ème A, Terminale C).
- **CRUD pour les Matières** : Créer, lire, mettre à jour et supprimer des matières (ex: Mathématiques, Histoire).
- **Attribution des Matières** : Assigner des matières à une classe et à un professeur, en spécifiant un coefficient.

## 4. Gestion du Personnel

### 4.1. Professeurs
- **CRUD pour les Professeurs** : Gérer les informations des professeurs (nom, contact, spécialité).
- **Génération de Matricule** : Attribution automatique d'un matricule unique lors de la création d'un professeur.
- **Gestion des Heures de Travail** : Enregistrer les heures de cours effectuées par chaque professeur pour le calcul des salaires.

### 4.2. Autres Employés
- **CRUD pour les Employés** : Gérer les informations du personnel administratif et autre.
- **Génération de Matricule** : Attribution automatique d'un matricule unique.
- **Paiement des Salaires** : Gérer le paiement des salaires, avec la possibilité d'ajouter des primes et de générer des fiches de paie.

## 5. Gestion Pédagogique

Suivi des activités académiques des élèves.

- **Gestion des Notes** : Enregistrer, modifier et supprimer les notes des élèves pour chaque matière, par type (devoir, composition) et par trimestre.
- **Gestion des Présences** : Enregistrer et suivre les présences des élèves de manière journalière (présent, absent, en retard, justifié).
- **Gestion des Emplois du Temps** : Créer et visualiser l'emploi du temps pour chaque classe.

## 6. Gestion Financière

Suivi des flux financiers de l'établissement.

- **Configuration des Frais** : Définir les différents types de frais de scolarité par niveau (primaire, collège, lycée).
- **Enregistrement des Paiements** : Enregistrer les paiements de scolarité effectués par les élèves.
- **Historique des Paiements** : Consulter un historique centralisé de tous les paiements, qu'il s'agisse des frais de scolarité ou des salaires du personnel.
- **Impression de Reçus** : Générer et imprimer des reçus de paiement via une imprimante thermique.

## 7. Rapports et Exports

Outils d'analyse et de reporting.

- **Calcul des Résultats Scolaires** : Générer automatiquement les moyennes, les rangs et le statut (admis, non admis) pour chaque élève d'une classe à la fin d'un trimestre.
- **Génération de Bulletins** : Créer les bulletins de notes individuels pour chaque élève.
- **Génération de Fiches de Paie** : Créer des fiches de paie détaillées pour les employés.

## 8. Paramètres de l'Application

Configuration générale de l'application.

- **Informations de l'École** : Définir et modifier le nom et l'adresse de l'établissement, informations qui seront utilisées dans les documents générés (bulletins, fiches de paie).
- **Support Client** : Accès rapide aux informations de contact du support technique.
- **Déconnexion** : Permettre à l'utilisateur de se déconnecter de manière sécurisée.

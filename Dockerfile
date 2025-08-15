
# Étape 1: Utiliser une image Node.js de base
FROM node:20-bullseye-slim as base

# Mettre à jour les paquets et installer les dépendances de base
RUN apt-get update && apt-get install -y --no-install-recommends curl git

# Étape 2: Préparer l'environnement de build avec Wine
FROM base as build

# Installer Wine et les dépendances nécessaires pour la construction Windows
RUN dpkg --add-architecture i386 \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        wine \
        wine32 \
        wine64 \
        libwine \
        libasound2 \
        libnss3 \
        libgtk-3-0 \
        libxtst6 \
        libxss1 \
        libdbus-1-3 \
        xvfb

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers du projet
COPY package.json package-lock.json ./

# Installer les dépendances du projet
RUN npm install

# Copier le reste des fichiers du projet
COPY . .

# Lancer la commande de build pour Windows
RUN npm run build:windows


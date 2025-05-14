#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const CODE_LENGTH = 8; // Longueur du code
const NUMBER_OF_CODES = 1000; // Nombre de codes u00e0 gu00e9nu00e9rer
const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Caractu00e8res utilisu00e9s (sans I, O, 0, 1 pour u00e9viter la confusion)

// Fonction pour gu00e9nu00e9rer un code alu00e9atoire
function generateRandomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    code += CHARACTERS[randomIndex];
  }
  return code;
}

// Gu00e9nu00e9rer un ensemble de codes uniques
function generateUniqueCodes() {
  const codes = new Set();
  while (codes.size < NUMBER_OF_CODES) {
    codes.add(generateRandomCode());
  }
  return Array.from(codes);
}

// Sauvegarder les codes dans un fichier
function saveCodesToCsv(codes) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const currentDir = process.cwd();
  const filePath = path.join(currentDir, `ntik_access_codes_${timestamp}.csv`);
  
  // Cru00e9er le contenu CSV
  const csvContent = 'code,used\n' + codes.map(code => `${code},false`).join('\n');
  
  // u00c9crire le fichier
  fs.writeFileSync(filePath, csvContent);
  
  return filePath;
}

// Fonction principale
function main() {
  try {
    console.log(`Gu00e9nu00e9ration de ${NUMBER_OF_CODES} codes d'accu00e8s uniques de ${CODE_LENGTH} caractu00e8res...`);
    
    // Gu00e9nu00e9rer les codes
    const codes = generateUniqueCodes();
    console.log(`${codes.length} codes gu00e9nu00e9ru00e9s.`);
    
    // Sauvegarder les codes
    const filePath = saveCodesToCsv(codes);
    
    console.log(`Gu00e9nu00e9ration des codes terminu00e9e avec succu00e8s!`);
    console.log(`Les codes ont u00e9tu00e9 sauvegardu00e9s dans: ${filePath}`);
  } catch (error) {
    console.error('Erreur lors de la gu00e9nu00e9ration des codes:', error);
  }
}

// Exu00e9cuter le script
main();

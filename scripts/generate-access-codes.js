import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration Supabase
const supabaseUrl = 'https://pxldlplqpshfigfejuam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bGRscGxxcHNoZmlnZmVqdWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NTU0MTgsImV4cCI6MjA1ODAzMTQxOH0.9_xwVw5dUk3eIEte2uQzuqaAyAi-YXqPKpFNRFXv-3c';

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const CODE_LENGTH = 8; // Longueur du code
const NUMBER_OF_CODES = 1000; // Nombre de codes à générer
const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Caractères utilisés (sans I, O, 0, 1 pour éviter la confusion)

// Fonction pour générer un code aléatoire
function generateRandomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    code += CHARACTERS[randomIndex];
  }
  return code;
}

// Générer un ensemble de codes uniques
async function generateUniqueCodes() {
  const codes = new Set();
  while (codes.size < NUMBER_OF_CODES) {
    codes.add(generateRandomCode());
  }
  return Array.from(codes);
}

// Insérer les codes dans Supabase
async function insertCodesIntoSupabase(codes) {
  console.log(`Insertion de ${codes.length} codes dans Supabase...`);
  
  const batchSize = 100; // Taille du lot pour les insertions par lots
  const batches = [];
  
  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize).map(code => ({
      code,
      used: false,
      created_at: new Date().toISOString()
    }));
    
    batches.push(batch);
  }
  
  const results = [];
  
  for (let i = 0; i < batches.length; i++) {
    console.log(`Insertion du lot ${i+1}/${batches.length}...`);
    
    const { data, error } = await supabase
      .from('access_codes')
      .insert(batches[i]);
    
    if (error) {
      console.error(`Erreur lors de l'insertion du lot ${i+1}:`, error);
    } else {
      console.log(`Lot ${i+1} inséré avec succès.`);
      results.push(...batches[i]);
    }
  }
  
  return results;
}

// Sauvegarder les codes dans un fichier
function saveCodesToCsv(codes) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(process.cwd(), `ntik_access_codes_${timestamp}.csv`);
  
  // Créer le contenu CSV
  const csvContent = 'code,used\n' + codes.map(code => `${code.code},${code.used}`).join('\n');
  
  // Écrire le fichier
  fs.writeFileSync(filePath, csvContent);
  
  console.log(`Les codes ont été sauvegardés dans: ${filePath}`);
}

// Vérifier si la table existe et la créer si nécessaire
async function ensureTableExists() {
  console.log('Vérification de la table access_codes...');
  
  const { data, error } = await supabase
    .from('access_codes')
    .select('id')
    .limit(1);
  
  if (error && error.code === '42P01') { // Table n'existe pas
    console.log('La table access_codes n\'existe pas. Veuillez la créer manuellement dans Supabase avec les colonnes suivantes:');
    console.log('- id (int8, primary key, auto-increment)');
    console.log('- code (varchar, unique)');
    console.log('- used (boolean, default: false)');
    console.log('- machine_id (varchar, nullable)');
    console.log('- activated_at (timestamp, nullable)');
    console.log('- school_name (varchar, nullable)');
    console.log('- created_at (timestamp, default: now())');
    process.exit(1);
  }
}

// Fonction principale
async function main() {
  try {
    console.log(`Génération de ${NUMBER_OF_CODES} codes d'accès uniques de ${CODE_LENGTH} caractères...`);
    
    // Vérifier que la table existe
    await ensureTableExists();
    
    // Générer les codes
    const codes = await generateUniqueCodes();
    console.log(`${codes.length} codes générés.`);
    
    // Insérer dans Supabase
    const insertedCodes = await insertCodesIntoSupabase(codes);
    
    // Sauvegarder les codes
    saveCodesToCsv(insertedCodes);
    
    console.log('Génération des codes terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de la génération des codes:', error);
  }
}

// Exécuter le script
main();

/**
 * Script pour récupérer tous les codes d'activation non utilisés depuis Supabase
 * et les exporter dans un fichier texte
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obtenir le chemin du répertoire courant en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration Supabase (les mêmes paramètres que dans votre application)
const supabaseUrl = 'https://pxldlplqpshfigfejuam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bGRscGxxcHNoZmlnZmVqdWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NTU0MTgsImV4cCI6MjA1ODAzMTQxOH0.9_xwVw5dUk3eIEte2uQzuqaAyAi-YXqPKpFNRFXv-3c';

// Initialiser le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Nom du fichier de sortie
const outputFile = join(__dirname, 'unused_codes.txt');

/**
 * Fonction principale qui récupère les codes et les exporte
 */
async function exportUnusedCodes() {
  try {
    console.log('Récupération des codes d\'activation non utilisés...');
    
    // Récupérer tous les codes non utilisés
    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('used', false);
    
    if (error) {
      throw new Error(`Erreur lors de la récupération des codes: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.log('Aucun code d\'activation non utilisé trouvé.');
      return;
    }
    
    console.log(`${data.length} codes d'activation non utilisés trouvés.`);
    
    // Préparer le contenu du fichier
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    let fileContent = `# Codes d'activation non utilisés - Exportés le ${timestamp}\n`;
    fileContent += `# Nombre total de codes: ${data.length}\n\n`;
    
    // Ajouter chaque code au contenu
    data.forEach((item, index) => {
      fileContent += `${index + 1}. ${item.code}\n`;
    });
    
    // Écrire dans le fichier
    writeFileSync(outputFile, fileContent);
    
    console.log(`Les codes ont été exportés avec succès dans le fichier: ${outputFile}`);
  } catch (err) {
    console.error('Erreur lors de l\'exportation des codes:', err);
    process.exit(1);
  }
}

// Exécuter la fonction principale
exportUnusedCodes();

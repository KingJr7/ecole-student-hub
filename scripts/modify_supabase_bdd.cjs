const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://xmjugogpafvefjcmtjyn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtanVnb2dwYWZ2ZWZqY210anluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTU0NDUsImV4cCI6MjA2MzY5MTQ0NX0.8FDeZolP6Em9gVm7HXbyB7ypDeN0mBnrf3Ez8pFkwuM';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtanVnb2dwYWZ2ZWZqY210anluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODExNTQ0NSwiZXhwIjoyMDYzNjkxNDQ1fQ.eFOqdU0JO_x1npvMESdsWQAvHrgl0cIeYDKC_W1o2Pg'; // Clé avec droits d'admin

// Initialisation du client Supabase avec les privilèges admin
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Liste de toutes vos tables
const TABLES = [
  'schools', 'users', 'roles', 'classes', 'students', 
  'registrations', 'teachers', 'lessons', 'subjects', 
  'notes', 'parents', 'student_parents', 'payments', 
  'fees', 'attendances', 'employees', 'schedules', 
  'activity_logs'
];

// Colonnes à ajouter à chaque table
const SYNC_COLUMNS = [
  { name: 'local_id', type: 'integer' },
  { name: 'is_synced', type: 'boolean', defaultValue: 'false' },
  { name: 'sync_timestamp', type: 'timestamp with time zone' },
  { name: 'is_deleted', type: 'boolean', defaultValue: 'false' },
  { name: 'last_modified', type: 'timestamp with time zone', defaultValue: 'now()' }
];

// Fonction principale
async function addSyncColumns() {
  try {
    // 1. Créer la table sync_metadata
    await executeSql(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        table_name TEXT NOT NULL,
        last_sync_timestamp TIMESTAMP WITH TIME ZONE,
        last_sync_operation TEXT,
        UNIQUE(table_name)
    `);
    
    // 2. Créer la table sync_conflicts
    await executeSql(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        table_name TEXT NOT NULL,
        local_id INTEGER,
        remote_id UUID,
        local_data JSONB,
        remote_data JSONB,
        conflict_type TEXT,
        resolution TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // 3. Ajouter les colonnes de synchronisation à chaque table
    for (const table of TABLES) {
      await addColumnsToTable(table);
      console.log(`Colonnes ajoutées à la table ${table}`);
    }
    
    console.log('Toutes les modifications ont été appliquées avec succès!');
  } catch (error) {
    console.error('Erreur lors de la modification de la structure:', error);
  }
}

// Exécuter une requête SQL via l'API SQL de Supabase
async function executeSql(sql) {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: sql
  });
  
  if (error) throw error;
  return data;
}

// Ajouter les colonnes à une table spécifique
async function addColumnsToTable(tableName) {
  for (const column of SYNC_COLUMNS) {
    await executeSql(`
      ALTER TABLE ${tableName}
      ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
      ${column.defaultValue ? `DEFAULT ${column.defaultValue}` : ''}
    `);
  }
}

// Exécuter le script
addSyncColumns();
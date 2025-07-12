import { createClient } from '@supabase/supabase-js';

// Utiliser des variables d'environnement pour les clés Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;

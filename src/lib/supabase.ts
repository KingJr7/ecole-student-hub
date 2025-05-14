import { createClient } from '@supabase/supabase-js';

// Utiliser des variables d'environnement ou des constantes pour les valeurs de production
const supabaseUrl = 'https://pxldlplqpshfigfejuam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bGRscGxxcHNoZmlnZmVqdWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NTU0MTgsImV4cCI6MjA1ODAzMTQxOH0.9_xwVw5dUk3eIEte2uQzuqaAyAi-YXqPKpFNRFXv-3c';

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;

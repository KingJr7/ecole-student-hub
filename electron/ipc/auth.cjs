require('dotenv').config();
const { ipcMain } = require('electron');
const { createClient } = require('@supabase/supabase-js');
const { runSync } = require('./sync.cjs');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let isAuthIpcSetup = false;

function setupAuthIPC(prisma) {
  if (isAuthIpcSetup) {
    return;
  }
  isAuthIpcSetup = true;

  ipcMain.handle('auth:login-local', async (event, { email, password }) => {
    console.log(`[AUTH] Tentative de connexion locale pour: ${email}`);
    try {
      // Étape 1: Récupérer l'utilisateur depuis Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, roles(name)')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error('[AUTH] Erreur: Utilisateur non trouvé ou plusieurs utilisateurs avec cet email.', userError?.message);
        return { success: false, message: "Email ou mot de passe incorrect." };
      }

      // Étape 2: Vérifier le mot de passe avec bcrypt
      const passwordMatches = await bcrypt.compare(password, userData.password_hash);

      if (!passwordMatches) {
        console.warn('[AUTH] Avertissement: Mot de passe incorrect pour l\'utilisateur:', email);
        return { success: false, message: "Email ou mot de passe incorrect." };
      }

      const roleName = userData.roles.name;
      const schoolId = userData.school_id;

      // Étape 3: Mettre à jour la base de données locale
      await prisma.settings.upsert({
        where: { id: 1 },
        update: {
          schoolName: 'École', // Vous pouvez remplacer ceci par une valeur dynamique si nécessaire
          loggedIn: 1,
          userRole: roleName,
          schoolId: schoolId,
          userToken: null, // Pas de token avec cette méthode
        },
        create: {
          id: 1,
          schoolName: 'École',
          loggedIn: 1,
          userRole: roleName,
          schoolId: schoolId,
          userToken: null,
        },
      });

      // Étape 4: Lancer la synchronisation (sans token)
      console.log('[AUTH] Authentification locale réussie. Lancement de la synchronisation...');
      runSync(prisma, schoolId, null).catch(err => {
        console.error('La synchronisation a échoué après la connexion:', err);
      });

      return { success: true, role: roleName, school_id: schoolId };

    } catch (error) {
      console.error('Erreur de connexion inattendue:', error);
      return { success: false, message: 'Une erreur est survenue.' };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    await prisma.settings.update({
      where: { id: 1 },
      data: { loggedIn: 0, userRole: null, schoolId: null, userToken: null },
    });
    return { success: true };
  });

  ipcMain.handle('auth:getStatus', async () => {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    return settings || { loggedIn: 0 };
  });
}

module.exports = { setupAuthIPC };

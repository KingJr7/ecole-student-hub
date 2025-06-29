require('dotenv').config();
const { ipcMain } = require('electron');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { runSync } = require('./sync.cjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let isAuthIpcSetup = false;

function setupAuthIPC(db) {
  if (isAuthIpcSetup) {
    return;
  }
  isAuthIpcSetup = true;
  ipcMain.handle('auth:login', async (event, { email, password }) => {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !user) {
        return { success: false, message: 'Utilisateur non trouvé.' };
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return { success: false, message: 'Mot de passe incorrect.' };
      }

      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('name')
        .eq('id', user.role_id)
        .single();

      if (roleError || !roleData) {
        return { success: false, message: 'Rôle introuvable.' };
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: roleData.name, school_id: user.school_id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      // Stocker l'état de connexion dans la base de données locale
      db.run('UPDATE settings SET schoolName = ?, loggedIn = 1, userRole = ?, schoolId = ? WHERE id = 1', 
        [user.school_name || 'École', roleData.name, user.school_id]);

      // Lancer la synchronisation en arrière-plan
      runSync(user.school_id, token).catch(err => {
        console.error('Sync failed after login:', err);
      });

      return { success: true, token, role: roleData.name, school_id: user.school_id };
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return { success: false, message: 'Une erreur est survenue.' };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    db.run('UPDATE settings SET loggedIn = 0, userRole = NULL, schoolId = NULL WHERE id = 1');
    return { success: true };
  });

  ipcMain.handle('auth:getStatus', async () => {
    return new Promise((resolve, reject) => {
      db.get('SELECT loggedIn, userRole, schoolId FROM settings WHERE id = 1', (err, row) => {
        if (err) return reject(err);
        resolve(row || { loggedIn: 0 });
      });
    });
  });
}

module.exports = { setupAuthIPC };

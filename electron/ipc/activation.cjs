const { ipcMain } = require('electron');
const { machineIdSync } = require('node-machine-id');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const settings = require('electron-settings');

// Configuration Supabase
const supabaseUrl = 'https://pxldlplqpshfigfejuam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bGRscGxxcHNoZmlnZmVqdWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NTU0MTgsImV4cCI6MjA1ODAzMTQxOH0.9_xwVw5dUk3eIEte2uQzuqaAyAi-YXqPKpFNRFXv-3c';

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure les gestionnaires IPC pour l'activation
function setupActivationIPC() {
  // Obtenir l'ID unique de la machine
  ipcMain.handle('activation:getMachineId', async () => {
    try {
      return machineIdSync(true);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID de la machine:', error);
      // Fallback si machineIdSync échoue
      return `ntik-${Math.random().toString(36).substring(2, 15)}`;
    }
  });

  // Vérifier si le logiciel est déjà activé
  ipcMain.handle('activation:isActivated', async () => {
    const isActivated = await settings.get('isActivated');
    const storedMachineId = await settings.get('machineId');
    let currentMachineId;
    
    try {
      currentMachineId = machineIdSync(true);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID de la machine:', error);
      currentMachineId = storedMachineId; // Utiliser l'ID stocké en cas d'erreur
    }
    
    // Vérifier si l'ID de la machine correspond à celui stocké
    if (isActivated && storedMachineId === currentMachineId) {
      return true;
    }
    
    return false;
  });

  // Activer le logiciel avec un code d'activation
  ipcMain.handle('activation:activate', async (event, { activationCode, schoolName }) => {
    try {
      // Vérifier si le code est valide dans Supabase
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', activationCode)
        .single();

      if (error) {
        console.error('Erreur lors de la vérification du code:', error);
        return { success: false, message: 'Code d\'activation invalide.' };
      }

      // Vérifier si le code a déjà été utilisé
      if (data.used) {
        return { success: false, message: 'Ce code d\'activation a déjà été utilisé.' };
      }

      // Obtenir l'ID de la machine
      let machineId;
      try {
        machineId = machineIdSync(true);
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'ID de la machine:', error);
        machineId = `ntik-${Math.random().toString(36).substring(2, 15)}`;
      }

      // Marquer le code comme utilisé dans Supabase
      const { error: updateError } = await supabase
        .from('access_codes')
        .update({
          used: true,
          machine_id: machineId,
          activated_at: new Date().toISOString(),
          school_name: schoolName
        })
        .eq('id', data.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du code:', updateError);
        return { success: false, message: 'Erreur lors de l\'activation du code.' };
      }

      // Stocker l'activation localement
      const now = new Date().toISOString();
      await settings.set('isActivated', true);
      await settings.set('machineId', machineId);
      await settings.set('activationCode', activationCode);
      await settings.set('activatedAt', now);
      await settings.set('schoolName', schoolName);

      return { success: true, message: 'Logiciel activé avec succès!' };
    } catch (error) {
      console.error('Erreur lors de l\'activation:', error);
      return { success: false, message: 'Une erreur est survenue lors de l\'activation.' };
    }
  });

  // Vérifier la validité de l'activation
  ipcMain.handle('activation:verifyActivation', async () => {
    const isActivated = await settings.get('isActivated');
    if (!isActivated) {
      return false;
    }

    try {
      const storedCode = await settings.get('activationCode');
      const machineId = await settings.get('machineId');

      if (!storedCode || !machineId) {
        return false;
      }

      // Double vérification avec Supabase (si connexion Internet disponible)
      try {
        const { data, error } = await supabase
          .from('access_codes')
          .select('*')
          .eq('code', storedCode)
          .eq('machine_id', machineId)
          .single();

        if (error || !data) {
          console.warn('Échec de la vérification en ligne, mais clé locale présente');
          // Ne pas réinitialiser en cas d'erreur réseau - permettre l'utilisation hors ligne
          return true;
        }

        return true;
      } catch (error) {
        console.error('Erreur réseau lors de la vérification de l\'activation:', error);
        // En cas d'erreur réseau, considérer l'activation comme valide temporairement
        return true;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'activation:', error);
      return false;
    }
  });

  // Réinitialiser l'activation (pour les tests)
  ipcMain.handle('activation:resetActivation', async () => {
    await settings.unset('isActivated');
    await settings.unset('machineId');
    await settings.unset('activationCode');
    await settings.unset('activatedAt');
    await settings.unset('schoolName');
    return true;
  });

  // Obtenir les informations d'activation
  ipcMain.handle('activation:getActivationInfo', async () => {
    return {
      isActivated: (await settings.get('isActivated')) || false,
      machineId: await settings.get('machineId'),
      activationCode: await settings.get('activationCode'),
      activatedAt: await settings.get('activatedAt'),
      schoolName: await settings.get('schoolName')
    };
  });
}

module.exports = { setupActivationIPC };

// Interface pour les informations d'activation
interface ActivationInfo {
  isActivated: boolean;
  machineId?: string;
  activationCode?: string;
  activatedAt?: string;
  schoolName?: string;
}

// Classe qui gère l'activation du logiciel via IPC
class ActivationService {
  // Initialisation du service
  constructor() {
    if (typeof window === 'undefined') {
      console.log('ActivationService running in server mode');
    }
  }

  // Vérifier si le logiciel est activé
  async isActivated(): Promise<boolean> {
    if (typeof window === 'undefined') return true; // En mode SSR, considérer comme activé
    
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('activation:isActivated');
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'activation:', error);
      return false;
    }
  }

  // Activer le logiciel avec un code d'activation
  async activate(activationCode: string, schoolName: string): Promise<{ success: boolean; message: string }> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'L\'activation n\'est pas disponible en mode serveur.' };
    }
    
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('activation:activate', { activationCode, schoolName });
    } catch (error) {
      console.error('Erreur lors de l\'activation:', error);
      return { 
        success: false, 
        message: 'Une erreur est survenue lors de l\'activation. Vérifiez votre connexion internet.' 
      };
    }
  }

  // Vérifier la validité de l'activation
  async verifyActivation(): Promise<boolean> {
    if (typeof window === 'undefined') return true; // En mode SSR, considérer comme activé
    
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('activation:verifyActivation');
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'activation:', error);
      return false;
    }
  }

  // Obtenir les informations d'activation
  async getActivationInfo(): Promise<ActivationInfo> {
    if (typeof window === 'undefined') {
      return { isActivated: true }; // En mode SSR, retourner des valeurs par défaut
    }
    
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('activation:getActivationInfo');
    } catch (error) {
      console.error('Erreur lors de la récupération des informations d\'activation:', error);
      return { isActivated: false };
    }
  }

  // Réinitialiser l'activation (pour les tests)
  async resetActivation(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('activation:resetActivation');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation de l\'activation:', error);
      return false;
    }
  }
}

export default new ActivationService();

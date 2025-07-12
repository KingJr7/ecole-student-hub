// Interface pour les informations d'authentification
interface AuthStatus {
  loggedIn: boolean;
  userRole?: string;
  schoolId?: string;
}

// Classe qui gère l'authentification via IPC
class AuthService {
  // Initialisation du service
  constructor() {
    if (typeof window === 'undefined') {
      console.log('AuthService running in server mode');
    }
  }

  // Connexion à l'application avec un email et un mot de passe
  async login(email: string, password: string): Promise<{ success: boolean; message: string }> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Non disponible en mode serveur.' };
    }
    
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('auth:login-local', { email, password });
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return { success: false, message: 'Erreur de communication avec le processus principal.' };
    }
  }

  // Déconnexion de l'application
  async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('auth:logout');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  }

  // Obtenir le statut d'authentification
  async getStatus(): Promise<AuthStatus> {
    if (typeof window === 'undefined') {
      return { loggedIn: false };
    }
    
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke('auth:getStatus');
    } catch (error) {
      console.error('Erreur de récupération du statut:', error);
      return { loggedIn: false };
    }
  }
}

export const authService = new AuthService();

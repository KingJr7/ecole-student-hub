import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../lib/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const status = await authService.getStatus();
        if (status && status.loggedIn) {
          setUser({
            isLoggedIn: true,
            role: status.userRole,
            schoolId: status.schoolId,
            permissions: status.permissions, // Ajout des permissions
          });
        }
      } catch (error) {
        console.error("Failed to check auth status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    const result = await authService.login(email, password);
    if (result.success) {
      // La fonction de login dans auth.cjs ne retourne pas les permissions,
      // mais elle les stocke. On doit donc re-vérifier le statut pour les obtenir.
      const status = await authService.getStatus();
      setUser({
        isLoggedIn: true,
        role: status.userRole,
        schoolId: status.schoolId,
        permissions: status.permissions, // Ajout des permissions
      });
    }
    return result;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

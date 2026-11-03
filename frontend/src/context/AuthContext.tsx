import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, AuthUser } from '../services/api';

interface AuthContextType {
  currentUser: AuthUser | null;
  user: AuthUser | null; // convenient alias
  isLoading: boolean;
  isAuthenticated: boolean;
  isBackendConnected: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<{ user: AuthUser; isNewUser?: boolean }>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  updateProfile: (name: string) => Promise<AuthUser>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const isHealthy = await api.checkHealth();
      setIsBackendConnected(isHealthy);

      if (api.hasToken()) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
        } catch {
          // Token is invalid or expired
          api.removeToken();
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch {
      setIsBackendConnected(false);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    localStorage.removeItem('habithero_streak');
    const res = await api.login(email, password);
    setCurrentUser(res.user);
    return res.user;
  };

  const loginWithGoogle = async (idToken: string): Promise<{ user: AuthUser; isNewUser?: boolean }> => {
    localStorage.removeItem('habithero_streak');
    const res = await api.googleAuth(idToken);
    setCurrentUser(res.user);
    return { user: res.user, isNewUser: res.isNewUser };
  };

  const register = async (name: string, email: string, password: string): Promise<AuthUser> => {
    localStorage.removeItem('habithero_streak');
    const res = await api.register(name, email, password);
    setCurrentUser(res.user);
    return res.user;
  };

  const logout = () => {
    api.logout();
    localStorage.removeItem('habithero_streak');
    localStorage.removeItem('habithero_goals');
    localStorage.removeItem('habithero_tasks');
    window.dispatchEvent(new CustomEvent('habithero_streak_updated', { detail: { streak: 0 } }));
    setCurrentUser(null);
  };

  const updateProfile = async (name: string): Promise<AuthUser> => {
    const updatedUser = await api.updateProfile(name);
    setCurrentUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user: currentUser,
        isLoading,
        isAuthenticated: !!currentUser,
        isBackendConnected,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
        refreshSession,
      }}
    >
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

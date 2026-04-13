import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage';
import api from '../services/api';
import { authService, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => { },
  register: async () => { },
  logout: async () => { },
  isAuthenticated: false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const savedToken = await storage.getItem('authToken');
      if (savedToken) {
        setToken(savedToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        const userData = await authService.me();
        setUser(userData);
      }
    } catch (error) {
      await storage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await authService.login(email, password);
      await storage.setItem('authToken', data.access_token);
      setToken(data.access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

      const userData = await authService.me();
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Erro ao fazer login');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const data = await authService.register(email, password);
      await storage.setItem('authToken', data.access_token);
      setToken(data.access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

      const userData = await authService.me();
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Erro ao registrar');
    }
  };

  const logout = async () => {
    try {
      await storage.removeItem('authToken');
      setToken(null);
      setUser(null);
      delete api.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

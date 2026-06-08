import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Platform, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { storage } from '../utils/storage';
import api from '../services/api';
import { authService, User } from '../services/authService';
import { auth as firebaseAuth } from '../services/firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut 
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  
  // Biometrics
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  setupBiometrics: (password: string) => Promise<void>;
  disableBiometrics: () => Promise<void>;
  loginWithBiometrics: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // 1. Check biometrics support (independente de ter rede ou não)
      if (Platform.OS !== 'web') {
        try {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          setIsBiometricSupported(compatible && types.length > 0);
        } catch (bioErr) {
          console.log('Erro ao verificar biometria:', bioErr);
        }
      }

      // 2. Check for saved token
      const savedToken = await storage.getItem('authToken');
      if (savedToken) {
        setToken(savedToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        const userData = await authService.me();
        setUser(userData);

        // A biometria só está ativa para este usuário se o e-mail dela bater com o logado
        const enabled = await storage.getItem('biometricEnabled');
        const bioEmail = await storage.getItem('biometricEmail');
        setIsBiometricEnabled(enabled === 'true' && bioEmail === userData.email);
      } else {
        // Se deslogado, a biometria fica ativa se houver qualquer configuração ativa no aparelho
        const enabled = await storage.getItem('biometricEnabled');
        setIsBiometricEnabled(enabled === 'true');
      }
    } catch (error) {
      console.log('Auth Init Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // 1. Autentica no Firebase (Comentado temporariamente para isolar rede)
      /*
      try {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
        console.log('Firebase: Autenticado com sucesso!');
      } catch (fbErr) {
        console.log('Firebase: Erro ou usuário não existe no Firebase, tentando backend direto...');
      }
      */

      // 2. Autentica no seu backend para pegar o JWT
      const data = await authService.login(email, password);
      await storage.setItem('authToken', data.access_token);
      
      setToken(data.access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

      const userData = await authService.me();
      setUser(userData);

      // Atualiza o estado da biometria para o novo usuário logado
      const enabled = await storage.getItem('biometricEnabled');
      const bioEmail = await storage.getItem('biometricEmail');
      setIsBiometricEnabled(enabled === 'true' && bioEmail === userData.email);
    } catch (error: any) {
      console.log('REAL LOGIN ERROR:', error);
      throw new Error(error.response?.data?.detail || error.message || 'E-mail ou senha incorretos');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      // 1. Cria no Firebase (Comentado temporariamente para isolar rede)
      /*
      try {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
        console.log('Firebase: Usuário criado com sucesso!');
      } catch (fbErr) {
        console.log('Firebase: Erro ao criar usuário no Firebase (talvez já exista).');
      }
      */

      // 2. Cria no seu backend
      const data = await authService.register(email, password);
      await storage.setItem('authToken', data.access_token);
      
      setToken(data.access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

      const userData = await authService.me();
      setUser(userData);

      // Biometria não configurada para conta nova
      setIsBiometricEnabled(false);
    } catch (error: any) {
      console.log('REAL REGISTER ERROR:', error);
      throw new Error(error.response?.data?.detail || error.message || 'Erro ao registrar');
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(firebaseAuth);
    } catch (e) {}
    await storage.removeItem('authToken');
    setToken(null);
    setUser(null);

    // Quando desloga, habilitamos o botão se houver qualquer biometria salva para a tela de login
    const enabled = await storage.getItem('biometricEnabled');
    setIsBiometricEnabled(enabled === 'true');
  };

  // BIOMETRICS LOGIC
  const setupBiometrics = async (password: string) => {
    if (!user) return;
    
    try {
      // 1. Validate password first by trying to login!
      try {
        await authService.login(user.email, password);
      } catch (e) {
        throw new Error('Senha incorreta. Não é possível ativar a biometria.');
      }

      // 2. Verify if hardware is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        throw new Error('Biometria não disponível ou não configurada no aparelho.');
      }

      // 3. Prompt to confirm identity
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua biometria para ativar o acesso rápido',
        fallbackLabel: 'Usar senha',
      });

      if (result.success) {
        // Store password securely using dedicated biometric keys
        await storage.setItem('biometricPassword', password);
        await storage.setItem('biometricEmail', user.email);
        await storage.setItem('biometricEnabled', 'true');
        setIsBiometricEnabled(true);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Falha ao configurar biometria');
    }
  };

  const disableBiometrics = async () => {
    await storage.removeItem('biometricPassword');
    await storage.removeItem('biometricEmail');
    await storage.removeItem('biometricEnabled');
    setIsBiometricEnabled(false);
  };

  const loginWithBiometrics = async () => {
    try {
      const email = await storage.getItem('biometricEmail');
      const password = await storage.getItem('biometricPassword');
      const enabled = await storage.getItem('biometricEnabled');

      if (!email || !password || enabled !== 'true') {
        throw new Error('Biometria não configurada para este usuário.');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login rápido',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await login(email, password);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Falha na autenticação biométrica');
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
        isAuthenticated: !!user,
        isBiometricSupported,
        isBiometricEnabled,
        setupBiometrics,
        disableBiometrics,
        loginWithBiometrics,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

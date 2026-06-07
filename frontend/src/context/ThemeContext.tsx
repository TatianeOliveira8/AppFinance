import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { storage } from '../utils/storage';

// ========== CORES DE DESTAQUE DISPONÍVEIS ==========
export const ACCENT_COLORS = [
  { key: 'orange', color: '#FF8C00', label: 'Laranja' },
  { key: 'blue', color: '#2979FF', label: 'Azul' },
  { key: 'green', color: '#00C853', label: 'Verde' },
  { key: 'purple', color: '#AA00FF', label: 'Roxo' },
  { key: 'pink', color: '#FF4081', label: 'Rosa' },
  { key: 'teal', color: '#00BFA5', label: 'Turquesa' },
  { key: 'red', color: '#FF1744', label: 'Vermelho' },
  { key: 'indigo', color: '#536DFE', label: 'Índigo' },
];

// ========== DEFINIÇÕES DOS TEMAS ==========
export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  // Borders
  border: string;
  borderLight: string;
  // Input
  inputBg: string;
  inputText: string;
  placeholder: string;
  // Specific
  accent: string;
  accentLight: string;
  accentShadow: string;
  danger: string;
  success: string;
  // Status bar
  statusBar: 'dark-content' | 'light-content';
  // Navigation
  tabBarBg: string;
  tabBarInactive: string;
  headerBg: string;
  // Toggle
  switchTrack: string;
}

const createLightTheme = (accent: string): ThemeColors => ({
  background: '#F8F9FD',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#F0F0F0',
  borderLight: '#E0E0E0',
  inputBg: '#F8F9FA',
  inputText: '#333333',
  placeholder: '#999999',
  accent: accent,
  accentLight: accent + '15',
  accentShadow: accent,
  danger: '#F44336',
  success: '#4CAF50',
  statusBar: 'dark-content',
  tabBarBg: '#FFFFFF',
  tabBarInactive: '#AAAAAA',
  headerBg: '#FFFFFF',
  switchTrack: '#CCCCCC',
});

const createDarkTheme = (accent: string): ThemeColors => ({
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2A2A2A',
  card: '#1E1E1E',
  text: '#F0F0F0',
  textSecondary: '#B0B0B0',
  textMuted: '#777777',
  border: '#333333',
  borderLight: '#444444',
  inputBg: '#2A2A2A',
  inputText: '#E0E0E0',
  placeholder: '#666666',
  accent: accent,
  accentLight: accent + '25',
  accentShadow: accent,
  danger: '#FF5252',
  success: '#69F0AE',
  statusBar: 'light-content',
  tabBarBg: '#1E1E1E',
  tabBarInactive: '#666666',
  headerBg: '#1E1E1E',
  switchTrack: '#555555',
});

// ========== CONTEXT ==========
interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  accentColor: string;
  toggleTheme: () => void;
  setAccentColor: (color: string) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: createLightTheme('#FF8C00'),
  accentColor: '#FF8C00',
  toggleTheme: () => {},
  setAccentColor: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [accentColor, setAccentColorState] = useState('#FF8C00');

  // Carregar preferências salvas
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const savedTheme = await storage.getItem('theme_mode');
        const savedAccent = await storage.getItem('accent_color');
        if (savedTheme === 'dark') setIsDark(true);
        if (savedAccent) setAccentColorState(savedAccent);
      } catch (e) {
        console.error('Erro ao carregar preferências de tema:', e);
      }
    };
    loadPrefs();
  }, []);

  const toggleTheme = useCallback(async () => {
    const newVal = !isDark;
    setIsDark(newVal);
    await storage.setItem('theme_mode', newVal ? 'dark' : 'light');
  }, [isDark]);

  const setAccentColor = useCallback(async (color: string) => {
    setAccentColorState(color);
    await storage.setItem('accent_color', color);
  }, []);

  const colors = isDark ? createDarkTheme(accentColor) : createLightTheme(accentColor);

  return (
    <ThemeContext.Provider value={{ isDark, colors, accentColor, toggleTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
};

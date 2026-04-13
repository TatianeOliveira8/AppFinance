import { Platform } from 'react-native';

// Se estiver no navegador (web), usamos localhost. 
// Se estiver no celular, usamos o IP da rede.
const API_URL = Platform.OS === 'web'
  ? 'http://localhost:8000/api'
  : 'http://192.168.3.22:8000/api';

export const CONFIG = {
  API_BASE_URL: API_URL,
  TIMEOUT: 10000,
};

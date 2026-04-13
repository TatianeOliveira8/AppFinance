import axios from 'axios';
import { storage } from '../utils/storage';
import { CONFIG } from '../config';

const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Sessão expirada. Redirecionando para login...');
    }
    return Promise.reject(error);
  }
);

export default api;

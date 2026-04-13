import api from './api';

export interface User {
    id: number;
    email: string;
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user_id: number;
    email: string;
}

export const authService = {
    async login(email: string, password: string): Promise<AuthResponse> {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    async register(email: string, password: string): Promise<AuthResponse> {
        const response = await api.post('/auth/register', { email, password });
        return response.data;
    },

    async me(): Promise<User> {
        const response = await api.get('/auth/me');
        return response.data;
    },
};

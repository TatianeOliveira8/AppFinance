import api from './api';

export interface Investment {
    id: number;
    user_id: number;
    name: string;
    type: string;
    invested_value: number;
    current_value: number;
    annual_rate?: number;
    start_date: string;
    maturity_date?: string;
    institution?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export const investmentsService = {
    async getInvestments(): Promise<Investment[]> {
        const response = await api.get('/api/investments/');
        return response.data;
    },

    async createInvestment(data: Partial<Investment> & { account_id?: number }): Promise<Investment> {
        const response = await api.post('/api/investments/', data);
        return response.data;
    },

    async updateInvestment(id: number, data: Partial<Investment>): Promise<Investment> {
        const response = await api.put(`/api/investments/${id}`, data);
        return response.data;
    },

    async deleteInvestment(id: number): Promise<void> {
        await api.delete(`/api/investments/${id}`);
    }
};

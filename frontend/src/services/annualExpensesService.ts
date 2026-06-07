import api from './api';

export interface AnnualExpense {
    id: number;
    user_id: number;
    name: string;
    estimated_value: number;
    due_date: string;
    is_paid: boolean;
    notes?: string;
    alert_days_before: number;
    created_at: string;
}

export const annualExpensesService = {
    async getAnnualExpenses(): Promise<AnnualExpense[]> {
        const response = await api.get('/api/annual-expenses/');
        return response.data;
    },

    async createAnnualExpense(data: Partial<AnnualExpense>): Promise<AnnualExpense> {
        const response = await api.post('/api/annual-expenses/', data);
        return response.data;
    },

    async updateAnnualExpense(id: number, data: Partial<AnnualExpense>): Promise<AnnualExpense> {
        const response = await api.put(`/api/annual-expenses/${id}`, data);
        return response.data;
    },

    async deleteAnnualExpense(id: number): Promise<void> {
        await api.delete(`/api/annual-expenses/${id}`);
    }
};

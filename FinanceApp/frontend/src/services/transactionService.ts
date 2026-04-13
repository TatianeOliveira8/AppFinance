import api from './api';

export interface TransactionSummary {
    balance: number;
    total_income: number;
    total_expense: number;
    pending_income: number;
    pending_expense: number;
    by_category: { id: number; name: string; value: number; percentage: number; icon?: string; color?: string; }[];
    by_category_income: { id: number; name: string; value: number; percentage: number; icon?: string; color?: string; }[];
}

export interface Transaction {
    id: number;
    type: 'income' | 'expense';
    value: number;
    description: string;
    date: string;
    category_id: number;
    category?: Category;
    is_paid: boolean;
    is_fixed: boolean;
}

export interface Category {
    id: number;
    name: string;
    icon?: string;
    color?: string; // Cor personalizada
    type?: 'income' | 'expense';
}

export const transactionService = {
    async getSummary(month?: number, year?: number): Promise<TransactionSummary> {
        const params = new URLSearchParams();
        if (month) params.append('month', month.toString());
        if (year) params.append('year', year.toString());
        const response = await api.get(`/transactions/summary?${params.toString()}`);
        return response.data;
    },

    async listTransactions(
        filter?: 'income' | 'expense' | 'all',
        days?: number,
        startDate?: string,
        endDate?: string
    ): Promise<Transaction[]> {
        const params = new URLSearchParams();
        if (filter && filter !== 'all') params.append('type', filter);
        if (days) params.append('days', days.toString());
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const url = `/transactions/?${params.toString()}`;
        console.log(`[API] Chamando: ${url}`);
        const response = await api.get(url);
        return response.data;
    },

    async createTransaction(data: {
        type: string;
        value: number;
        description: string;
        category_id: number | null;
        date: string | null;
        is_paid: boolean;
        is_fixed: boolean;
        day_of_month?: number | null;
    }): Promise<Transaction> {
        const response = await api.post('/transactions/', data);
        return response.data;
    },

    async getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
        let url = '/transactions/categories';
        if (type) {
            url += `?type=${type}`;
        }
        const response = await api.get(url);
        return response.data;
    },

    async getTransactionsByCategory(categoryId: number): Promise<Transaction[]> {
        const response = await api.get(`/transactions/by-category/${categoryId}`);
        return response.data;
    },

    async deleteTransaction(transactionId: number): Promise<{message: string}> {
        const response = await api.delete(`/transactions/${transactionId}`);
        return response.data;
    },

    async createCategory(name: string, type: 'income' | 'expense', icon?: string, color?: string): Promise<Category> {
        const response = await api.post('/transactions/categories', { name, type, icon, color });
        return response.data;
    },
};

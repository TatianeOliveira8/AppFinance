import api from './api';
import { offlineService } from './offlineService';

export interface Category {
    id: number;
    name: string;
    icon?: string;
    color?: string;
    type?: 'income' | 'expense';
    is_default: boolean;
    budget_limit?: number;
}

export interface CreditCard {
    id: number;
    name: string;
    limit: number;
    closing_day: number;
    due_day: number;
    user_id: number;
    available_limit: number;
}

export interface Account {
    id: number;
    name: string;
    type: string;
    initial_balance: number;
    current_balance?: number;
    user_id: number;
}

export interface Transaction {
    id: number;
    user_id: number;
    category_id?: number;
    credit_card_id?: number;
    account_id?: number;
    type: 'income' | 'expense';
    value: number;
    description?: string;
    date: string;
    is_paid: boolean;
    is_fixed: boolean;
    day_of_month?: number;
    payment_method?: 'dinheiro' | 'credito' | 'debito';
    receipt_photo?: string;
    installments_total: number;
    installment_number: number;
    installment_group?: string;
    category?: Category;
    credit_card?: CreditCard;
    account?: Account;
    contact_name?: string;
}

export interface TransactionSummary {
    total_balance: number;
    total_income: number;
    total_expense: number;
    pending_income: number;
    pending_expense: number;
    income_pending_list: any[];
    expense_pending_list: any[];
    by_category: { id: number; name: string; value: number; percentage: number; icon?: string; color?: string; isDefault?: boolean; budget_limit?: number; }[];
    by_category_income: { id: number; name: string; value: number; percentage: number; icon?: string; color?: string; isDefault?: boolean; budget_limit?: number; }[];
    balance_evolution: { month: string; balance: number; }[];
    accounts_summary: Account[];
}

// RF18 — Alerta de gasto anormal por categoria
export interface AnomalyAlert {
    category_id: number;
    category_name: string;
    category_icon?: string;
    category_color?: string;
    current_month_total: number;
    avg_last_3_months: number;
    increase_pct: number;
    severity: 'warning' | 'critical';
    message: string;
}

export const transactionService = {
    async getSummary(month?: number, year?: number): Promise<TransactionSummary> {
        try {
            const params = { month, year };
            const response = await api.get('/api/transactions/summary', { params });
            const data = response.data;
            await offlineService.saveSummary(data);
            return data;
        } catch (error) {
            const cached = await offlineService.getSummary();
            if (cached) return cached;
            throw error;
        }
    },

    async getTransactions(params?: any): Promise<Transaction[]> {
        try {
            const response = await api.get('/api/transactions/', { params });
            const data = response.data;
            if (!params) {
                await offlineService.saveTransactions(data);
            }
            return data;
        } catch (error: any) {
            if (!error.response) {
                let cached = await offlineService.getTransactions() || [];
                const queue = await offlineService.getQueue();
                const offlineTransactions = queue.map((t: any) => ({
                    ...t,
                    id: t.offline_id,
                    is_offline: true
                }));
                return [...offlineTransactions, ...cached];
            }
            throw error;
        }
    },

    async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
        try {
            const response = await api.post('/api/transactions/', data);
            return response.data;
        } catch (error: any) {
            // Se for erro de rede (sem resposta ou timeout), enfileira e finge que deu sucesso
            if (!error.response) {
                await offlineService.queueTransaction(data);
                return data as Transaction;
            }
            throw error;
        }
    },

    async deleteTransaction(id: number): Promise<void> {
        await api.delete(`/api/transactions/${id}`);
    },

    async getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
        const url = type ? `/api/categories?type=${type}` : '/api/categories';
        try {
            const response = await api.get(url);
            const data = response.data;
            await offlineService.saveCategories(data, type);
            return data;
        } catch (error) {
            const cached = await offlineService.getCategories(type);
            if (cached) return cached;
            throw error;
        }
    },

    async createCategory(name: string, type: 'income' | 'expense', icon?: string, color?: string, budgetLimit?: number): Promise<Category> {
        const response = await api.post('/api/categories', { name, type, icon, color, budget_limit: budgetLimit });
        return response.data;
    },

    async updateCategory(id: number, data: Partial<Category>): Promise<Category> {
        const response = await api.put(`/api/categories/${id}`, data);
        return response.data;
    },

    async deleteCategory(id: number): Promise<void> {
        await api.delete(`/api/categories/${id}`);
    },

    async getTransactionsByCategory(categoryId: number): Promise<Transaction[]> {
        try {
            const response = await api.get('/api/transactions/', { params: { category_id: categoryId } });
            const data = response.data;
            await offlineService.saveCategoryTransactions(categoryId, data);
            return data;
        } catch (error: any) {
            if (!error.response) {
                let cached = await offlineService.getCategoryTransactions(categoryId) || [];
                const queue = await offlineService.getQueue();
                const offlineTransactions = queue
                    .filter((t: any) => t.category_id === categoryId)
                    .map((t: any) => ({
                        ...t,
                        id: t.offline_id,
                        is_offline: true
                    }));
                return [...offlineTransactions, ...cached];
            }
            throw error;
        }
    },

    async clearCategoryTransactions(categoryId: number): Promise<void> {
        await api.delete(`/api/categories/${categoryId}/clear`);
    },

    // CREDIT CARDS (US-11)
    async getCreditCards(): Promise<CreditCard[]> {
        try {
            const response = await api.get('/api/credit-cards/');
            const data = response.data;
            await offlineService.saveCreditCards(data);
            return data;
        } catch (error) {
            const cached = await offlineService.getCreditCards();
            if (cached) return cached;
            throw error;
        }
    },

    async createCreditCard(data: { name: string, limit: number, closing_day: number, due_day: number }): Promise<CreditCard> {
        const response = await api.post('/api/credit-cards/', data);
        return response.data;
    },

    async deleteCreditCard(id: number): Promise<void> {
        await api.delete(`/api/credit-cards/${id}`);
    },

    async updateCreditCard(id: number, data: { name: string, limit: number, closing_day: number, due_day: number }): Promise<CreditCard> {
        const response = await api.put(`/api/credit-cards/${id}`, data);
        return response.data;
    },

    // ACCOUNTS (US-12)
    async getAccounts(): Promise<Account[]> {
        try {
            const response = await api.get('/api/accounts/');
            const data = response.data;
            await offlineService.saveAccounts(data);
            return data;
        } catch (error) {
            const cached = await offlineService.getAccounts();
            if (cached) return cached;
            throw error;
        }
    },

    async createAccount(data: { name: string, type: string, initial_balance: number }): Promise<Account> {
        const response = await api.post('/api/accounts/', data);
        return response.data;
    },

    async deleteAccount(id: number): Promise<void> {
        await api.delete(`/api/accounts/${id}`);
    },

    async updateAccount(id: number, data: { name: string, type: string, initial_balance: number }): Promise<Account> {
        const response = await api.put(`/api/accounts/${id}`, data);
        return response.data;
    },

    async transferBetweenAccounts(data: {
        from_account_id: number,
        to_account_id: number,
        value: number,
        description?: string
    }): Promise<{ success: boolean; message: string; transfer_amount: number; from_account: Account; to_account: Account; }> {
        const response = await api.post('/api/accounts/transfer', data);
        return response.data;
    },

    // SPRINT 3 METHODS
    async getNetWorth(): Promise<{
        total_assets: number;
        total_liabilities: number;
        net_worth: number;
        investments_total: number;
        accounts_total: number;
        credit_cards_debt: number;
    }> {
        const response = await api.get('/api/transactions/net-worth');
        return response.data;
    },

    async getBalanceProjection(): Promise<{
        current_balance: number;
        projection: {
            month: string;
            projected_income: number;
            projected_expense: number;
            projected_balance: number;
        }[];
    }> {
        const response = await api.get('/api/transactions/projection');
        return response.data;
    },

    async importTransactions(fileData: { uri: string; name: string; type: string }): Promise<{
        transactions: {
            date: string;
            value: number;
            type: 'income' | 'expense';
            description: string;
            already_exists: boolean;
            existing_id?: number;
            suggested_category_id?: number;
            suggested_category_name?: string;
        }[];
    }> {
        const formData = new FormData();
        // Em React Native / Expo, passamos o objeto com uri, name e type para o FormData
        formData.append('file', {
            uri: fileData.uri,
            name: fileData.name,
            type: fileData.type
        } as any);

        const response = await api.post('/api/transactions/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async exportCSV(): Promise<Blob> {
        const response = await api.get('/api/transactions/export/csv', { responseType: 'blob' });
        return response.data;
    },

    async exportPDF(): Promise<Blob> {
        const response = await api.get('/api/transactions/export/pdf', { responseType: 'blob' });
        return response.data;
    },

    async exportAnnualCSV(): Promise<Blob> {
        const response = await api.get('/api/transactions/export/annual-csv', { responseType: 'blob' });
        return response.data;
    },

    async exportAnnualPDF(): Promise<Blob> {
        const response = await api.get('/api/transactions/export/annual-pdf', { responseType: 'blob' });
        return response.data;
    },

    async uploadReceipt(uri: string): Promise<{ filename: string, url: string }> {
        const formData = new FormData();
        const filename = uri.split('/').pop() || 'receipt.jpg';

        let type = 'image/jpeg';
        if (filename.endsWith('.png')) type = 'image/png';
        else if (filename.endsWith('.pdf')) type = 'application/pdf';
        else if (filename.endsWith('.webp')) type = 'image/webp';

        formData.append('file', {
            uri: uri,
            name: filename,
            type: type,
        } as any);

        const response = await api.post('/api/transactions/upload-receipt', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // RF18 — Alertas de gastos anormais
    async getSpendingAlerts(month?: number, year?: number): Promise<{
        alerts: AnomalyAlert[];
        analyzed_month: string;
        threshold_warning: number;
        threshold_critical: number;
    }> {
        try {
            const response = await api.get('/api/transactions/spending-alerts', {
                params: { month, year }
            });
            return response.data;
        } catch (error) {
            // Falha silenciosa — não bloqueia o dashboard
            return { alerts: [], analyzed_month: '', threshold_warning: 30, threshold_critical: 80 };
        }
    },

    // RF28 — Fluxo de caixa diário
    async getDailyFlow(month?: number, year?: number): Promise<{
        month: number;
        year: number;
        daily_flow: { day: number; label: string; income: number; expense: number; balance: number; }[];
    }> {
        try {
            const response = await api.get('/api/transactions/daily-flow', {
                params: { month, year }
            });
            return response.data;
        } catch (error) {
            return { month: month || 0, year: year || 0, daily_flow: [] };
        }
    },
};



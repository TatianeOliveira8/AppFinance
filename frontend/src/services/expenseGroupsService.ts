import api from './api';

export interface GroupMember {
    id: number;
    group_id: number;
    name: string;
    email?: string;
}

export interface GroupExpense {
    id: number;
    group_id: number;
    description: string;
    value: number;
    paid_by_id: number;
    date: string;
    is_settled: boolean;
    paid_by?: GroupMember;
}

export interface ExpenseGroup {
    id: number;
    name: string;
    description?: string;
    created_by: number;
    created_at: string;
    members: GroupMember[];
    expenses: GroupExpense[];
}

export interface Settlement {
    from_id: number;
    from_name: string;
    to_id: number;
    to_name: string;
    value: number;
}

export interface SettleCalculation {
    total_expenses: number;
    share_per_member: number;
    balances: { id: number; name: string; paid: number; net: number }[];
    settlements: Settlement[];
}

export const expenseGroupsService = {
    async getGroups(): Promise<ExpenseGroup[]> {
        const response = await api.get('/api/expense-groups/');
        return response.data;
    },

    async getGroup(id: number): Promise<ExpenseGroup> {
        const response = await api.get(`/api/expense-groups/${id}`);
        return response.data;
    },

    async createGroup(name: string, description?: string, members: { name: string; email?: string }[] = []): Promise<ExpenseGroup> {
        const response = await api.post('/api/expense-groups/', { name, description, members });
        return response.data;
    },

    async addMember(groupId: number, name: string, email?: string): Promise<GroupMember> {
        const response = await api.post(`/api/expense-groups/${groupId}/members`, { name, email });
        return response.data;
    },

    async addExpense(groupId: number, description: string, value: number, paidById: number): Promise<GroupExpense> {
        const response = await api.post(`/api/expense-groups/${groupId}/expenses`, { description, value, paid_by_id: paidById });
        return response.data;
    },

    async calculateSettlement(groupId: number): Promise<SettleCalculation> {
        const response = await api.get(`/api/expense-groups/${groupId}/settle`);
        return response.data;
    },

    async settleGroup(groupId: number): Promise<void> {
        await api.post(`/api/expense-groups/${groupId}/settle`);
    },

    async updateGroup(groupId: number, name: string, description?: string): Promise<ExpenseGroup> {
        const response = await api.put(`/api/expense-groups/${groupId}`, { name, description });
        return response.data;
    },

    async deleteGroup(groupId: number): Promise<void> {
        await api.delete(`/api/expense-groups/${groupId}`);
    }
};

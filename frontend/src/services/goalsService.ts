import api from './api';

export interface SavingsGoal {
  id: number;
  user_id: number;
  name: string;
  target_value: number;
  current_progress: number;
  deadline: string; // ISO datetime string
  description?: string;
  created_at: string;
  updated_at: string;
}

export const goalsService = {
  async getGoals(): Promise<SavingsGoal[]> {
    try {
      const response = await api.get('/api/goals/');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      throw error;
    }
  },

  async getGoal(id: number): Promise<SavingsGoal> {
    try {
      const response = await api.get(`/api/goals/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar meta ${id}:`, error);
      throw error;
    }
  },

  async createGoal(data: {
    name: string;
    target_value: number;
    deadline: string;
    description?: string;
    current_progress?: number;
  }): Promise<SavingsGoal> {
    try {
      const response = await api.post('/api/goals/', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      throw error;
    }
  },

  async updateGoal(id: number, data: Partial<SavingsGoal>): Promise<SavingsGoal> {
    try {
      const response = await api.put(`/api/goals/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar meta ${id}:`, error);
      throw error;
    }
  },

  async updateGoalProgress(id: number, amount: number): Promise<SavingsGoal> {
    try {
      const response = await api.patch(`/api/goals/${id}/progress?amount=${amount}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar progresso da meta ${id}:`, error);
      throw error;
    }
  },

  async deleteGoal(id: number): Promise<void> {
    try {
      await api.delete(`/api/goals/${id}`);
    } catch (error) {
      console.error(`Erro ao deletar meta ${id}:`, error);
      throw error;
    }
  },

  // Helpers
  getMonthsRemaining(deadline: string): number {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const months = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return Math.max(1, months);
  },

  getMonthlyTarget(targetValue: number, deadline: string): number {
    const monthsRemaining = this.getMonthsRemaining(deadline);
    return targetValue / monthsRemaining;
  },

  getProgressPercentage(current: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(100, (current / target) * 100);
  },

  isDeadlineExceeded(deadline: string): boolean {
    return new Date(deadline) < new Date();
  },
};

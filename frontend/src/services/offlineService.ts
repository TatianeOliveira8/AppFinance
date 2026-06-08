import { storage } from '../utils/storage';
import { Transaction, TransactionSummary } from './transactionService';

const SUMMARY_CACHE_KEY = 'cache_summary';
const QUEUE_KEY = 'sync_queue';

export const offlineService = {
  // Caching Summary
  async saveSummary(data: TransactionSummary): Promise<void> {
    await storage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(data));
  },

  async getSummary(): Promise<TransactionSummary | null> {
    const data = await storage.getItem(SUMMARY_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  },

  // Caching Transactions
  async saveTransactions(data: Transaction[]): Promise<void> {
    await storage.setItem('cache_transactions', JSON.stringify(data));
  },

  async getTransactions(): Promise<Transaction[] | null> {
    const data = await storage.getItem('cache_transactions');
    return data ? JSON.parse(data) : null;
  },

  async saveCategoryTransactions(categoryId: number, data: Transaction[]): Promise<void> {
    await storage.setItem(`cache_cat_trans_${categoryId}`, JSON.stringify(data));
  },

  async getCategoryTransactions(categoryId: number): Promise<Transaction[] | null> {
    const data = await storage.getItem(`cache_cat_trans_${categoryId}`);
    return data ? JSON.parse(data) : null;
  },

  // Caching Metadata
  async saveCategories(data: any[], type?: string): Promise<void> {
    const key = `cache_categories_${type || 'all'}`;
    await storage.setItem(key, JSON.stringify(data));
  },

  async getCategories(type?: string): Promise<any[] | null> {
    const key = `cache_categories_${type || 'all'}`;
    const data = await storage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  async saveCreditCards(data: any[]): Promise<void> {
    await storage.setItem('cache_cards', JSON.stringify(data));
  },

  async getCreditCards(): Promise<any[] | null> {
    const data = await storage.getItem('cache_cards');
    return data ? JSON.parse(data) : null;
  },

  async saveAccounts(data: any[]): Promise<void> {
    await storage.setItem('cache_accounts', JSON.stringify(data));
  },

  async getAccounts(): Promise<any[] | null> {
    const data = await storage.getItem('cache_accounts');
    return data ? JSON.parse(data) : null;
  },

  // Sync Queue
  async queueTransaction(data: Partial<Transaction>): Promise<void> {
    const queue = await this.getQueue();
    queue.push({ ...data, offline_id: Date.now() });
    await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  async getQueue(): Promise<any[]> {
    const data = await storage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  async clearAllCaches(): Promise<void> {
    await storage.removeItem(SUMMARY_CACHE_KEY);
    await storage.removeItem('cache_transactions');
    await storage.removeItem('cache_categories_all');
    await storage.removeItem('cache_categories_income');
    await storage.removeItem('cache_categories_expense');
    await storage.removeItem('cache_cards');
    await storage.removeItem('cache_accounts');
  },

  async removeItemFromQueue(offlineId: number): Promise<void> {
    const queue = await this.getQueue();
    const newQueue = queue.filter((item: any) => item.offline_id !== offlineId);
    await storage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
  },

  async clearQueue(): Promise<void> {
    await storage.removeItem(QUEUE_KEY);
  }
};

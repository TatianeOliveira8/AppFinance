import api from './api';

export interface Tag {
    id: number;
    name: string;
    user_id: number;
    color?: string;
}

export const tagsService = {
    async getTags(): Promise<Tag[]> {
        const response = await api.get('/api/tags/');
        return response.data;
    },

    async createTag(name: string, color?: string): Promise<Tag> {
        const response = await api.post('/api/tags/', { name, color });
        return response.data;
    },

    async updateTag(id: number, name?: string, color?: string): Promise<Tag> {
        const response = await api.put(`/api/tags/${id}`, { name, color });
        return response.data;
    },
    
    async deleteTag(id: number): Promise<void> {
        await api.delete(`/api/tags/${id}`);
    }
};

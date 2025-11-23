import api from './api.js';

export const customerService = {
  async getAll(page = 1, limit = 100, search = '') {
    try {
      let endpoint = `/customers?page=${page}&limit=${limit}`;
      if (search) {
        endpoint += `&search=${encodeURIComponent(search)}`;
      }
      const response = await api.get(endpoint);
      return {
        data: response.data || [],
        meta: response.meta || { page, limit, total: 0, totalPages: 0 }
      };
    } catch (error) {
      console.error('Error fetching customers:', error);
      return null;
    }
  },

  async getById(id) {
    try {
      const response = await api.get(`/customers/${id}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching customer:', error);
      return null;
    }
  },

  async create(data) {
    const response = await api.post('/customers', data);
    return response.data || response;
  },

  async update(id, data) {
    const response = await api.put(`/customers/${id}`, data);
    return response.data || response;
  },

  async delete(id) {
    await api.delete(`/customers/${id}`);
    return true;
  }
};

export default customerService;

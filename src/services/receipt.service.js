import api from './api.js';

export const receiptService = {
  async getAll(page = 1, limit = 100, customerId = '') {
    try {
      let endpoint = `/receipts?page=${page}&limit=${limit}`;
      if (customerId) {
        endpoint += `&customer_id=${encodeURIComponent(customerId)}`;
      }
      const response = await api.get(endpoint);
      return {
        data: response.data || [],
        meta: response.meta || { page, limit, total: 0, totalPages: 0 }
      };
    } catch (error) {
      console.error('Error fetching receipts:', error);
      return null;
    }
  },

  async getById(id) {
    try {
      const response = await api.get(`/receipts/${id}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching receipt:', error);
      return null;
    }
  },

  async create(data) {
    const response = await api.post('/receipts', data);
    return response.data || response;
  },

  async update(id, data) {
    const response = await api.put(`/receipts/${id}`, data);
    return response.data || response;
  },

  async delete(id) {
    await api.delete(`/receipts/${id}`);
    return true;
  },

  async generate(id) {
    const response = await api.post(`/receipts/${id}/generate`);
    return response.data || response;
  },

  async download(id) {
    const token = api.getAuthToken();
    const url = `${api.baseUrl}/receipts/${id}/download`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download receipt');
    }

    return response.blob();
  }
};

export default receiptService;

import api from './api.js';

export const waybillService = {
  async getAll(page = 1, limit = 100, status = '', customerId = '') {
    try {
      let endpoint = `/waybills?page=${page}&limit=${limit}`;
      if (status) {
        endpoint += `&status=${encodeURIComponent(status)}`;
      }
      if (customerId) {
        endpoint += `&customer_id=${encodeURIComponent(customerId)}`;
      }
      const response = await api.get(endpoint);
      return {
        data: response.data || [],
        meta: response.meta || { page, limit, total: 0, totalPages: 0 }
      };
    } catch (error) {
      console.error('Error fetching waybills:', error);
      return null;
    }
  },

  async getById(id) {
    try {
      const response = await api.get(`/waybills/${id}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching waybill:', error);
      return null;
    }
  },

  async create(data) {
    // Transform items to match API format
    const apiData = {
      ...data,
      items: data.items ? data.items.map(item => ({
        name: item.item_name || item.name,
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        notes: item.notes || ''
      })) : []
    };
    const response = await api.post('/waybills', apiData);
    return response.data || response;
  },

  async update(id, data) {
    const response = await api.put(`/waybills/${id}`, data);
    return response.data || response;
  },

  async delete(id) {
    await api.delete(`/waybills/${id}`);
    return true;
  },

  async generate(id) {
    const response = await api.post(`/waybills/${id}/generate`);
    return response.data || response;
  },

  async download(id) {
    const token = api.getAuthToken();
    const url = `${api.baseUrl}/waybills/${id}/download`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download waybill');
    }

    return response.blob();
  }
};

export default waybillService;

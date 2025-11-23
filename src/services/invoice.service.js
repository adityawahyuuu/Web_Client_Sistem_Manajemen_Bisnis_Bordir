import api from './api.js';

export const invoiceService = {
  async getAll(page = 1, limit = 100, status = '', customerId = '') {
    try {
      let endpoint = `/invoices?page=${page}&limit=${limit}`;
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
      console.error('Error fetching invoices:', error);
      return null;
    }
  },

  async getById(id) {
    try {
      const response = await api.get(`/invoices/${id}`);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  },

  async create(data) {
    // Transform items to match API format
    const apiData = {
      ...data,
      items: data.items.map(item => ({
        name: item.item_name || item.name,
        description: item.description || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit || 'pcs'
      }))
    };
    const response = await api.post('/invoices', apiData);
    return response.data || response;
  },

  async update(id, data) {
    const response = await api.put(`/invoices/${id}`, data);
    return response.data || response;
  },

  async delete(id) {
    await api.delete(`/invoices/${id}`);
    return true;
  },

  async generate(id) {
    const response = await api.post(`/invoices/${id}/generate`);
    return response.data || response;
  },

  async download(id) {
    const token = api.getAuthToken();
    const url = `${api.baseUrl}/invoices/${id}/download`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }

    return response.blob();
  }
};

export default invoiceService;

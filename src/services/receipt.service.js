import api from './api.js';
import { get } from 'svelte/store';
import { selectedCompany } from '../stores/company.js';
import { error as errorNotify } from '../stores/notifications.js';

export const receiptService = {
  async getAll(page = 1, limit = 100, customerId = '') {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      let endpoint = `/receipts/${company.id}?page=${page}&limit=${limit}`;

      if (customerId) {
        endpoint += `&customer_id=${encodeURIComponent(customerId)}`;
      }

      const response = await api.get(endpoint);

      return {
        data: response.data || [],
        meta: response.meta || { page, limit, total: 0, totalPages: 0 }
      };
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat data kwitansi');
      return null;
    }
  },

  async getById(id) {
    try {
      const response = await api.get(`/receipts/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat detail kwitansi');
      return null;
    }
  },

  async create(data) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const apiData = {
        ...data,
        company_id: company.id
      };
      const response = await api.post(`/receipts/${company.id}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal membuat kwitansi');
      throw err;
    }
  },

  async update(id, data) {
    try {
      const response = await api.put(`/receipts/${id}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memperbarui kwitansi');
      throw err;
    }
  },

  async delete(id) {
    try {
      await api.delete(`/receipts/${id}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus kwitansi');
      throw err;
    }
  },

  async generate(id) {
    try {
      const response = await api.post(`/receipts/${id}/generate`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal generate kwitansi');
      throw err;
    }
  },

  async download(id) {
    try {
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
    } catch (err) {
      errorNotify(err.message || 'Gagal download kwitansi');
      throw err;
    }
  }
};

export default receiptService;

import api from './api.js';
import { get } from 'svelte/store';
import { selectedCompany } from '../stores/company.js';
import { error as errorNotify } from '../stores/notifications.js';

export const waybillService = {
  async getAll(page = 1, limit = 100, status = '', customerId = '') {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      let endpoint = `/waybills/${company.id}?page=${page}&limit=${limit}`;

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
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat data surat jalan');
      return null;
    }
  },

  async getById(id) {
    try {
      const response = await api.get(`/waybills/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat detail surat jalan');
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

      // Transform items to match API format
      const apiData = {
        ...data,
        company_id: company.id,
        items: data.items ? data.items.map(item => ({
          name: item.item_name || item.name,
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          notes: item.notes || ''
        })) : []
      };
      const response = await api.post(`/waybills/${company.id}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal membuat surat jalan');
      throw err;
    }
  },

  async update(id, data) {
    try {
      const response = await api.put(`/waybills/${id}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memperbarui surat jalan');
      throw err;
    }
  },

  async delete(id) {
    try {
      await api.delete(`/waybills/${id}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus surat jalan');
      throw err;
    }
  },

  async generate(id) {
    try {
      const response = await api.post(`/waybills/${id}/generate`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal generate surat jalan');
      throw err;
    }
  },

  async download(id) {
    try {
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
    } catch (err) {
      errorNotify(err.message || 'Gagal download surat jalan');
      throw err;
    }
  }
};

export default waybillService;

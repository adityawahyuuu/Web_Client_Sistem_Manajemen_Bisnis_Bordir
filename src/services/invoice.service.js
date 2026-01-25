import api from './api.js';
import { get } from 'svelte/store';
import { selectedCompany } from '../stores/company.js';
import { error as errorNotify } from '../stores/notifications.js';

export const invoiceService = {
  async getAll(page = 1, limit = 100, status = '', customerId = '') {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      let endpoint = `/invoices/${company.id}?page=${page}&limit=${limit}`;
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
      errorNotify(err.message || 'Gagal memuat data invoice');
      return null;
    }
  },

  async getById(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.get(`/invoices/${company.id}/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat detail invoice');
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
        items: data.items.map(item => ({
          item_id: item.item_id,
          name: item.item_name || item.name,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: item.unit || 'pcs'
        }))
      };
      const response = await api.post(`/invoices/${company.id}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal membuat invoice');
      throw err;
    }
  },

  async update(id, data) {
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
        items: data.items.map(item => ({
          item_id: item.item_id || null,
          name: item.item_name || item.name,
          description: item.description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit: item.unit || 'pcs'
        }))
      };

      const response = await api.put(`/invoices/${company.id}/${id}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memperbarui invoice');
      throw err;
    }
  },

  async delete(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      await api.delete(`/invoices/${company.id}/${id}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus invoice');
      throw err;
    }
  },

  async generate(id, templateId = null) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) return null;

      let endpoint = `/invoices/${company.id}/${id}/generate`;
      if (templateId) {
        endpoint += `?templateId=${templateId}`;
      }

      const response = await api.post(endpoint);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal generate invoice');
      throw err;
    }
  },

  async download(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const token = api.getAuthToken();
      const url = `${api.baseUrl}/invoices/${company.id}/${id}/download`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      return response.blob();
    } catch (err) {
      errorNotify(err.message || 'Gagal download invoice');
      throw err;
    }
  },

  async getPublishedTemplates() {
    try {
      const company = get(selectedCompany);
      if (!company?.id) return [];

      const res = await api.get(
        `/templates/${company.id}?document_type=invoice&status=published`
      );

      return res.data || [];
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat template invoice');
      return [];
    }
  },
};

export default invoiceService;

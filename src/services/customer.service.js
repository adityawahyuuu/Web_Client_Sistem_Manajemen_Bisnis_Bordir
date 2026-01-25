import api from './api.js';
import { get } from 'svelte/store';
import { selectedCompany } from '../stores/company.js';
import { error as errorNotify } from '../stores/notifications.js';

export const customerService = {
  async getAll(page = 1, limit = 100, search = '') {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      let endpoint = `/customers/${company.id}?page=${page}&limit=${limit}`;
      if (search) {
        endpoint += `&search=${encodeURIComponent(search)}`;
      }
      const response = await api.get(endpoint);
      return {
        data: response.data || [],
        meta: response.meta || { page, limit, total: 0, totalPages: 0 }
      };
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat data pelanggan');
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

      const response = await api.get(`/customers/${company.id}/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat detail pelanggan');
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

      const response = await api.post(`/customers/${company.id}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal membuat pelanggan');
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

      const response = await api.put(`/customers/${company.id}/${id}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memperbarui pelanggan');
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

      await api.delete(`/customers/${company.id}/${id}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus pelanggan');
      throw err;
    }
  }
};

export default customerService;

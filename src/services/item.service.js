import api from './api.js';
import { get } from 'svelte/store';
import { selectedCompany } from '../stores/company.js';
import { error as errorNotify } from '../stores/notifications.js';

export const itemService = {
  /**
   * Ambil semua item untuk perusahaan yang aktif
   * @param {number} page
   * @param {number} limit
   * @param {string} search
   * @param {boolean|null} is_active - filter aktif/nonaktif (null = semua)
   */
  async getAll(page = 1, limit = 100, search = '', is_active = null) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      let endpoint = `/items/${company.id}?page=${page}&limit=${limit}`;
      if (search) {
        endpoint += `&search=${encodeURIComponent(search)}`;
      }
      if (is_active !== null) {
        endpoint += `&is_active=${is_active}`;
      }

      const response = await api.get(endpoint);
      return {
        data: response.data || [],
        meta: response.meta || { page, limit, total: 0, totalPages: 0 }
      };
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat data item');
      return null;
    }
  },

  /**
   * Ambil detail item berdasarkan ID
   * @param {number} itemId
   */
  async getById(itemId) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.get(`/items/${company.id}/${itemId}`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat detail item');
      return null;
    }
  },

  /**
   * Buat item baru
   * @param {object} data - { item_code, item_name, description, unit, unit_price, category, is_active }
   */
  async create(data) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.post(`/items/${company.id}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal membuat item');
      throw err;
    }
  },

  /**
   * Perbarui item (item_code TIDAK bisa diubah setelah dibuat)
   * @param {number} itemId
   * @param {object} data - { item_name?, description?, unit?, unit_price?, category?, is_active? }
   */
  async update(itemId, data) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      // item_code tidak diizinkan di PUT — hanya field yang sesuai spec
      const apiData = {
        item_name:   data.item_name,
        description: data.description,
        unit:        data.unit,
        unit_price:  data.unit_price,
        category:    data.category,
        is_active:   data.is_active
      };

      const response = await api.put(`/items/${company.id}/${itemId}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memperbarui item');
      throw err;
    }
  },

  /**
   * Hapus item
   * @param {number} itemId
   */
  async delete(itemId) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      await api.delete(`/items/${company.id}/${itemId}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus item');
      throw err;
    }
  },

  /**
   * Ambil daftar harga khusus item untuk pelanggan tertentu
   * @param {number} customerId
   */
  async getCustomerItems(customerId) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.get(`/items/${company.id}/customer/${customerId}`);
      return {
        data: response.data || [],
        meta: response.meta || {}
      };
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat harga khusus pelanggan');
      return null;
    }
  },

  /**
   * Tambah harga khusus item untuk pelanggan
   * @param {number} customerId
   * @param {object} data - { id: item_id, custom_price?, notes? }
   */
  async createCustomerItem(customerId, data) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.post(`/items/${company.id}/customer/${customerId}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal menambah harga khusus item');
      throw err;
    }
  },

  /**
   * Hapus harga khusus item pelanggan
   * @param {number} customerId
   * @param {number} customerItemId
   */
  async deleteCustomerItem(customerId, customerItemId) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      await api.delete(`/items/${company.id}/customer/${customerId}/${customerItemId}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus harga khusus item');
      throw err;
    }
  }
};

export default itemService;

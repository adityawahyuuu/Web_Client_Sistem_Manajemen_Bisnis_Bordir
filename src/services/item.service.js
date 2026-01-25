import api from './api.js';
import { get } from 'svelte/store';
import { selectedCompany } from '../stores/company.js';
import { error as errorNotify } from '../stores/notifications.js';

export const itemService = {
  /**
   * Get all items for a company
   * @param {number} page
   * @param {number} limit
   * @param {string} search
   */
  async getAll(page = 1, limit = 100, search = '') {
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
   * Get item by ID
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
   * Create new item
   * @param {object} data - { name, description, unit, unit_price, sku, category }
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
   * Update item
   * @param {number} itemId
   * @param {object} data
   */
  async update(itemId, data) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.put(`/items/${company.id}/${itemId}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memperbarui item');
      throw err;
    }
  },

  /**
   * Delete item
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
   * Get customer-specific items
   * @param {number} customerId
   */
  async getCustomerItems(customerId) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.get(`/items/${company.id}/${customerId}`);
      return {
        data: response.data || [],
        meta: response.meta || {}
      };
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat item pelanggan');
      return null;
    }
  },

  /**
   * Add customer-specific item
   * @param {number} customerId
   * @param {object} data
   */
  async createCustomerItem(customerId, data) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.post(`/items/${company.id}/${customerId}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal membuat item pelanggan');
      throw err;
    }
  },

  /**
   * Delete customer-specific item
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

      await api.delete(`/items/${company.id}/${customerId}/${customerItemId}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus item pelanggan');
      throw err;
    }
  }
};

export default itemService;

import api from './api.js';
import { get } from 'svelte/store';
import { selectedCompany } from '../stores/company.js';
import { error as errorNotify } from '../stores/notifications.js';

/**
 * Helper to get error message from unknown error
 * @param {unknown} err - Error object
 * @returns {string} Error message
 */
function getErrorMessage(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Terjadi kesalahan';
}

/**
 * @typedef {Object} Company
 * @property {number} id - Company ID
 */

/**
 * Helper to safely get company with id property
 * @returns {Company|null}
 */
function getSelectedCompany() {
  return (get(selectedCompany));
}

/**
 * @typedef {Object} CreateItemParams
 * @property {string} item_code
 * @property {string} item_name
 * @property {string} [description]
 * @property {string} unit
 * @property {number} unit_price
 * @property {string} [category]
 * @property {boolean} [is_active]
 */

/**
 * @typedef {Object} UpdateItemParams
 * @property {string} [item_name]
 * @property {string} [description]
 * @property {string} [unit]
 * @property {number} [unit_price]
 * @property {string} [category]
 * @property {boolean} [is_active]
 */

/**
 * @typedef {Object} CustomerItemParams
 * @property {number} id
 * @property {number} [custom_price]
 * @property {string} [notes]
 */

export const itemService = {
  /**
   * Ambil semua item untuk perusahaan yang aktif
   * @param {number} [page]
   * @param {number} [limit]
   * @param {string} [search]
   * @param {boolean|null} [is_active]
   * @returns {Promise<{data: Array<any>, meta: Object}|null>}
   */
  async getAll(page = 1, limit = 100, search = '', is_active = null) {
    try {
      const company = getSelectedCompany();
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
      errorNotify(getErrorMessage(err) || 'Gagal memuat data item');
      return null;
    }
  },

  /**
   * Ambil detail item berdasarkan ID
   * @param {number} itemId
   * @returns {Promise<any>}
   */
  async getById(itemId) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.get(`/items/${company.id}/${itemId}`);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat detail item');
      return null;
    }
  },

  /**
   * Buat item baru
   * @param {CreateItemParams} data
   * @returns {Promise<any>}
   */
  async create(data) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.post(`/items/${company.id}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal membuat item');
      throw err;
    }
  },

  /**
   * Perbarui item (item_code TIDAK bisa diubah setelah dibuat)
   * @param {number} itemId
   * @param {UpdateItemParams} data
   * @returns {Promise<any>}
   */
  async update(itemId, data) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

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
      errorNotify(getErrorMessage(err) || 'Gagal memperbarui item');
      throw err;
    }
  },

  /**
   * Hapus item
   * @param {number} itemId
   * @returns {Promise<boolean|null>}
   */
  async delete(itemId) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      await api.delete(`/items/${company.id}/${itemId}`);
      return true;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal menghapus item');
      throw err;
    }
  },

  /**
   * Ambil daftar harga khusus item untuk pelanggan tertentu
   * @param {number} customerId
   * @returns {Promise<{data: Array<any>, meta: Object}|null>}
   */
  async getCustomerItems(customerId) {
    try {
      const company = getSelectedCompany();
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
      errorNotify(getErrorMessage(err) || 'Gagal memuat harga khusus pelanggan');
      return null;
    }
  },

  /**
   * Tambah harga khusus item untuk pelanggan
   * @param {number} customerId
   * @param {CustomerItemParams} data
   * @returns {Promise<any>}
   */
  async createCustomerItem(customerId, data) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.post(`/items/${company.id}/customer/${customerId}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal menambah harga khusus item');
      throw err;
    }
  },

  /**
   * Hapus harga khusus item pelanggan
   * @param {number} customerId
   * @param {number} customerItemId
   * @returns {Promise<boolean|null>}
   */
  async deleteCustomerItem(customerId, customerItemId) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      await api.delete(`/items/${company.id}/customer/${customerId}/${customerItemId}`);
      return true;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal menghapus harga khusus item');
      throw err;
    }
  }
};

export default itemService;

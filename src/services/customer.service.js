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
 * @typedef {Object} PaginationMeta
 * @property {number} page - Current page
 * @property {number} limit - Items per page
 * @property {number} total - Total items
 * @property {number} totalPages - Total pages
 */

/**
 * @typedef {Object} CustomerListOptions
 * @property {number} [page] - Page number
 * @property {number} [limit] - Items per page
 * @property {string} [search] - Search query
 */

/**
 * Helper to safely get company with id property
 * @returns {Company|null}
 */
function getSelectedCompany() {
  return (get(selectedCompany));
}

export const customerService = {
  /**
   * Get all customers for selected company
   * @param {CustomerListOptions} options - Query options
   * @returns {Promise<{data: Array<any>, meta: PaginationMeta}|null>} Customers list with pagination
   */
  async getAll({ page = 1, limit = 100, search = '' } = {}) {
    try {
      const company = getSelectedCompany();
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
      errorNotify(getErrorMessage(err) || 'Gagal memuat data pelanggan');
      return null;
    }
  },

  /**
   * Get customer by ID
   * @param {number} id - Customer ID
   * @returns {Promise<any>} Customer data
   */
  async getById(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.get(`/customers/${company.id}/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat detail pelanggan');
      return null;
    }
  },

  /**
   * Create new customer
   * @param {Object} data - Customer data
   * @returns {Promise<any>} Created customer
   */
  async create(data) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.post(`/customers/${company.id}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal membuat pelanggan');
      throw err;
    }
  },

  /**
   * Update customer
   * @param {number} id - Customer ID
   * @param {Object} data - Customer data to update
   * @returns {Promise<any>} Updated customer
   */
  async update(id, data) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.put(`/customers/${company.id}/${id}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memperbarui pelanggan');
      throw err;
    }
  },

  /**
   * Delete customer
   * @param {number} id - Customer ID
   * @returns {Promise<boolean|null>} Success status
   */
  async delete(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      await api.delete(`/customers/${company.id}/${id}`);
      return true;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal menghapus pelanggan');
      throw err;
    }
  }
};

export default customerService;

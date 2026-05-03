import api from './api.js';
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

const companyService = {
  /**
   * Get all companies for current user
   * @returns {Promise<Object>} Companies list
   */
  async getAll() {
    try {
      const response = await api.get('/companies');
      return response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat daftar perusahaan');
      throw err;
    }
  },

  /**
   * Get company by ID
   * @param {number} id - Company ID
   * @returns {Promise<Object>} Company data
   */
  async getById(id) {
    try {
      const response = await api.get(`/companies/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat detail perusahaan');
      throw err;
    }
  },

  /**
   * Create new company
   * @param {Object} data - Company data { name, address, phone, email, website, logo }
   * @returns {Promise<Object>} Created company
   */
  async create(data) {
    try {
      const response = await api.post('/companies', data);
      return response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal membuat perusahaan');
      throw err;
    }
  },

  /**
   * Update company
   * @param {number} id - Company ID
   * @param {Object} data - Company data to update
   * @returns {Promise<Object>} Updated company
   */
  async update(id, data) {
    try {
      const response = await api.put(`/companies/${id}`, data);
      return response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memperbarui perusahaan');
      throw err;
    }
  },

  /**
   * Delete company
   * @param {number} id - Company ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    try {
      await api.delete(`/companies/${id}`);
      return true;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal menghapus perusahaan');
      throw err;
    }
  },

  /**
   * Get company settings
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>} Company settings
   */
  async getSettings(companyId) {
    try {
      const response = await api.get(`/companies/${companyId}/settings`);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat pengaturan perusahaan');
      throw err;
    }
  },

  /**
   * Update company settings
   * @param {number} companyId - Company ID
   * @param {Object} data - Settings data { invoice_prefix, primary_color, secondary_color, font_family, font_size, header_text, footer_text, terms_conditions, invoice_number_format, show_company_logo, show_company_address, show_tax_column, show_discount_column }
   * @returns {Promise<Object>} Updated settings
   */
  async updateSettings(companyId, data) {
    try {
      const response = await api.put(`/companies/${companyId}/settings`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memperbarui pengaturan perusahaan');
      throw err;
    }
  }
};

export default companyService;

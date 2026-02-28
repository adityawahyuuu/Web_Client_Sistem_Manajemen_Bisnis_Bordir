import api from './api.js';
import { error as errorNotify } from '../stores/notifications.js';

const companyService = {
  /**
   * Get all companies for current user
   */
  async getAll() {
    try {
      const response = await api.get('/companies');
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat daftar perusahaan');
      throw err;
    }
  },

  /**
   * Get company by ID
   * @param {number} id
   */
  async getById(id) {
    try {
      const response = await api.get(`/companies/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat detail perusahaan');
      throw err;
    }
  },

  /**
   * Create new company
   * @param {object} data - { name, address, phone, email, website, logo }
   */
  async create(data) {
    try {
      const response = await api.post('/companies', data);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal membuat perusahaan');
      throw err;
    }
  },

  /**
   * Update company
   * @param {number} id
   * @param {object} data
   */
  async update(id, data) {
    try {
      const response = await api.put(`/companies/${id}`, data);
      return response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memperbarui perusahaan');
      throw err;
    }
  },

  /**
   * Delete company
   * @param {number} id
   */
  async delete(id) {
    try {
      await api.delete(`/companies/${id}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus perusahaan');
      throw err;
    }
  },

  /**
   * Get company settings
   * @param {number} companyId
   */
  async getSettings(companyId) {
    try {
      const response = await api.get(`/companies/${companyId}/settings`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat pengaturan perusahaan');
      throw err;
    }
  },

  /**
   * Update company settings
   * @param {number} companyId
   * @param {object} data - { invoice_prefix, primary_color, secondary_color, font_family, font_size,
   *                         header_text, footer_text, terms_conditions, invoice_number_format,
   *                         show_company_logo, show_company_address, show_tax_column, show_discount_column }
   */
  async updateSettings(companyId, data) {
    try {
      const response = await api.put(`/companies/${companyId}/settings`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memperbarui pengaturan perusahaan');
      throw err;
    }
  }
};

export default companyService;

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
   * Upload company logo
   * @param {number} id
   * @param {File} file
   */
  async uploadLogo(id, file) {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const token = api.getAuthToken();
      const url = `${api.baseUrl}/companies/${id}/logo`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to upload logo');
      }

      return response.json();
    } catch (err) {
      errorNotify(err.message || 'Gagal upload logo');
      throw err;
    }
  }
};

export default companyService;

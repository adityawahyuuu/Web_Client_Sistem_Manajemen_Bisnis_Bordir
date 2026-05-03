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
 * @typedef {Object} GetAllReceiptsParams
 * @property {number} [page]
 * @property {number} [limit]
 * @property {string} [customer_id]
 * @property {string} [invoice_id]
 * @property {string} [payment_method]
 * @property {string} [status]
 * @property {string} [search]
 */

/**
 * @typedef {Object} CreateReceiptParams
 * @property {number} customer_id
 * @property {number} [invoice_id]
 * @property {string} [receipt_date]
 * @property {number} amount
 * @property {string} [payment_method]
 * @property {string} [status]
 * @property {string} [description]
 * @property {string} [received_by]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} UpdateReceiptParams
 * @property {number} [amount]
 * @property {string} [payment_method]
 * @property {string} [status]
 * @property {string} [description]
 * @property {string} [received_by]
 * @property {string} [notes]
 */

export const receiptService = {
  /**
   * Ambil daftar kuitansi dengan filter
   * @param {GetAllReceiptsParams} [params]
   * @returns {Promise<{data: Array<any>, meta: Object}|null>}
   */
  async getAll({
    page = 1,
    limit = 100,
    customer_id = '',
    invoice_id = '',
    payment_method = '',
    status = '',
    search = ''
  } = {}) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      let endpoint = `/receipts/${company.id}?page=${page}&limit=${limit}`;
      if (customer_id) endpoint += `&customer_id=${customer_id}`;
      if (invoice_id)  endpoint += `&invoice_id=${invoice_id}`;
      if (payment_method) endpoint += `&payment_method=${encodeURIComponent(payment_method)}`;
      if (status)   endpoint += `&status=${encodeURIComponent(status)}`;
      if (search)   endpoint += `&search=${encodeURIComponent(search)}`;

      const response = await api.get(endpoint);
      return {
        data: response.data || [],
        meta: response.meta || { page, limit, total: 0, totalPages: 0 }
      };
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat data kuitansi');
      return null;
    }
  },

  /**
   * Ambil detail kuitansi
   * @param {number} id
   * @returns {Promise<any>}
   */
  async getById(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      const response = await api.get(`/receipts/${company.id}/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat detail kuitansi');
      return null;
    }
  },

  /**
   * Buat kuitansi baru
   * @param {CreateReceiptParams} data
   * @returns {Promise<any>}
   */
  async create(data) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const apiData = {
        company_id:  company.id,
        customer_id: data.customer_id,
        invoice_id:  data.invoice_id  || undefined,
        receipt_date:  data.receipt_date  || undefined,
        amount:      data.amount,
        payment_method: data.payment_method || undefined,
        status:      data.status      || undefined,
        description: data.description || undefined,
        received_by: data.received_by || undefined,
        notes:       data.notes       || undefined
      };

      const response = await api.post(`/receipts/${company.id}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal membuat kuitansi');
      throw err;
    }
  },

  /**
   * Perbarui kuitansi (hanya field yang diizinkan)
   * @param {number} id
   * @param {UpdateReceiptParams} data
   * @returns {Promise<any>}
   */
  async update(id, data) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const apiData = {
        amount:      data.amount,
        payment_method: data.payment_method,
        status:      data.status,
        description: data.description,
        received_by: data.received_by,
        notes:       data.notes
      };

      const response = await api.put(`/receipts/${company.id}/${id}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memperbarui kuitansi');
      throw err;
    }
  },

  /**
   * Hapus kuitansi (otomatis recalculate status invoice jika terhubung)
   * @param {number} id
   * @returns {Promise<boolean|null>}
   */
  async delete(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      await api.delete(`/receipts/${company.id}/${id}`);
      return true;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal menghapus kuitansi');
      throw err;
    }
  },

  /**
   * Generate PDF kuitansi (template statis)
   * @param {number} id
   * @returns {Promise<any>}
   */
  async generate(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) return null;
      const response = await api.post(`/receipts/${company.id}/${id}/generate`, {});
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal generate kuitansi');
      throw err;
    }
  },

  /**
   * Unduh PDF kuitansi
   * @param {number} id
   * @returns {Promise<Blob|null>}
   */
  async download(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) return null;
      const token = api.getAuthToken();
      const url = `${api.baseUrl}/receipts/${company.id}/${id}/download`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengunduh kuitansi');
      return response.blob();
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal download kuitansi');
      throw err;
    }
  }
};

export default receiptService;

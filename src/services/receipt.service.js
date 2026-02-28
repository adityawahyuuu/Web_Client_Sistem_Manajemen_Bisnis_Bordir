import api from './api.js';
import { get } from 'svelte/store';
import { selectedCompany } from '../stores/company.js';
import { error as errorNotify } from '../stores/notifications.js';

export const receiptService = {
  /**
   * Ambil daftar kuitansi dengan filter
   * @param {{ page?, limit?, customer_id?, invoice_id?, payment_method?, status?, search? }} params
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
      const company = get(selectedCompany);
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
      errorNotify(err.message || 'Gagal memuat data kuitansi');
      return null;
    }
  },

  /**
   * Ambil detail kuitansi
   * @param {number} id
   */
  async getById(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      const response = await api.get(`/receipts/${company.id}/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat detail kuitansi');
      return null;
    }
  },

  /**
   * Buat kuitansi baru
   * @param {{ customer_id, invoice_id?, receipt_date?, amount, payment_method?, status?, description?, received_by?, notes? }} data
   */
  async create(data) {
    try {
      const company = get(selectedCompany);
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
      errorNotify(err.message || 'Gagal membuat kuitansi');
      throw err;
    }
  },

  /**
   * Perbarui kuitansi (hanya field yang diizinkan)
   * @param {number} id
   * @param {{ amount?, payment_method?, status?, description?, received_by?, notes? }} data
   */
  async update(id, data) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      // Hanya field yang diizinkan PUT — customer_id & invoice_id TIDAK bisa diubah
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
      errorNotify(err.message || 'Gagal memperbarui kuitansi');
      throw err;
    }
  },

  /**
   * Hapus kuitansi (otomatis recalculate status invoice jika terhubung)
   * @param {number} id
   */
  async delete(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      await api.delete(`/receipts/${company.id}/${id}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus kuitansi');
      throw err;
    }
  },

  /**
   * Generate PDF kuitansi (template statis)
   * @param {number} id
   */
  async generate(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) return null;
      const response = await api.post(`/receipts/${company.id}/${id}/generate`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal generate kuitansi');
      throw err;
    }
  },

  /**
   * Unduh PDF kuitansi
   * @param {number} id
   */
  async download(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) return null;
      const token = api.getAuthToken();
      const url = `${api.baseUrl}/receipts/${company.id}/${id}/download`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengunduh kuitansi');
      return response.blob();
    } catch (err) {
      errorNotify(err.message || 'Gagal download kuitansi');
      throw err;
    }
  }
};

export default receiptService;

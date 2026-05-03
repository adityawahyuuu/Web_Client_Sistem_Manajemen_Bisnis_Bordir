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
 * @typedef {Object} GetAllParams
 * @property {number} [page]
 * @property {number} [limit]
 * @property {string} [status]
 * @property {string} [customer_id]
 * @property {string} [search]
 * @property {string} [date_from]
 * @property {string} [date_to]
 * @property {string} [payment_status]
 */

/**
 * @typedef {Object} CreateInvoiceParams
 * @property {number} customer_id
 * @property {string} [invoice_date]
 * @property {string} [due_date]
 * @property {string} [po_number]
 * @property {number} [tax_amount]
 * @property {number} [discount_amount]
 * @property {number} [shipping_cost]
 * @property {string} [notes]
 * @property {Array<any>} items
 */

/**
 * @typedef {Object} UpdateInvoiceParams
 * @property {string} [due_date]
 * @property {string} [po_number]
 * @property {number} [tax_amount]
 * @property {number} [discount_amount]
 * @property {number} [shipping_cost]
 * @property {string} [notes]
 * @property {string} [status]
 * @property {Array<any>} [items]
 */

/**
 * @typedef {Object} PaymentParams
 * @property {string} payment_date
 * @property {number} amount
 * @property {string} payment_method
 * @property {string} [notes]
 */

export const invoiceService = {
  /**
   * Ambil daftar invoice dengan filter
   * @param {GetAllParams} [params]
   * @returns {Promise<{data: Array<any>, meta: Object}|null>}
   */
  async getAll({
    page = 1,
    limit = 10,
    status = '',
    customer_id = '',
    search = '',
    date_from = '',
    date_to = '',
    payment_status = ''
  } = {}) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      let endpoint = `/invoices/${company.id}?page=${page}&limit=${limit}`;
      if (status) endpoint += `&status=${encodeURIComponent(status)}`;
      if (customer_id) endpoint += `&customer_id=${customer_id}`;
      if (search) endpoint += `&search=${encodeURIComponent(search)}`;
      if (date_from) endpoint += `&date_from=${date_from}`;
      if (date_to) endpoint += `&date_to=${date_to}`;
      if (payment_status) endpoint += `&payment_status=${payment_status}`;

      const response = await api.get(endpoint);
      return {
        data: response.data || [],
        meta: response.meta || { page, limit, total: 0, totalPages: 0 }
      };
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat data invoice');
      return null;
    }
  },

  /**
   * Ambil detail invoice (termasuk invoice_items, customers, receipts, total_paid, payment_status)
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

      const response = await api.get(`/invoices/${company.id}/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat detail invoice');
      return null;
    }
  },

  /**
   * Buat invoice baru (status otomatis draft)
   * @param {CreateInvoiceParams} data
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
        company_id: company.id,
        customer_id: data.customer_id,
        invoice_date: data.invoice_date || undefined,
        due_date: data.due_date || undefined,
        po_number: data.po_number || undefined,
        tax_amount: data.tax_amount ?? 0,
        discount_amount: data.discount_amount ?? 0,
        shipping_cost: data.shipping_cost ?? 0,
        notes: data.notes || '',
        items: data.items.map((item) => ({
          item_id: item.item_id,
          name: item.name || item.item_name || '',
          description: item.description || '',
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          unit_price: item.unit_price,
          discount_amount: item.discount_amount ?? 0,
          discount_type: item.discount_type
        }))
      };

      const response = await api.post(`/invoices/${company.id}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal membuat invoice');
      throw err;
    }
  },

  /**
   * Perbarui invoice
   * @param {number} id
   * @param {UpdateInvoiceParams} data
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
        due_date: data.due_date || undefined,
        po_number: data.po_number || undefined,
        tax_amount: data.tax_amount,
        discount_amount: data.discount_amount,
        shipping_cost: data.shipping_cost,
        notes: data.notes,
        status: data.status || undefined,
        ...(data.items ? {
          items: data.items.map((item) => ({
            item_id: item.item_id,
            name: item.name || item.item_name || '',
            description: item.description || '',
            quantity: item.quantity,
            unit: item.unit || 'pcs',
            unit_price: item.unit_price,
            discount_amount: item.discount_amount ?? 0,
            discount_type: item.discount_type
          }))
        } : {})
      };

      const response = await api.put(`/invoices/${company.id}/${id}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memperbarui invoice');
      throw err;
    }
  },

  /**
   * Ubah status invoice saja
   * @param {number} id
   * @param {'draft'|'sent'|'paid'|'cancelled'} status
   * @returns {Promise<any>}
   */
  async patchStatus(id, status) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.patch(`/invoices/${company.id}/${id}/status`, { status });
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal mengubah status invoice');
      throw err;
    }
  },

  /**
   * Ambil riwayat pembayaran (kuitansi) untuk invoice
   * @param {number} id
   * @returns {Promise<any>}
   */
  async getPayments(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.get(`/invoices/${company.id}/${id}/payments`);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat riwayat pembayaran');
      return null;
    }
  },

  /**
   * Tambah cicilan pembayaran baru
   * @param {number} invoiceId
   * @param {PaymentParams} data
   * @returns {Promise<any>}
   */
  async addPayment(invoiceId, data) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      const response = await api.post(`/invoices/${company.id}/${invoiceId}/payments`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal menambah cicilan pembayaran');
      throw err;
    }
  },

  /**
   * Edit cicilan pembayaran
   * @param {number} invoiceId
   * @param {number} paymentId
   * @param {PaymentParams} data
   * @returns {Promise<any>}
   */
  async updatePayment(invoiceId, paymentId, data) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      const response = await api.put(`/invoices/${company.id}/${invoiceId}/payments/${paymentId}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memperbarui cicilan pembayaran');
      throw err;
    }
  },

  /**
   * Hapus cicilan pembayaran
   * @param {number} invoiceId
   * @param {number} paymentId
   * @returns {Promise<boolean|null>}
   */
  async deletePayment(invoiceId, paymentId) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      await api.delete(`/invoices/${company.id}/${invoiceId}/payments/${paymentId}`);
      return true;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal menghapus cicilan pembayaran');
      throw err;
    }
  },

  /**
   * Sinkronkan item invoice ke master data item
   * @param {number} invoiceId
   * @param {number} invoiceItemId - ID dari invoice_item (bukan item master)
   * @returns {Promise<any>}
   */
  async syncItemToMaster(invoiceId, invoiceItemId) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.patch(
        `/invoices/${company.id}/${invoiceId}/items/${invoiceItemId}/sync-to-master`,
        {}
      );
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal sinkronkan ke master item');
      throw err;
    }
  },

  /**
   * Hapus invoice (gagal jika ada kuitansi/surat jalan terhubung)
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

      await api.delete(`/invoices/${company.id}/${id}`);
      return true;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal menghapus invoice');
      throw err;
    }
  },

  /**
   * Generate PDF invoice (template statis, termasuk riwayat pembayaran)
   * @param {number} id
   * @returns {Promise<any>}
   */
  async generate(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) return null;

      const response = await api.post(`/invoices/${company.id}/${id}/generate`, {});
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal generate invoice');
      throw err;
    }
  },

  /**
   * Unduh PDF invoice
   * @param {number} id
   * @returns {Promise<Blob|null>}
   */
  async download(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const token = api.getAuthToken();
      const url = `${api.baseUrl}/invoices/${company.id}/${id}/download`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Gagal mengunduh invoice');
      }

      return response.blob();
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal download invoice');
      throw err;
    }
  },
};

export default invoiceService;

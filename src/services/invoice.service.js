import api from './api.js';
import { get } from 'svelte/store';
import { selectedCompany } from '../stores/company.js';
import { error as errorNotify } from '../stores/notifications.js';

export const invoiceService = {
  /**
   * Ambil daftar invoice dengan filter
   * @param {{ page?, limit?, status?, customer_id?, search?, date_from?, date_to?, payment_status? }} params
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
      const company = get(selectedCompany);
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
      errorNotify(err.message || 'Gagal memuat data invoice');
      return null;
    }
  },

  /**
   * Ambil detail invoice (termasuk invoice_items, customers, receipts, total_paid, payment_status)
   * @param {number} id
   */
  async getById(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.get(`/invoices/${company.id}/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat detail invoice');
      return null;
    }
  },

  /**
   * Buat invoice baru (status otomatis draft)
   * @param {{ customer_id: number, invoice_date?: string, due_date?: string, po_number?: string, tax_amount?: number, discount_amount?: number, shipping_cost?: number, notes?: string, items: Array }} data
   */
  async create(data) {
    try {
      const company = get(selectedCompany);
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
        items: data.items.map(item => ({
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
      errorNotify(err.message || 'Gagal membuat invoice');
      throw err;
    }
  },

  /**
   * Perbarui invoice
   * @param {number} id
   * @param {{ due_date?, po_number?, tax_amount?, discount_amount?, shipping_cost?, notes?, status?, items? }} data
   */
  async update(id, data) {
    try {
      const company = get(selectedCompany);
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
          items: data.items.map(item => ({
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
      errorNotify(err.message || 'Gagal memperbarui invoice');
      throw err;
    }
  },

  /**
   * Ubah status invoice saja
   * @param {number} id
   * @param {'draft'|'sent'|'paid'|'cancelled'} status
   */
  async patchStatus(id, status) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.patch(`/invoices/${company.id}/${id}/status`, { status });
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal mengubah status invoice');
      throw err;
    }
  },

  /**
   * Ambil riwayat pembayaran (kuitansi) untuk invoice
   * @param {number} id
   */
  async getPayments(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.get(`/invoices/${company.id}/${id}/payments`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat riwayat pembayaran');
      return null;
    }
  },

  /**
   * Tambah cicilan pembayaran baru
   * @param {number} invoiceId
   * @param {{ payment_date: string, amount: number, payment_method: string, notes?: string }} data
   */
  async addPayment(invoiceId, data) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      const response = await api.post(`/invoices/${company.id}/${invoiceId}/payments`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal menambah cicilan pembayaran');
      throw err;
    }
  },

  /**
   * Edit cicilan pembayaran
   * @param {number} invoiceId
   * @param {number} paymentId
   * @param {{ payment_date?: string, amount?: number, payment_method?: string, notes?: string }} data
   */
  async updatePayment(invoiceId, paymentId, data) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      const response = await api.put(`/invoices/${company.id}/${invoiceId}/payments/${paymentId}`, data);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memperbarui cicilan pembayaran');
      throw err;
    }
  },

  /**
   * Hapus cicilan pembayaran
   * @param {number} invoiceId
   * @param {number} paymentId
   */
  async deletePayment(invoiceId, paymentId) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      await api.delete(`/invoices/${company.id}/${invoiceId}/payments/${paymentId}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus cicilan pembayaran');
      throw err;
    }
  },

  /**
   * Sinkronkan item invoice ke master data item
   * @param {number} invoiceId
   * @param {number} invoiceItemId - ID dari invoice_item (bukan item master)
   */
  async syncItemToMaster(invoiceId, invoiceItemId) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      const response = await api.patch(
        `/invoices/${company.id}/${invoiceId}/items/${invoiceItemId}/sync-to-master`
      );
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal sinkronkan ke master item');
      throw err;
    }
  },

  /**
   * Hapus invoice (gagal jika ada kuitansi/surat jalan terhubung)
   * @param {number} id
   */
  async delete(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      await api.delete(`/invoices/${company.id}/${id}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus invoice');
      throw err;
    }
  },

  /**
   * Generate PDF invoice (template statis, termasuk riwayat pembayaran)
   * @param {number} id
   */
  async generate(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) return null;

      const response = await api.post(`/invoices/${company.id}/${id}/generate`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal generate invoice');
      throw err;
    }
  },

  /**
   * Unduh PDF invoice
   * @param {number} id
   */
  async download(id) {
    try {
      const company = get(selectedCompany);
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
      errorNotify(err.message || 'Gagal download invoice');
      throw err;
    }
  },
};

export default invoiceService;

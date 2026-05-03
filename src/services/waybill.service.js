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
 * @typedef {Object} GetAllWaybillsParams
 * @property {number} [page]
 * @property {number} [limit]
 * @property {string} [customer_id]
 * @property {string} [invoice_id]
 * @property {string} [status]
 * @property {string} [search]
 */

/**
 * @typedef {Object} CreateWaybillParams
 * @property {number} customer_id
 * @property {number} [invoice_id]
 * @property {string} [waybill_date]
 * @property {string} [destination_address]
 * @property {string} [destination_city]
 * @property {string} [destination_province]
 * @property {string} [expedition_name]
 * @property {string} [vehicle_number]
 * @property {string} [driver_name]
 * @property {string} [notes]
 * @property {Array<any>} [items]
 */

/**
 * @typedef {Object} UpdateWaybillParams
 * @property {string} [destination_address]
 * @property {string} [destination_city]
 * @property {string} [destination_province]
 * @property {string} [expedition_name]
 * @property {string} [vehicle_number]
 * @property {string} [driver_name]
 * @property {string} [notes]
 * @property {string} [status]
 */

export const waybillService = {
  /**
   * Ambil daftar surat jalan dengan filter
   * @param {GetAllWaybillsParams} [params]
   * @returns {Promise<{data: Array<any>, meta: Object}|null>}
   */
  async getAll({
    page = 1,
    limit = 100,
    customer_id = '',
    invoice_id = '',
    status = '',
    search = ''
  } = {}) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      let endpoint = `/waybills/${company.id}?page=${page}&limit=${limit}`;
      if (customer_id) endpoint += `&customer_id=${customer_id}`;
      if (invoice_id)  endpoint += `&invoice_id=${invoice_id}`;
      if (status)      endpoint += `&status=${encodeURIComponent(status)}`;
      if (search)      endpoint += `&search=${encodeURIComponent(search)}`;

      const response = await api.get(endpoint);
      return {
        data: response.data || [],
        meta: response.meta || { page, limit, total: 0, totalPages: 0 }
      };
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat data surat jalan');
      return null;
    }
  },

  /**
   * Ambil detail surat jalan (termasuk waybill_items, customers, invoices)
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
      const response = await api.get(`/waybills/${company.id}/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memuat detail surat jalan');
      return null;
    }
  },

  /**
   * Buat surat jalan baru
   * @param {CreateWaybillParams} data
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
        company_id:            company.id,
        customer_id:           data.customer_id,
        invoice_id:            data.invoice_id || undefined,
        waybill_date:          data.waybill_date || undefined,
        destination_address:   data.destination_address || undefined,
        destination_city:      data.destination_city || undefined,
        destination_province:  data.destination_province || undefined,
        expedition_name:       data.expedition_name || undefined,
        vehicle_number:        data.vehicle_number || undefined,
        driver_name:           data.driver_name || undefined,
        notes:                 data.notes || undefined,
        items: data.items?.length
          ? data.items.map((i) => ({
              name:     i.name,
              quantity: Number(i.quantity) || 1,
              unit:     i.unit || 'pcs',
              notes:    i.notes || ''
            }))
          : undefined
      };

      const response = await api.post(`/waybills/${company.id}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal membuat surat jalan');
      throw err;
    }
  },

  /**
   * Perbarui surat jalan (items TIDAK bisa diubah via PUT)
   * @param {number} id
   * @param {UpdateWaybillParams} data
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
        destination_address:  data.destination_address,
        destination_city:     data.destination_city,
        destination_province: data.destination_province,
        expedition_name:      data.expedition_name,
        vehicle_number:       data.vehicle_number,
        driver_name:          data.driver_name,
        notes:                data.notes,
        status:               data.status
      };

      const response = await api.put(`/waybills/${company.id}/${id}`, apiData);
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal memperbarui surat jalan');
      throw err;
    }
  },

  /**
   * Hapus surat jalan
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
      await api.delete(`/waybills/${company.id}/${id}`);
      return true;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal menghapus surat jalan');
      throw err;
    }
  },

  /**
   * Update status saja (PATCH /status)
   * @param {number} id
   * @param {'pending'|'in_transit'|'delivered'} status
   * @returns {Promise<any>}
   */
  async patchStatus(id, status) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) return null;
      const response = await api.patch(`/waybills/${company.id}/${id}/status`, { status });
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal update status surat jalan');
      throw err;
    }
  },

  /**
   * Generate PDF surat jalan (template statis)
   * @param {number} id
   * @returns {Promise<any>}
   */
  async generate(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) return null;
      const response = await api.post(`/waybills/${company.id}/${id}/generate`, {});
      return response.data || response;
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal generate surat jalan');
      throw err;
    }
  },

  /**
   * Unduh PDF surat jalan
   * @param {number} id
   * @returns {Promise<Blob|null>}
   */
  async download(id) {
    try {
      const company = getSelectedCompany();
      if (!company?.id) return null;
      const token = api.getAuthToken();
      const url = `${api.baseUrl}/waybills/${company.id}/${id}/download`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengunduh surat jalan');
      return response.blob();
    } catch (err) {
      errorNotify(getErrorMessage(err) || 'Gagal download surat jalan');
      throw err;
    }
  }
};

export default waybillService;

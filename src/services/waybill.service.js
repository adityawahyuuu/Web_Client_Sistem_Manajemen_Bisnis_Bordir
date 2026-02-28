import api from './api.js';
import { get } from 'svelte/store';
import { selectedCompany } from '../stores/company.js';
import { error as errorNotify } from '../stores/notifications.js';

export const waybillService = {
  /**
   * Ambil daftar surat jalan dengan filter
   * @param {{ page?, limit?, customer_id?, invoice_id?, status?, search? }} params
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
      const company = get(selectedCompany);
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
      errorNotify(err.message || 'Gagal memuat data surat jalan');
      return null;
    }
  },

  /**
   * Ambil detail surat jalan (termasuk waybill_items, customers, invoices)
   * @param {number} id
   */
  async getById(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      const response = await api.get(`/waybills/${company.id}/${id}`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal memuat detail surat jalan');
      return null;
    }
  },

  /**
   * Buat surat jalan baru
   * @param {{ customer_id, invoice_id?, waybill_date?, destination_address?, destination_city?, destination_province?, expedition_name?, vehicle_number?, driver_name?, notes?, items? }} data
   */
  async create(data) {
    try {
      const company = get(selectedCompany);
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
          ? data.items.map(i => ({
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
      errorNotify(err.message || 'Gagal membuat surat jalan');
      throw err;
    }
  },

  /**
   * Perbarui surat jalan (items TIDAK bisa diubah via PUT)
   * @param {number} id
   * @param {{ destination_address?, destination_city?, destination_province?, expedition_name?, vehicle_number?, driver_name?, notes?, status? }} data
   */
  async update(id, data) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }

      // Items TIDAK disertakan — hanya field yang diizinkan PUT
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
      errorNotify(err.message || 'Gagal memperbarui surat jalan');
      throw err;
    }
  },

  /**
   * Hapus surat jalan
   * @param {number} id
   */
  async delete(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) {
        errorNotify('Silakan pilih perusahaan terlebih dahulu');
        return null;
      }
      await api.delete(`/waybills/${company.id}/${id}`);
      return true;
    } catch (err) {
      errorNotify(err.message || 'Gagal menghapus surat jalan');
      throw err;
    }
  },

  /**
   * Update status saja (PATCH /status)
   * @param {number} id
   * @param {'pending'|'in_transit'|'delivered'} status
   */
  async patchStatus(id, status) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) return null;
      const response = await api.patch(`/waybills/${company.id}/${id}/status`, { status });
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal update status surat jalan');
      throw err;
    }
  },

  /**
   * Generate PDF surat jalan (template statis)
   * @param {number} id
   */
  async generate(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) return null;
      const response = await api.post(`/waybills/${company.id}/${id}/generate`);
      return response.data || response;
    } catch (err) {
      errorNotify(err.message || 'Gagal generate surat jalan');
      throw err;
    }
  },

  /**
   * Unduh PDF surat jalan
   * @param {number} id
   */
  async download(id) {
    try {
      const company = get(selectedCompany);
      if (!company?.id) return null;
      const token = api.getAuthToken();
      const url = `${api.baseUrl}/waybills/${company.id}/${id}/download`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengunduh surat jalan');
      return response.blob();
    } catch (err) {
      errorNotify(err.message || 'Gagal download surat jalan');
      throw err;
    }
  }
};

export default waybillService;

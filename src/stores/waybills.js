import { writable, derived } from 'svelte/store';
import waybillService from '../services/waybill.service.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} WaybillItem
 * @property {number} id
 * @property {number} waybill_id
 * @property {string} name
 * @property {number} quantity
 * @property {string} unit
 * @property {string} notes
 */

/**
 * @typedef {Object} Waybill
 * @property {number} id
 * @property {number} company_id
 * @property {number} customer_id
 * @property {number|null} invoice_id
 * @property {string} waybill_number
 * @property {string} waybill_date
 * @property {string} destination_address
 * @property {string} destination_city
 * @property {string} destination_province
 * @property {string} expedition_name
 * @property {string} vehicle_number
 * @property {string} driver_name
 * @property {string} notes
 * @property {'pending' | 'in_transit' | 'delivered'} status
 * @property {Array<WaybillItem>} waybill_items
 * @property {string} created_at
 * @property {string} updated_at
 */

// =============================================================================
// STORES
// =============================================================================

export const waybills = writable(/** @type {Array<Waybill>} */ ([]));
export const waybillsLoading = writable(false);

// =============================================================================
// HELPER
// =============================================================================

/**
 * Format date string
 * @param {unknown} dateVal
 * @returns {string}
 */
function formatDateStr(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') return dateVal.split('T')[0];
  if (dateVal instanceof Date) return dateVal.toISOString().split('T')[0];
  return '';
}

/**
 * Normalize waybill item from API response
 * @param {any} item
 * @returns {WaybillItem}
 */
function normalizeWaybillItem(item) {
  return {
    id:         item.id,
    waybill_id: item.waybill_id,
    name:       item.name || '',
    quantity:   Number(item.quantity) || 0,
    unit:       item.unit || 'pcs',
    notes:      item.notes || ''
  };
}

/**
 * Normalize waybill from API response
 * @param {any} w
 * @returns {Waybill}
 */
function normalizeWaybill(w) {
  return {
    id:                   w.id,
    company_id:           w.company_id,
    customer_id:          w.customer_id,
    invoice_id:           w.invoice_id || null,
    waybill_number:       w.waybill_number || '',
    waybill_date:         formatDateStr(w.waybill_date),
    destination_address:  w.destination_address  || '',
    destination_city:     w.destination_city     || '',
    destination_province: w.destination_province || '',
    expedition_name:      w.expedition_name      || '',
    vehicle_number:       w.vehicle_number       || '',
    driver_name:          w.driver_name          || '',
    notes:                w.notes                || '',
    status:               w.status               || 'pending',
    waybill_items:        (w.waybill_items || w.items || []).map((item) => normalizeWaybillItem(item)),
    created_at:           w.created_at,
    updated_at:           w.updated_at
  };
}

// =============================================================================
// DERIVED STORES
// =============================================================================

export const waybillCount = derived(waybills, ($w) => $w.length);

export const waybillStats = derived(waybills, ($waybills) => ({
  total:      $waybills.length,
  pending:    $waybills.filter((w) => w.status === 'pending').length,
  in_transit: $waybills.filter((w) => w.status === 'in_transit').length,
  delivered:  $waybills.filter((w) => w.status === 'delivered').length
}));

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Muat daftar surat jalan dengan filter opsional
 * @param {any} [params]
 * @returns {Promise<void>}
 */
export async function loadWaybills(params = {}) {
  waybillsLoading.set(true);
  try {
    const result = await waybillService.getAll({ limit: 100, ...params });
    if (result && result.data) {
      waybills.set(result.data.map((item) => normalizeWaybill(item)));
    }
  } catch (error) {
    console.error('Error loading waybills:', error);
  } finally {
    waybillsLoading.set(false);
  }
}

/**
 * Buat surat jalan baru
 * @param {any} data
 * @returns {Promise<Waybill|any>}
 */
export async function addWaybill(data) {
  const result = await waybillService.create(data);
  if (result) {
    const normalized = normalizeWaybill(result);
    waybills.update((list) => [normalized, ...list]);
    return normalized;
  }
  return result;
}

/**
 * Perbarui surat jalan (items tidak dikirim — tidak bisa diubah via PUT)
 * @param {number} id
 * @param {any} data
 * @returns {Promise<Waybill|any>}
 */
export async function updateWaybill(id, data) {
  const result = await waybillService.update(id, data);
  if (result) {
    const normalized = normalizeWaybill(result);
    waybills.update((list) => list.map((w) => w.id === id ? normalized : w));
    return normalized;
  }
  return result;
}

/**
 * Hapus surat jalan
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteWaybill(id) {
  await waybillService.delete(id);
  waybills.update((list) => list.filter((w) => w.id !== id));
}

/**
 * Update status saja (PATCH /status)
 * @param {number} id
 * @param {'pending' | 'in_transit' | 'delivered'} status
 * @returns {Promise<Waybill|any>}
 */
export async function patchWaybillStatus(id, status) {
  const result = await waybillService.patchStatus(id, status);
  if (result) {
    const normalized = normalizeWaybill(result);
    waybills.update((list) => list.map((w) => w.id === id ? normalized : w));
    return normalized;
  }
  return result;
}

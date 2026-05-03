import { writable, derived } from 'svelte/store';
import invoiceService from '../services/invoice.service.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} InvoiceItem
 * @property {number} id
 * @property {number} invoice_id
 * @property {number} item_id
 * @property {string} name
 * @property {string} description
 * @property {number} quantity
 * @property {number} unit_price
 * @property {string} unit
 * @property {number} discount_amount
 * @property {string} discount_type
 * @property {number} total_price
 */

/**
 * @typedef {Object} Invoice
 * @property {number} id
 * @property {number} company_id
 * @property {number} customer_id
 * @property {string} invoice_number
 * @property {string} invoice_date
 * @property {string} due_date
 * @property {string} po_number
 * @property {number} subtotal
 * @property {number} tax_amount
 * @property {number} discount_amount
 * @property {number} shipping_cost
 * @property {number} total_amount
 * @property {number} total_paid
 * @property {string} payment_status
 * @property {'draft' | 'sent' | 'paid' | 'cancelled'} status
 * @property {string} notes
 * @property {number} created_by
 * @property {string} created_at
 * @property {string} updated_at
 * @property {Array<InvoiceItem>} items
 */

/**
 * @typedef {Object} LoadInvoicesParams
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
 * @type {import('svelte/store').Writable<Array<Invoice>>}
 */
export const invoices = writable(([]));
export const invoicesLoading = writable(false);

// =============================================================================
// HELPER
// =============================================================================

/**
 * Convert decimal value to number
 * @param {unknown} decimal
 * @returns {number}
 */
export function decimalToNumber(decimal) {
  if (typeof decimal === 'number') return decimal;
  if (typeof decimal === 'string') return Number(decimal);

  if (decimal && typeof decimal === 'object' && 'd' in decimal && 'e' in decimal) {
    const obj = /** @type {{d: any[], e: number}} */ (decimal);
    const digits = obj.d.join('');
    return Number(digits) * Math.pow(10, obj.e - (digits.length - 1));
  }

  return 0;
}

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
 * Normalize invoice item
 * @param {any} item
 * @returns {InvoiceItem}
 */
function normalizeInvoiceItem(item) {
  const qty = decimalToNumber(item.quantity);
  const unitPrice = decimalToNumber(item.unit_price);
  const discountItem = decimalToNumber(item.discount_amount);
  return {
    id: item.id,
    invoice_id: item.invoice_id,
    item_id: item.item_id,
    name: item.name || item.item_name || '',
    description: item.description || '',
    quantity: qty,
    unit_price: unitPrice,
    unit: item.unit || 'pcs',
    discount_amount: discountItem,
    discount_type: item.discount_type || 'Rp',
    total_price: decimalToNumber(item.total_price) || (qty * unitPrice - discountItem)
  };
}

/**
 * Normalize invoice from API response
 * @param {any} apiInvoice
 * @returns {Invoice}
 */
function normalizeInvoice(apiInvoice) {
  return {
    id: apiInvoice.id,
    company_id: apiInvoice.company_id,
    customer_id: apiInvoice.customer_id,
    invoice_number: apiInvoice.invoice_number || '',
    invoice_date: formatDateStr(apiInvoice.invoice_date),
    due_date: formatDateStr(apiInvoice.due_date),
    po_number: apiInvoice.po_number || '',
    subtotal: decimalToNumber(apiInvoice.subtotal),
    tax_amount: decimalToNumber(apiInvoice.tax_amount),
    discount_amount: decimalToNumber(apiInvoice.discount_amount),
    shipping_cost: decimalToNumber(apiInvoice.shipping_cost),
    total_amount: decimalToNumber(apiInvoice.total_amount),
    total_paid: decimalToNumber(apiInvoice.total_paid),
    payment_status: apiInvoice.payment_status || 'belum_bayar',
    status: apiInvoice.status || 'draft',
    notes: apiInvoice.notes || '',
    created_by: apiInvoice.created_by,
    created_at: apiInvoice.created_at,
    updated_at: apiInvoice.updated_at,
    items: (apiInvoice.invoice_items || apiInvoice.items || []).map((item) => normalizeInvoiceItem(item))
  };
}

// =============================================================================
// DERIVED STORES
// =============================================================================

export const invoiceCount = derived(invoices, ($invoices) => $invoices.length);

export const invoiceStats = derived(invoices, ($invoices) => ({
  total: $invoices.length,
  draft: $invoices.filter((i) => i.status === 'draft').length,
  sent: $invoices.filter((i) => i.status === 'sent').length,
  paid: $invoices.filter((i) => i.status === 'paid').length,
  cancelled: $invoices.filter((i) => i.status === 'cancelled').length,
  totalAmount: $invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
  totalPaid: $invoices.reduce((sum, i) => sum + (i.total_paid || 0), 0),
  byPaymentStatus: {
    lunas: $invoices.filter((i) => i.payment_status === 'lunas').length,
    dp: $invoices.filter((i) => i.payment_status === 'dp').length,
    belum_bayar: $invoices.filter((i) => i.payment_status === 'belum_bayar').length,
  }
}));

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Muat daftar invoice dengan filter opsional
 * @param {LoadInvoicesParams} [params]
 * @returns {Promise<void>}
 */
export async function loadInvoices(params = {}) {
  invoicesLoading.set(true);
  try {
    const result = await invoiceService.getAll({ limit: 100, ...params });
    if (result && result.data) {
      invoices.set(result.data.map((item) => normalizeInvoice(item)));
    }
  } catch (error) {
    console.error('Error loading invoices:', error);
  } finally {
    invoicesLoading.set(false);
  }
}

/**
 * Buat invoice baru
 * @param {any} data
 * @returns {Promise<Invoice|any>}
 */
export async function addInvoice(data) {
  const result = await invoiceService.create(data);
  if (result) {
    const normalized = normalizeInvoice(result);
    invoices.update((list) => [...list, normalized]);
    return normalized;
  }
  return result;
}

/**
 * Perbarui invoice
 * @param {number} id
 * @param {any} data
 * @returns {Promise<Invoice|any>}
 */
export async function updateInvoice(id, data) {
  const result = await invoiceService.update(id, data);
  if (result) {
    const normalized = normalizeInvoice(result);
    invoices.update((list) => list.map((i) => i.id === id ? normalized : i));
    return normalized;
  }
  return result;
}

/**
 * Ubah status invoice saja (PATCH /status)
 * @param {number} id
 * @param {'draft' | 'sent' | 'paid' | 'cancelled'} status
 * @returns {Promise<Invoice|any>}
 */
export async function patchInvoiceStatus(id, status) {
  const result = await invoiceService.patchStatus(id, status);
  if (result) {
    const normalized = normalizeInvoice(result);
    invoices.update((list) => list.map((i) => i.id === id ? normalized : i));
    return normalized;
  }
  return result;
}

/**
 * Hapus invoice
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteInvoice(id) {
  await invoiceService.delete(id);
  invoices.update((list) => list.filter((i) => i.id !== id));
}

/**
 * Muat riwayat pembayaran untuk invoice tertentu
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function loadInvoicePayments(id) {
  return invoiceService.getPayments(id);
}

/**
 * Reload satu invoice dari server lalu update store
 * @param {number} invoiceId
 * @returns {Promise<Invoice|null>}
 */
async function refreshInvoice(invoiceId) {
  const updated = await invoiceService.getById(invoiceId);
  if (updated) {
    const normalized = normalizeInvoice(updated);
    invoices.update((list) => list.map((i) => i.id === invoiceId ? normalized : i));
    return normalized;
  }
  return null;
}

/**
 * Tambah cicilan pembayaran
 * @param {number} invoiceId
 * @param {any} data
 * @returns {Promise<Invoice|null>}
 */
export async function addInvoicePayment(invoiceId, data) {
  await invoiceService.addPayment(invoiceId, data);
  return await refreshInvoice(invoiceId);
}

/**
 * Edit cicilan pembayaran
 * @param {number} invoiceId
 * @param {number} paymentId
 * @param {any} data
 * @returns {Promise<Invoice|null>}
 */
export async function updateInvoicePaymentEntry(invoiceId, paymentId, data) {
  await invoiceService.updatePayment(invoiceId, paymentId, data);
  return await refreshInvoice(invoiceId);
}

/**
 * Hapus cicilan pembayaran
 * @param {number} invoiceId
 * @param {number} paymentId
 * @returns {Promise<Invoice|null>}
 */
export async function deleteInvoicePaymentEntry(invoiceId, paymentId) {
  await invoiceService.deletePayment(invoiceId, paymentId);
  return await refreshInvoice(invoiceId);
}

/**
 * Generate PDF invoice
 * @param {number} id
 * @returns {Promise<any>}
 */
export async function generateInvoicePdf(id) {
  return invoiceService.generate(id);
}

/**
 * Unduh PDF invoice
 * @param {number} id
 * @returns {Promise<Blob|null>}
 */
export async function downloadInvoicePdf(id) {
  return invoiceService.download(id);
}

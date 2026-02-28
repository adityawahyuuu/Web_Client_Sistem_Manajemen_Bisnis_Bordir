import { writable, derived } from 'svelte/store';
import invoiceService from '../services/invoice.service.js';

export const invoices = writable([]);
export const invoicesLoading = writable(false);

// =============================================================================
// HELPER
// =============================================================================
export function decimalToNumber(decimal) {
  if (typeof decimal === 'number') return decimal;
  if (typeof decimal === 'string') return Number(decimal);

  if (decimal?.d && decimal?.e !== undefined) {
    const digits = decimal.d.join('');
    return Number(digits) * Math.pow(10, decimal.e - (digits.length - 1));
  }

  return 0;
}

function formatDateStr(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') return dateVal.split('T')[0];
  if (dateVal instanceof Date) return dateVal.toISOString().split('T')[0];
  return '';
}

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
    // total per baris = qty × unit_price - diskon_item
    total_price: decimalToNumber(item.total_price) || (qty * unitPrice - discountItem)
  };
}

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
    items: (apiInvoice.invoice_items || apiInvoice.items || []).map(normalizeInvoiceItem)
  };
}

// =============================================================================
// DERIVED STORES
// =============================================================================

export const invoiceCount = derived(invoices, $invoices => $invoices.length);

export const invoiceStats = derived(invoices, $invoices => ({
  total: $invoices.length,
  draft: $invoices.filter(i => i.status === 'draft').length,
  sent: $invoices.filter(i => i.status === 'sent').length,
  paid: $invoices.filter(i => i.status === 'paid').length,
  cancelled: $invoices.filter(i => i.status === 'cancelled').length,
  totalAmount: $invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
  totalPaid: $invoices.reduce((sum, i) => sum + (i.total_paid || 0), 0),
  byPaymentStatus: {
    lunas: $invoices.filter(i => i.payment_status === 'lunas').length,
    dp: $invoices.filter(i => i.payment_status === 'dp').length,
    belum_bayar: $invoices.filter(i => i.payment_status === 'belum_bayar').length,
  }
}));

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Muat daftar invoice dengan filter opsional
 * @param {{ page?, limit?, status?, customer_id?, search?, date_from?, date_to?, payment_status? }} params
 */
export async function loadInvoices(params = {}) {
  invoicesLoading.set(true);
  try {
    const result = await invoiceService.getAll({ limit: 100, ...params });
    if (result && result.data) {
      invoices.set(result.data.map(normalizeInvoice));
    }
  } catch (error) {
    console.error('Error loading invoices:', error);
  } finally {
    invoicesLoading.set(false);
  }
}

/**
 * Buat invoice baru
 */
export async function addInvoice(data) {
  const result = await invoiceService.create(data);
  if (result) {
    const normalized = normalizeInvoice(result);
    invoices.update(list => [...list, normalized]);
    return normalized;
  }
  return result;
}

/**
 * Perbarui invoice
 */
export async function updateInvoice(id, data) {
  const result = await invoiceService.update(id, data);
  if (result) {
    const normalized = normalizeInvoice(result);
    invoices.update(list => list.map(i => i.id === id ? normalized : i));
    return normalized;
  }
  return result;
}

/**
 * Ubah status invoice saja (PATCH /status)
 */
export async function patchInvoiceStatus(id, status) {
  const result = await invoiceService.patchStatus(id, status);
  if (result) {
    const normalized = normalizeInvoice(result);
    invoices.update(list => list.map(i => i.id === id ? normalized : i));
    return normalized;
  }
  return result;
}

/**
 * Hapus invoice
 */
export async function deleteInvoice(id) {
  await invoiceService.delete(id);
  invoices.update(list => list.filter(i => i.id !== id));
}

/**
 * Muat riwayat pembayaran untuk invoice tertentu
 */
export async function loadInvoicePayments(id) {
  return invoiceService.getPayments(id);
}

/**
 * Reload satu invoice dari server lalu update store
 */
async function refreshInvoice(invoiceId) {
  const updated = await invoiceService.getById(invoiceId);
  if (updated) {
    const normalized = normalizeInvoice(updated);
    invoices.update(list => list.map(i => i.id === invoiceId ? normalized : i));
    return normalized;
  }
  return null;
}

/**
 * Tambah cicilan pembayaran
 */
export async function addInvoicePayment(invoiceId, data) {
  const result = await invoiceService.addPayment(invoiceId, data);
  await refreshInvoice(invoiceId);
  return result;
}

/**
 * Edit cicilan pembayaran
 */
export async function updateInvoicePaymentEntry(invoiceId, paymentId, data) {
  const result = await invoiceService.updatePayment(invoiceId, paymentId, data);
  await refreshInvoice(invoiceId);
  return result;
}

/**
 * Hapus cicilan pembayaran
 */
export async function deleteInvoicePaymentEntry(invoiceId, paymentId) {
  await invoiceService.deletePayment(invoiceId, paymentId);
  await refreshInvoice(invoiceId);
}

/**
 * Generate PDF invoice
 */
export async function generateInvoicePdf(id) {
  return invoiceService.generate(id);
}

/**
 * Unduh PDF invoice
 */
export async function downloadInvoicePdf(id) {
  return invoiceService.download(id);
}

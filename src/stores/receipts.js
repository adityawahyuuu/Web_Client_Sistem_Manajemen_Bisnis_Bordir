import { writable, derived } from 'svelte/store';
import receiptService from '../services/receipt.service.js';

export const receipts = writable([]);
export const receiptsLoading = writable(false);

// =============================================================================
// HELPER
// =============================================================================
function decimalToNumber(decimal) {
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

function normalizeReceipt(r) {
  return {
    id:             r.id,
    company_id:     r.company_id,
    customer_id:    r.customer_id,
    invoice_id:     r.invoice_id || null,
    receipt_number: r.receipt_number || '',
    receipt_date:   formatDateStr(r.receipt_date),
    amount:         decimalToNumber(r.amount),
    payment_method: r.payment_method || 'cash',
    status:         r.status || 'dp',
    description:    r.description || '',
    received_by:    r.received_by || '',
    notes:          r.notes || '',
    created_at:     r.created_at,
    updated_at:     r.updated_at
  };
}

// =============================================================================
// DERIVED STORES
// =============================================================================
export const receiptCount = derived(receipts, $r => $r.length);

export const receiptStats = derived(receipts, $receipts => ({
  total: $receipts.length,
  totalAmount: $receipts.reduce((sum, r) => sum + (r.amount || 0), 0),
  byStatus: {
    lunas:   $receipts.filter(r => r.status === 'lunas').length,
    dp:      $receipts.filter(r => r.status === 'dp').length,
    piutang: $receipts.filter(r => r.status === 'piutang').length
  },
  byMethod: {
    cash:     $receipts.filter(r => r.payment_method === 'cash').length,
    transfer: $receipts.filter(r => r.payment_method === 'transfer').length,
    check:    $receipts.filter(r => r.payment_method === 'check').length,
    other:    $receipts.filter(r => r.payment_method === 'other').length
  }
}));

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Muat daftar kuitansi dengan filter opsional
 * @param {{ page?, limit?, customer_id?, invoice_id?, payment_method?, status?, search? }} params
 */
export async function loadReceipts(params = {}) {
  receiptsLoading.set(true);
  try {
    const result = await receiptService.getAll({ limit: 100, ...params });
    if (result && result.data) {
      receipts.set(result.data.map(normalizeReceipt));
    }
  } catch (error) {
    console.error('Error loading receipts:', error);
  } finally {
    receiptsLoading.set(false);
  }
}

/**
 * Buat kuitansi baru
 */
export async function addReceipt(data) {
  const result = await receiptService.create(data);
  if (result) {
    const normalized = normalizeReceipt(result);
    receipts.update(list => [normalized, ...list]);
    return normalized;
  }
  return result;
}

/**
 * Perbarui kuitansi
 */
export async function updateReceipt(id, data) {
  const result = await receiptService.update(id, data);
  if (result) {
    const normalized = normalizeReceipt(result);
    receipts.update(list => list.map(r => r.id === id ? normalized : r));
    return normalized;
  }
  return result;
}

/**
 * Hapus kuitansi
 */
export async function deleteReceipt(id) {
  await receiptService.delete(id);
  receipts.update(list => list.filter(r => r.id !== id));
}

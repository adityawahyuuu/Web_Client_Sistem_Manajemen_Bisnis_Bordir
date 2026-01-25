import { writable, derived } from 'svelte/store';
import invoiceService from '../services/invoice.service.js';

export const invoices = writable([]);
export const invoicesLoading = writable(false);

export const invoiceTemplates = writable([]);
export const hasInvoiceTemplate = derived(
  invoiceTemplates,
  ($t) => Array.isArray($t) && $t.length > 0
);

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

function normalizeInvoiceItem(item) {
  return {
    id: item.id,
    invoice_id: item.invoice_id,
    item_id: item.item_id,
    item_name: item.item_name || item.name || '',
    description: item.description || '',
    quantity: decimalToNumber(item.quantity),
    unit_price: decimalToNumber(item.unit_price),
    unit: item.unit || 'pcs',
    total_price:
      decimalToNumber(item.total_price) ||
      decimalToNumber(item.quantity) * decimalToNumber(item.unit_price)
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
    subtotal: decimalToNumber(apiInvoice.subtotal),
    tax_amount: decimalToNumber(apiInvoice.tax_amount),
    discount_amount: decimalToNumber(apiInvoice.discount_amount),
    total_amount: decimalToNumber(apiInvoice.total_amount),
    status: apiInvoice.status || 'draft',
    notes: apiInvoice.notes || '',
    generated_file_path: apiInvoice.generated_file_path || '',
    created_by: apiInvoice.created_by,
    created_at: apiInvoice.created_at,
    updated_at: apiInvoice.updated_at,
    items: (apiInvoice.invoice_items || apiInvoice.items || []).map(normalizeInvoiceItem)
  };
}

export const invoiceCount = derived(invoices, $invoices => $invoices.length);

export const invoiceStats = derived(invoices, $invoices => ({
  total: $invoices.length,
  draft: $invoices.filter(i => i.status === 'draft').length,
  sent: $invoices.filter(i => i.status === 'sent').length,
  paid: $invoices.filter(i => i.status === 'paid').length,
  totalAmount: $invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0)
}));

let invoiceCounter = 2;

export function generateInvoiceNumber() {
  invoiceCounter++;
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `INV-${year}${month}-${String(invoiceCounter).padStart(4, '0')}`;
}

export async function loadInvoices() {
  invoicesLoading.set(true);
  try {
    const result = await invoiceService.getAll();
    if (result && result.data) {
      const normalized = result.data.map(normalizeInvoice);
      invoices.set(normalized);
    }
  } catch (error) {
    console.error('Error loading invoices:', error);
  } finally {
    invoicesLoading.set(false);
  }
}

export async function generateInvoicePdf(id) {
  try {
    return await invoiceService.generate(id);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
}

export async function downloadInvoicePdf(id) {
  try {
    return await invoiceService.download(id);
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    throw error;
  }
}

export async function addInvoice(invoice) {
  const result = await invoiceService.create(invoice);
  if (result) {
    const normalized = normalizeInvoice(result);
    invoices.update(list => [...list, normalized]);
    return normalized;
  }
  return result;
}

export async function updateInvoice(id, data) {
  const result = await invoiceService.update(id, data);
  if (result) {
    const normalized = normalizeInvoice(result);
    invoices.update(list => list.map(i => i.id === id ? normalized : i));
    return normalized;
  }
  return result;
}

export async function deleteInvoice(id) {
  await invoiceService.delete(id);
  invoices.update(list => list.filter(i => i.id !== id));
}

export function getInvoiceById(id) {
  let found = null;
  invoices.subscribe(list => {
    found = list.find(i => i.id === id);
  })();
  return found;
}

export async function loadInvoiceTemplates() {
  const templates = await invoiceService.getPublishedTemplates();
  invoiceTemplates.set(templates);
}

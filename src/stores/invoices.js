import { writable, derived } from 'svelte/store';
import invoiceService from '../services/invoice.service.js';

export const invoices = writable([]);
export const invoicesLoading = writable(false);

export const invoiceCount = derived(invoices, $invoices => $invoices.length);

export const invoiceStats = derived(invoices, $invoices => ({
  total: $invoices.length,
  draft: $invoices.filter(i => i.status === 'draft').length,
  sent: $invoices.filter(i => i.status === 'sent').length,
  paid: $invoices.filter(i => i.status === 'paid').length,
  totalAmount: $invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0)
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
      invoices.set(result.data);
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
    invoices.update(list => [...list, result]);
  }
  return result;
}

export async function updateInvoice(id, data) {
  const result = await invoiceService.update(id, data);
  if (result) {
    invoices.update(list => list.map(i => i.id === id ? result : i));
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

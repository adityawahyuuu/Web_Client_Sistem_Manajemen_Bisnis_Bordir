import { writable, derived } from 'svelte/store';
import receiptService from '../services/receipt.service.js';

export const receipts = writable([]);
export const receiptsLoading = writable(false);

export const receiptCount = derived(receipts, $receipts => $receipts.length);

export const receiptStats = derived(receipts, $receipts => ({
  total: $receipts.length,
  totalAmount: $receipts.reduce((sum, r) => sum + (r.amount || 0), 0),
  byMethod: {
    cash: $receipts.filter(r => r.payment_method === 'cash').length,
    transfer: $receipts.filter(r => r.payment_method === 'transfer').length,
    other: $receipts.filter(r => !['cash', 'transfer'].includes(r.payment_method)).length
  }
}));

let receiptCounter = 1;

export function generateReceiptNumber() {
  receiptCounter++;
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `KW-${year}${month}-${String(receiptCounter).padStart(4, '0')}`;
}

export async function loadReceipts() {
  receiptsLoading.set(true);
  try {
    const result = await receiptService.getAll();
    if (result && result.data) {
      receipts.set(result.data);
    }
  } catch (error) {
    console.error('Error loading receipts:', error);
  } finally {
    receiptsLoading.set(false);
  }
}

export async function generateReceiptPdf(id) {
  try {
    return await receiptService.generate(id);
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    throw error;
  }
}

export async function downloadReceiptPdf(id) {
  try {
    return await receiptService.download(id);
  } catch (error) {
    console.error('Error downloading receipt PDF:', error);
    throw error;
  }
}

export async function addReceipt(receipt) {
  const result = await receiptService.create(receipt);
  if (result) {
    receipts.update(list => [...list, result]);
  }
  return result;
}

export async function updateReceipt(id, data) {
  const result = await receiptService.update(id, data);
  if (result) {
    receipts.update(list => list.map(r => r.id === id ? result : r));
  }
  return result;
}

export async function deleteReceipt(id) {
  await receiptService.delete(id);
  receipts.update(list => list.filter(r => r.id !== id));
}

export function getReceiptById(id) {
  let found = null;
  receipts.subscribe(list => {
    found = list.find(r => r.id === id);
  })();
  return found;
}

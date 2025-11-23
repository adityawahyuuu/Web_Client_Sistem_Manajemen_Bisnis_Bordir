import { writable, derived } from 'svelte/store';
import waybillService from '../services/waybill.service.js';

export const waybills = writable([]);
export const waybillsLoading = writable(false);

export const waybillCount = derived(waybills, $waybills => $waybills.length);

export const waybillStats = derived(waybills, $waybills => ({
  total: $waybills.length,
  pending: $waybills.filter(w => w.status === 'pending').length,
  shipped: $waybills.filter(w => w.status === 'shipped').length,
  delivered: $waybills.filter(w => w.status === 'delivered').length
}));

let waybillCounter = 1;

export function generateWaybillNumber() {
  waybillCounter++;
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `SJ-${year}${month}-${String(waybillCounter).padStart(4, '0')}`;
}

export async function loadWaybills() {
  waybillsLoading.set(true);
  try {
    const result = await waybillService.getAll();
    if (result && result.data) {
      waybills.set(result.data);
    }
  } catch (error) {
    console.error('Error loading waybills:', error);
  } finally {
    waybillsLoading.set(false);
  }
}

export async function generateWaybillPdf(id) {
  try {
    return await waybillService.generate(id);
  } catch (error) {
    console.error('Error generating waybill PDF:', error);
    throw error;
  }
}

export async function downloadWaybillPdf(id) {
  try {
    return await waybillService.download(id);
  } catch (error) {
    console.error('Error downloading waybill PDF:', error);
    throw error;
  }
}

export async function addWaybill(waybill) {
  const result = await waybillService.create(waybill);
  if (result) {
    waybills.update(list => [...list, result]);
  }
  return result;
}

export async function updateWaybill(id, data) {
  const result = await waybillService.update(id, data);
  if (result) {
    waybills.update(list => list.map(w => w.id === id ? result : w));
  }
  return result;
}

export async function deleteWaybill(id) {
  await waybillService.delete(id);
  waybills.update(list => list.filter(w => w.id !== id));
}

export function getWaybillById(id) {
  let found = null;
  waybills.subscribe(list => {
    found = list.find(w => w.id === id);
  })();
  return found;
}

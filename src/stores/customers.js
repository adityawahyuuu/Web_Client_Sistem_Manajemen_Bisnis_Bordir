import { writable, derived } from 'svelte/store';
import customerService from '../services/customer.service.js';

export const customers = writable([]);
export const customersLoading = writable(false);

// =============================================================================
// HELPER
// =============================================================================
function decimalToNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return Number(val);
  if (val?.d && val?.e !== undefined) {
    const digits = val.d.join('');
    return Number(digits) * Math.pow(10, val.e - (digits.length - 1));
  }
  return 0;
}

function normalizeCustomer(c) {
  return {
    id:               c.id,
    company_id:       c.company_id,
    name:             c.name             || '',
    company_name:     c.company_name     || '',
    email:            c.email            || '',
    phone:            c.phone            || '',
    mobile_phone:     c.mobile_phone     || '',
    address:          c.address          || '',
    province_code:    c.province_code    || '',
    city_code:        c.city_code        || '',
    subdistrict_code: c.subdistrict_code || '',
    village_code:     c.village_code     || '',
    postal_code:      c.postal_code      || '',
    piutang:          decimalToNumber(c.piutang),
    overpay:          decimalToNumber(c.overpay),
    created_at:       c.created_at,
    updated_at:       c.updated_at
  };
}

// =============================================================================
// DERIVED STORES
// =============================================================================
export const customerCount = derived(customers, $c => $c.length);

// =============================================================================
// ACTIONS
// =============================================================================
export async function loadCustomers(params = {}) {
  customersLoading.set(true);
  try {
    const result = await customerService.getAll(params);
    if (result && result.data) {
      customers.set(result.data.map(normalizeCustomer));
    }
  } catch (error) {
    console.error('Error loading customers:', error);
  } finally {
    customersLoading.set(false);
  }
}

export async function addCustomer(data) {
  const result = await customerService.create(data);
  if (result) {
    const normalized = normalizeCustomer(result);
    customers.update(list => [...list, normalized]);
    return normalized;
  }
  return result;
}

export async function updateCustomer(id, data) {
  const result = await customerService.update(id, data);
  if (result) {
    const normalized = normalizeCustomer(result);
    customers.update(list => list.map(c => c.id === id ? normalized : c));
    return normalized;
  }
  return result;
}

export async function deleteCustomer(id) {
  await customerService.delete(id);
  customers.update(list => list.filter(c => c.id !== id));
}

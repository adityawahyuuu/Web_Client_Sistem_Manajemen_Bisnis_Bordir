import { writable, derived } from 'svelte/store';
import customerService from '../services/customer.service.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} Customer
 * @property {number} id
 * @property {number} company_id
 * @property {string} name
 * @property {string} company_name
 * @property {string} email
 * @property {string} phone
 * @property {string} mobile_phone
 * @property {string} address
 * @property {string} province_code
 * @property {string} city_code
 * @property {string} subdistrict_code
 * @property {string} village_code
 * @property {string} postal_code
 * @property {number} piutang
 * @property {number} overpay
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @type {import('svelte/store').Writable<Array<Customer>>}
 */
export const customers = writable(([]));
export const customersLoading = writable(false);

// =============================================================================
// HELPER
// =============================================================================

/**
 * Convert decimal value to number
 * @param {unknown} val
 * @returns {number}
 */
function decimalToNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return Number(val);
  if (val && typeof val === 'object' && 'd' in val && 'e' in val) {
    /** @type {{d: any[], e: number}|any} */ 
    const obj = (val);
    const digits = obj.d.join('');
    return Number(digits) * Math.pow(10, obj.e - (digits.length - 1));
  }
  return 0;
}

/**
 * Normalize customer data
 * @param {any} c
 * @returns {Customer}
 */
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
export const customerCount = derived(customers, ($c) => $c.length);

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Load customers
 * @param {object} [params]
 * @returns {Promise<void>}
 */
export async function loadCustomers(params = {}) {
  customersLoading.set(true);
  try {
    const result = await customerService.getAll(params);
    if (result && result.data) {
      customers.set((result.data.map(normalizeCustomer)));
    }
  } catch (error) {
    console.error('Error loading customers:', error);
  } finally {
    customersLoading.set(false);
  }
}

/**
 * Add new customer
 * @param {object} data
 * @returns {Promise<Customer|any>}
 */
export async function addCustomer(data) {
  const result = await customerService.create(data);
  if (result) {
    const normalized = normalizeCustomer(result);
    customers.update((list) => [...list, normalized]);
    return normalized;
  }
  return result;
}

/**
 * Update customer
 * @param {number} id
 * @param {object} data
 * @returns {Promise<Customer|any>}
 */
export async function updateCustomer(id, data) {
  const result = await customerService.update(id, data);
  if (result) {
    const normalized = normalizeCustomer(result);
    customers.update((list) => list.map((c) => c.id === id ? normalized : c));
    return normalized;
  }
  return result;
}

/**
 * Delete customer
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteCustomer(id) {
  await customerService.delete(id);
  customers.update((list) => list.filter((c) => c.id !== id));
}

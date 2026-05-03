import { writable, derived, get } from 'svelte/store';
import { itemService } from '../services/item.service.js';
import { selectedCompany } from './company.js';
import { success, error as errorNotify } from './notifications.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} Item
 * @property {number} id
 * @property {string} name
 * @property {string} sku
 * @property {string} unit
 * @property {number} unit_price
 * @property {string} description
 * @property {string} category
 * @property {boolean} is_active
 */

/**
 * @typedef {Object} ItemsMeta
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} totalPages
 */

// =============================================================================
// STORES
// =============================================================================

/** @type {import('svelte/store').Writable<Array<Item>>} List of items */
export const items = writable(([]));

/** @type {import('svelte/store').Writable<ItemsMeta>} Pagination meta */
export const itemsMeta = writable(({ page: 1, limit: 100, total: 0, totalPages: 0 }));

/** @type {import('svelte/store').Writable<boolean>} Loading state */
export const itemsLoading = writable(false);

/** @type {import('svelte/store').Writable<string>} Search term */
export const itemsSearchTerm = writable('');

// =============================================================================
// HELPER
// =============================================================================

/**
 * Convert decimal value to number
 * @param {unknown} decimal
 * @returns {number}
 */
function decimalToNumber(decimal) {
  if (typeof decimal === 'number') return decimal;
  if (typeof decimal === 'string') return Number(decimal);

  if (decimal && typeof decimal === 'object' && 'd' in decimal && 'e' in decimal) {
    /** @type {unknown|any} */ 
    const obj = (decimal);
    const digits = obj.d.join('');
    return Number(digits) * Math.pow(10, obj.e - (digits.length - 1));
  }

  return 0;
}

/**
 * Normalize item from API response
 * @param {any} apiItem
 * @returns {Item}
 */
function normalizeItem(apiItem) {
  return {
    id: apiItem.id,
    name: apiItem.item_name,
    sku: apiItem.item_code,
    unit: apiItem.unit ?? 'pcs',
    unit_price: decimalToNumber(apiItem.unit_price),
    description: apiItem.description ?? '',
    category: apiItem.category ?? '',
    is_active: apiItem.is_active !== false
  };
}

// =============================================================================
// DERIVED STORES
// =============================================================================

/** Item count */
export const itemCount = derived(items, ($items) => $items.length);

/** Has items */
export const hasItems = derived(items, ($items) => $items.length > 0);

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Load all items for selected company
 * @param {number} [page]
 * @param {number} [limit]
 * @param {string} [search]
 * @returns {Promise<Array<Item>>}
 */
export async function loadItems(page = 1, limit = 100, search = '') {
  itemsLoading.set(true);
  try {
    const result = await itemService.getAll(page, limit, search);
    if (result) {
      const normalized = (result?.data || []).map((item) => normalizeItem(item));
      items.set(normalized || []);
      itemsMeta.set(result.meta || { page, limit, total: 0, totalPages: 0 });
      return normalized;
    }
    return [];
  } catch (err) {
    console.error('Error loading items:', err);
    return [];
  } finally {
    itemsLoading.set(false);
  }
}

/**
 * Search items with debounce support
 * @param {string} searchTerm
 * @returns {Promise<Array<Item>>}
 */
export async function searchItems(searchTerm) {
  itemsSearchTerm.set(searchTerm);
  return loadItems(1, 100, searchTerm);
}

/**
 * Create new item
 * @param {any} data
 * @returns {Promise<Item|undefined>}
 */
export async function createItem(data) {
  itemsLoading.set(true);
  try {
    const result = await itemService.create(data);
    if (result) {
      const normalized = normalizeItem(result);
      items.update((list) => [...list, normalized]);
      success('Item berhasil ditambahkan');
      return normalized;
    }
  } catch (err) {
    console.error('Error creating item:', err);
    throw err;
  } finally {
    itemsLoading.set(false);
  }
}

/**
 * Update item
 * @param {number} itemId
 * @param {any} data
 * @returns {Promise<Item|undefined>}
 */
export async function updateItem(itemId, data) {
  itemsLoading.set(true);
  try {
    const result = await itemService.update(itemId, data);
    if (result) {
      const normalized = normalizeItem(result);
      items.update((list) => list.map((item) => item.id === itemId ? normalized : item));
      success('Item berhasil diperbarui');
      return normalized;
    }
  } catch (err) {
    console.error('Error updating item:', err);
    throw err;
  } finally {
    itemsLoading.set(false);
  }
}

/**
 * Delete item
 * @param {number} itemId
 * @returns {Promise<void>}
 */
export async function deleteItem(itemId) {
  itemsLoading.set(true);
  try {
    await itemService.delete(itemId);
    items.update((list) => list.filter((item) => item.id !== itemId));
    success('Item berhasil dihapus');
  } catch (err) {
    console.error('Error deleting item:', err);
    throw err;
  } finally {
    itemsLoading.set(false);
  }
}

/**
 * Get item by ID
 * @param {number} itemId
 * @returns {Promise<any|null>}
 */
export async function getItemById(itemId) {
  try {
    return await itemService.getById(itemId);
  } catch (err) {
    console.error('Error getting item:', err);
    return null;
  }
}

/**
 * Clear items state
 * @returns {void}
 */
export function clearItemsState() {
  items.set([]);
  itemsMeta.set({ page: 1, limit: 100, total: 0, totalPages: 0 });
  itemsSearchTerm.set('');
}

// =============================================================================
// CUSTOMER ITEMS ACTIONS
// =============================================================================

/**
 * Load customer-specific items
 * @param {number} customerId
 * @returns {Promise<Array<any>>}
 */
export async function loadCustomerItems(customerId) {
  try {
    const result = await itemService.getCustomerItems(customerId);
    return result?.data || [];
  } catch (err) {
    console.error('Error loading customer items:', err);
    return [];
  }
}

/**
 * Create customer-specific item
 * @param {number} customerId
 * @param {any} data
 * @returns {Promise<any>}
 */
export async function createCustomerItem(customerId, data) {
  try {
    const result = await itemService.createCustomerItem(customerId, data);
    if (result) {
      success('Item pelanggan berhasil ditambahkan');
      return result;
    }
  } catch (err) {
    console.error('Error creating customer item:', err);
    throw err;
  }
}

/**
 * Delete customer-specific item
 * @param {number} customerId
 * @param {number} customerItemId
 * @returns {Promise<void>}
 */
export async function deleteCustomerItem(customerId, customerItemId) {
  try {
    await itemService.deleteCustomerItem(customerId, customerItemId);
    success('Item pelanggan berhasil dihapus');
  } catch (err) {
    console.error('Error deleting customer item:', err);
    throw err;
  }
}

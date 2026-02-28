import { writable, derived, get } from 'svelte/store';
import { itemService } from '../services/item.service.js';
import { selectedCompany } from './company.js';
import { success, error as errorNotify } from './notifications.js';

// =============================================================================
// STORES
// =============================================================================

/** @type {import('svelte/store').Writable<Array<object>>} List of items */
export const items = writable([]);

/** @type {import('svelte/store').Writable<object>} Pagination meta */
export const itemsMeta = writable({ page: 1, limit: 100, total: 0, totalPages: 0 });

/** @type {import('svelte/store').Writable<boolean>} Loading state */
export const itemsLoading = writable(false);

/** @type {import('svelte/store').Writable<string>} Search term */
export const itemsSearchTerm = writable('');

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
function normalizeItem(apiItem) {
  return {
    id: apiItem.id,
    name: apiItem.item_name,
    sku: apiItem.item_code,
    unit: apiItem.unit ?? 'pcs',
    unit_price: decimalToNumber(apiItem.unit_price),
    description: apiItem.description ?? '',
    category: apiItem.category ?? '',
    is_active: apiItem.is_active !== false // default true
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
 * @param {number} page
 * @param {number} limit
 * @param {string} search
 */
export async function loadItems(page = 1, limit = 100, search = '') {
  itemsLoading.set(true);
  try {
    const result = await itemService.getAll(page, limit, search);
    if (result) {
      const normalized = (result?.data || []).map(normalizeItem);
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
 */
export async function searchItems(searchTerm) {
  itemsSearchTerm.set(searchTerm);
  return loadItems(1, 100, searchTerm);
}

/**
 * Create new item
 * @param {object} data - { name, description, unit, unit_price, sku, category }
 */
export async function createItem(data) {
  itemsLoading.set(true);
  try {
    const result = await itemService.create(data);
    if (result) {
      const normalized = normalizeItem(result);
      items.update(list => [...list, normalized]);
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
 * @param {object} data
 */
export async function updateItem(itemId, data) {
  itemsLoading.set(true);
  try {
    const result = await itemService.update(itemId, data);
    if (result) {
      const normalized = normalizeItem(result);
      items.update(list => list.map(item => item.id === itemId ? normalized : item));
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
 */
export async function deleteItem(itemId) {
  itemsLoading.set(true);
  try {
    await itemService.delete(itemId);
    items.update(list => list.filter(item => item.id !== itemId));
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
 * @param {object} data
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

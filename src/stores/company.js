import { writable, derived, get } from 'svelte/store';
import companyService from '../services/company.service.js';
import { success, error as errorNotify } from './notifications.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} Company
 * @property {number} id
 * @property {string} [name]
 * @property {string} [address]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [website]
 * @property {string} [logo]
 */

/**
 * @typedef {Object} CompanySettings
 * @property {number} [id]
 * @property {string} [invoice_prefix]
 * @property {string} [primary_color]
 * @property {string} [secondary_color]
 * @property {string} [font_family]
 * @property {string} [font_size]
 * @property {string} [header_text]
 * @property {string} [footer_text]
 * @property {string} [terms_conditions]
 */

// =============================================================================
// STORES
// =============================================================================

/**
 * @type {import('svelte/store').Writable<Array<Company>>}
 */
export const companies = writable(([]));

/**
 * @type {import('svelte/store').Writable<Company|null>}
 */
export const selectedCompany = writable((null));

/** @type {import('svelte/store').Writable<boolean>} Loading state */
export const companiesLoading = writable(false);

/**
 * @type {import('svelte/store').Writable<CompanySettings|null>}
 */
export const companySettings = writable((null));

// =============================================================================
// DERIVED STORES
// =============================================================================

/** Current company ID (shorthand) */
export const currentCompanyId = derived(
  selectedCompany,
  ($selectedCompany) => $selectedCompany?.id || null
);

/** Company count */
export const companyCount = derived(
  companies,
  ($companies) => $companies.length
);

/** Check if has any company */
export const hasCompanies = derived(
  companies,
  ($companies) => $companies.length > 0
);

// =============================================================================
// PERSISTENCE
// =============================================================================

const SELECTED_COMPANY_KEY = 'selectedCompanyId';

/**
 * Save selected company ID to localStorage
 * @param {number|undefined} companyId
 */
function persistSelectedCompany(companyId) {
  if (companyId) {
    localStorage.setItem(SELECTED_COMPANY_KEY, String(companyId));
  } else {
    localStorage.removeItem(SELECTED_COMPANY_KEY);
  }
}

/**
 * Get persisted company ID from localStorage
 */
function getPersistedCompanyId() {
  const stored = localStorage.getItem(SELECTED_COMPANY_KEY);
  return stored ? parseInt(stored, 10) : null;
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Load all companies for current user
 * @returns {Promise<Array<Company>>}
 */
export async function loadCompanies() {
  companiesLoading.set(true);
  try {
    /** @type {{data?: Array<Company>}|any} */ 
    const result = await companyService.getAll();
    const resultData = (result);
    const companyList = /** @type {Array<Company>} */ (resultData.data || result || []);

    companies.set(companyList);

    // Auto-select company
    const currentSelected = get(selectedCompany);
    if (!currentSelected && companyList.length > 0) {
      // Try to restore persisted selection
      const persistedId = getPersistedCompanyId();
      const persistedCompany = persistedId
        ? companyList.find((c) => c.id === persistedId)
        : null;

      // Select persisted or first company
      selectCompany(persistedCompany || companyList[0]);
    }

    return companyList;
  } catch (err) {
    console.error('Error loading companies:', err);
    errorNotify('Gagal memuat daftar perusahaan');
    return [];
  } finally {
    companiesLoading.set(false);
  }
}

/**
 * Select a company as active
 * @param {Company} company
 */
export function selectCompany(company) {
  selectedCompany.set(company);
  persistSelectedCompany(company?.id);
}

/**
 * Select company by ID
 * @param {number} companyId
 */
export function selectCompanyById(companyId) {
  const companyList = get(companies);
  const company = companyList.find((c) => c.id === companyId);
  if (company) {
    selectCompany(company);
  }
}

/**
 * Create new company
 * @param {object} data
 * @returns {Promise<Company|undefined>}
 */
export async function createCompany(data) {
  companiesLoading.set(true);
  try {
    const result = await companyService.create(data);
    if (result) {
      /** @type {CompanySettings|any} */ 
      const resultData = (result);
      const company = (resultData.data || result);
      companies.update((list) => [...list, company]);
      success('Perusahaan berhasil dibuat');

      // Auto-select if first company
      const currentSelected = get(selectedCompany);
      if (!currentSelected) {
        selectCompany(company);
      }

      return company;
    }
  } catch (err) {
    console.error('Error creating company:', err);
    errorNotify('Gagal membuat perusahaan');
    throw err;
  } finally {
    companiesLoading.set(false);
  }
}

/**
 * Update company
 * @param {number} id
 * @param {object} data
 * @returns {Promise<Company|undefined>}
 */
export async function updateCompany(id, data) {
  companiesLoading.set(true);
  try {
    const result = await companyService.update(id, data);
    if (result) {
      /** @type {{data?: Company}|any} */ 
      const resultData = (result);
      const updated = (resultData.data || result);
      companies.update((list) => list.map((c) => c.id === id ? { ...c, ...updated } : c));

      // Update selected if it's the same
      const current = get(selectedCompany);
      if (current?.id === id) {
        selectedCompany.set(({ ...current, ...updated }));
      }

      success('Perusahaan berhasil diperbarui');
      return updated;
    }
  } catch (err) {
    console.error('Error updating company:', err);
    errorNotify('Gagal memperbarui perusahaan');
    throw err;
  } finally {
    companiesLoading.set(false);
  }
}

/**
 * Delete company
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteCompany(id) {
  companiesLoading.set(true);
  try {
    await companyService.delete(id);
    companies.update((list) => list.filter((c) => c.id !== id));

    // Clear selection if deleted
    const current = get(selectedCompany);
    if (current?.id === id) {
      const remaining = get(companies);
      selectCompany(remaining[0] || null);
    }

    success('Perusahaan berhasil dihapus');
  } catch (err) {
    console.error('Error deleting company:', err);
    errorNotify('Gagal menghapus perusahaan');
    throw err;
  } finally {
    companiesLoading.set(false);
  }
}

/**
 * Clear company state (on logout)
 */
export function clearCompanyState() {
  companies.set([]);
  selectedCompany.set(null);
  localStorage.removeItem(SELECTED_COMPANY_KEY);
}

/**
 * Load company settings
 * @param {number} companyId
 * @returns {Promise<CompanySettings|null>}
 */
export async function loadCompanySettings(companyId) {
  try {
    const settings = (await companyService.getSettings(companyId));
    companySettings.set(settings);
    return settings;
  } catch (err) {
    console.error('Error loading company settings:', err);
    return null;
  }
}

/**
 * Save company settings
 * @param {number} companyId
 * @param {object} data
 * @returns {Promise<any>}
 */
export async function saveCompanySettings(companyId, data) {
  try {
    const result = await companyService.updateSettings(companyId, data);
    if (result) {
      /** @type {{data?: CompanySettings}} */ 
      const resultData = (result);
      const settings = (resultData.data || result);
      companySettings.set(settings);
      success('Pengaturan perusahaan berhasil disimpan');
    }
    return result;
  } catch (err) {
    console.error('Error saving company settings:', err);
    errorNotify('Gagal menyimpan pengaturan perusahaan');
    throw err;
  }
}
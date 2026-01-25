import { writable, derived, get } from 'svelte/store';
import { produce } from 'immer';
import debounce from 'lodash.debounce';
import templateService from '../services/template.service.js';
import { success, error as errorNotify, warning } from './notifications.js';
import { currentCompanyId } from './company.js';

// =============================================================================
// CORE STORES
// =============================================================================

/** @type {import('svelte/store').Writable<object|null>} Working schema (draft) */
export const workingSchema = writable(null);

/** @type {import('svelte/store').Writable<object|null>} Original schema from server */
export const originalSchema = writable(null);

/** @type {import('svelte/store').Writable<object|null>} Current template metadata */
export const currentTemplate = writable(null);

/** @type {import('svelte/store').Writable<'view'|'edit'>} Editor mode */
export const editorMode = writable('view');

/** @type {import('svelte/store').Writable<string|null>} Selected section ID */
export const selectedSection = writable(null);

/** @type {import('svelte/store').Writable<boolean>} Is saving in progress */
export const isSaving = writable(false);

/** @type {import('svelte/store').Writable<boolean>} Is publishing in progress */
export const isPublishing = writable(false);

/** @type {import('svelte/store').Writable<boolean>} Is loading */
export const isLoading = writable(false);

/** @type {import('svelte/store').Writable<string|null>} Last save timestamp */
export const lastSaved = writable(null);

/** @type {import('svelte/store').Writable<object|null>} Validation result */
export const validationResult = writable(null);

/** @type {import('svelte/store').Writable<Array<object>>} Available presets */
export const presets = writable([]);

/** @type {import('svelte/store').Writable<Array<object>>} Company templates */
export const companyTemplates = writable([]);

// =============================================================================
// UNDO/REDO HISTORY
// =============================================================================

const MAX_HISTORY = 50;

/** @type {import('svelte/store').Writable<object[]>} History stack for undo */
export const historyPast = writable([]);

/** @type {import('svelte/store').Writable<object[]>} Future stack for redo */
export const historyFuture = writable([]);

// =============================================================================
// DERIVED STORES
// =============================================================================

/** Dirty flag - true if working schema differs from original */
export const isDirty = derived(
  [workingSchema, originalSchema],
  ([$workingSchema, $originalSchema]) => {
    if (!$workingSchema || !$originalSchema) return false;
    return JSON.stringify($workingSchema) !== JSON.stringify($originalSchema);
  }
);

/** Can undo */
export const canUndo = derived(historyPast, ($past) => $past.length > 0);

/** Can redo */
export const canRedo = derived(historyFuture, ($future) => $future.length > 0);

/** Template status */
export const templateStatus = derived(
  [currentTemplate, isDirty, isSaving],
  ([$currentTemplate, $isDirty, $isSaving]) => {
    if ($isSaving) return 'saving';
    if ($isDirty) return 'unsaved';
    if (!$currentTemplate) return 'none';
    return $currentTemplate.status || 'draft';
  }
);

/** Is in edit mode */
export const isEditMode = derived(editorMode, ($mode) => $mode === 'edit');

// =============================================================================
// SCHEMA UPDATE WITH HISTORY
// =============================================================================

/**
 * Update working schema with history tracking
 * @param {Function} updater - Immer producer function
 */
export function updateSchema(updater) {
  const current = get(workingSchema);
  if (!current) return;

  // Save current state to history
  historyPast.update((past) => {
    const newPast = [...past, JSON.parse(JSON.stringify(current))];
    if (newPast.length > MAX_HISTORY) {
      newPast.shift();
    }
    return newPast;
  });

  // Clear redo stack
  historyFuture.set([]);

  // Apply update using immer
  const newSchema = produce(current, updater);
  workingSchema.set(newSchema);

  // Trigger autosave
  debouncedAutosave();
}

/**
 * Update schema without history (for batch updates)
 * @param {Function} updater
 */
export function updateSchemaNoHistory(updater) {
  const current = get(workingSchema);
  if (!current) return;
  const newSchema = produce(current, updater);
  workingSchema.set(newSchema);
}

// =============================================================================
// UNDO/REDO FUNCTIONS
// =============================================================================

export function undo() {
  const past = get(historyPast);
  const current = get(workingSchema);

  if (past.length === 0) return;

  const previous = past[past.length - 1];
  const newPast = past.slice(0, -1);

  historyPast.set(newPast);
  historyFuture.update((future) => [current, ...future]);
  workingSchema.set(previous);

  debouncedAutosave();
}

export function redo() {
  const future = get(historyFuture);
  const current = get(workingSchema);

  if (future.length === 0) return;

  const next = future[0];
  const newFuture = future.slice(1);

  historyFuture.set(newFuture);
  historyPast.update((past) => [...past, current]);
  workingSchema.set(next);

  debouncedAutosave();
}

// =============================================================================
// EDITOR MODE CONTROL
// =============================================================================

export function enterEditMode() {
  editorMode.set('edit');
}

export function exitEditMode() {
  editorMode.set('view');
  selectedSection.set(null);
}

export function selectSection(sectionId) {
  selectedSection.set(sectionId);
}

export function clearSelection() {
  selectedSection.set(null);
}

// =============================================================================
// API INTEGRATION
// =============================================================================

/**
 * Load preset templates
 */
export async function loadPresets(d) {
  isLoading.set(true);
  try {
    const result = await templateService.getPresets();
    presets.set(result.data || result || []);
  } catch (err) {
    errorNotify('Gagal memuat preset template');
    console.error('Load presets error:', err);
  } finally {
    isLoading.set(false);
  }
}

/**
 * Load company templates
 * @param {number} companyId
 */
export async function loadCompanyTemplates(companyId = null, params = {}) {
  const cid = companyId || get(currentCompanyId);
  if (!cid) {
    errorNotify('Company ID tidak ditemukan');
    return;
  }

  isLoading.set(true);
  try {
    const result = await templateService.getCompanyTemplates(cid);
    companyTemplates.set(result.data || result || []);
    return result;
  } catch (err) {
    errorNotify('Gagal memuat template perusahaan');
    console.error('Load company templates error:', err);
  } finally {
    isLoading.set(false);
  }
}

/**
 * Clone a preset template
 * @param {number} presetId
 * @param {object} data
 */
export async function clonePreset(presetId, data) {
  isLoading.set(true);
  try {
    const result = await templateService.clonePreset(presetId, data);
    if (result) {
      success('Template berhasil di-clone');
      return result;
    }
  } catch (err) {
    errorNotify('Gagal meng-clone template');
    console.error('Clone preset error:', err);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Initialize editor with a template
 * @param {object} template
 */
export function initializeEditor(template) {
  const schema = template.template_schema || template.schema || {};
  currentTemplate.set(template);
  originalSchema.set(JSON.parse(JSON.stringify(schema)));
  workingSchema.set(JSON.parse(JSON.stringify(schema)));
  historyPast.set([]);
  historyFuture.set([]);
  validationResult.set(null);
  lastSaved.set(null);
  editorMode.set('view');
  selectedSection.set(null);
}

/**
 * Reset editor state
 */
export function resetEditor() {
  currentTemplate.set(null);
  originalSchema.set(null);
  workingSchema.set(null);
  historyPast.set([]);
  historyFuture.set([]);
  validationResult.set(null);
  lastSaved.set(null);
  editorMode.set('view');
  selectedSection.set(null);
}

/**
 * Discard changes and reset to original
 */
export function discardChanges() {
  const original = get(originalSchema);
  if (original) {
    workingSchema.set(JSON.parse(JSON.stringify(original)));
    historyPast.set([]);
    historyFuture.set([]);
  }
}

// =============================================================================
// AUTOSAVE (Debounced)
// =============================================================================

async function performAutosave() {
  const template = get(currentTemplate);
  const schema = get(workingSchema);
  const dirty = get(isDirty);

  if (!template || !schema || !dirty) return;

  // Validate required fields
  const companyId = template.company_id;
  const templateId = template.id;

  if (!companyId || !templateId) {
    console.warn('Autosave skipped: missing company_id or template id', { companyId, templateId });
    return;
  }

  isSaving.set(true);
  try {
    const result = await templateService.autosave(
      companyId,
      templateId,
      schema
    );

    if (result && result.template_schema) {
      // Sync with server response
      originalSchema.set(JSON.parse(JSON.stringify(result.template_schema)));
      workingSchema.set(JSON.parse(JSON.stringify(result.template_schema)));
    }

    lastSaved.set(new Date().toISOString());
  } catch (err) {
    errorNotify('Autosave gagal');
    console.error('Autosave error:', err);
  } finally {
    isSaving.set(false);
  }
}

const debouncedAutosave = debounce(performAutosave, 2000);

/**
 * Force immediate save
 */
export async function saveNow() {
  debouncedAutosave.cancel();
  await performAutosave();
}

// =============================================================================
// VALIDATION
// =============================================================================

export async function validateTemplate() {
  isLoading.set(true);
  try {
    const result = await templateService.validate();
    // Backend returns { type, message, data: { valid, errors, warnings } }
    const validation = result?.data || result;
    validationResult.set(validation);

    if (validation.valid) {
      success('Template valid');
    } else {
      if (validation.errors?.length) {
        warning(`Validasi gagal: ${validation.errors[0]}`);
      }
    }

    return validation;
  } catch (err) {
    errorNotify('Gagal memvalidasi template');
    console.error('Validate error:', err);
    return null;
  } finally {
    isLoading.set(false);
  }
}

// =============================================================================
// PUBLISH
// =============================================================================

export async function publishTemplate() {
  const template = get(currentTemplate);
  if (!template) return null;

  // Save first
  await saveNow();

  // Validate
  const validation = await validateTemplate();
  if (!validation?.valid) {
    return null;
  }

  isPublishing.set(true);
  try {
    const result = await templateService.publish(template.company_id, template.id);

    if (result) {
      currentTemplate.update((t) => ({ ...t, status: result.status, version: result.version }));
      success('Template berhasil dipublish');
      return result;
    }
  } catch (err) {
    errorNotify('Gagal mempublish template');
    console.error('Publish error:', err);
    return null;
  } finally {
    isPublishing.set(false);
  }
}

// =============================================================================
// SET DEFAULT
// =============================================================================

export async function setAsDefault() {
  const template = get(currentTemplate);
  if (!template) return false;

  isLoading.set(true);
  try {
    await templateService.setDefault(template.company_id, template.id);
    currentTemplate.update((t) => ({ ...t, is_default: true }));
    success('Template ditetapkan sebagai default');
    return true;
  } catch (err) {
    errorNotify('Gagal menetapkan template sebagai default');
    console.error('Set default error:', err);
    return false;
  } finally {
    isLoading.set(false);
  }
}

// =============================================================================
// TEMPLATE CRUD
// =============================================================================

/**
 * Load a single template
 * @param {number} companyId
 * @param {number} templateId
 */
export async function loadTemplate(companyId, templateId) {
  isLoading.set(true);
  try {
    const result = await templateService.getTemplate(companyId, templateId);
    if (result) {
      initializeEditor(result);
      return result;
    }
  } catch (err) {
    errorNotify('Gagal memuat template');
    console.error('Load template error:', err);
  } finally {
    isLoading.set(false);
  }
}

/**
 * Create a new template
 * @param {number} companyId
 * @param {object} data - { name, description, document_type, template_schema, is_default }
 */
export async function createTemplate(companyId, data) {
  isLoading.set(true);
  try {
    const result = await templateService.createTemplate(companyId, data);
    if (result) {
      success('Template berhasil dibuat');
      return result;
    }
  } catch (err) {
    errorNotify('Gagal membuat template');
    console.error('Create template error:', err);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Update template metadata (not schema)
 * @param {object} data - { name, description, is_default }
 */
export async function updateTemplateMetadata(data) {
  const template = get(currentTemplate);
  if (!template) return null;

  isLoading.set(true);
  try {
    const result = await templateService.updateTemplate(template.company_id, template.id, data);
    if (result) {
      currentTemplate.update((t) => ({ ...t, ...data }));
      success('Template berhasil diupdate');
      return result;
    }
  } catch (err) {
    errorNotify('Gagal mengupdate template');
    console.error('Update template error:', err);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Delete current template
 */
export async function deleteTemplate() {
  const template = get(currentTemplate);
  if (!template) return false;

  isLoading.set(true);
  try {
    await templateService.deleteTemplate(template.company_id, template.id);
    resetEditor();
    success('Template berhasil dihapus');
    return true;
  } catch (err) {
    errorNotify('Gagal menghapus template');
    console.error('Delete template error:', err);
    return false;
  } finally {
    isLoading.set(false);
  }
}

/**
 * Clone current template
 * @param {object} data - { name, description }
 */
export async function cloneCurrentTemplate(data) {
  const template = get(currentTemplate);
  if (!template) return null;

  isLoading.set(true);
  try {
    const result = await templateService.cloneTemplate(template.company_id, template.id, data);
    if (result) {
      success('Template berhasil di-clone');
      return result;
    }
  } catch (err) {
    errorNotify('Gagal meng-clone template');
    console.error('Clone template error:', err);
    throw err;
  } finally {
    isLoading.set(false);
  }
}

// =============================================================================
// VERSION MANAGEMENT
// =============================================================================

/** @type {import('svelte/store').Writable<Array<object>>} Template versions */
export const templateVersions = writable([]);

/**
 * Load version history
 */
export async function loadVersions() {
  const template = get(currentTemplate);
  if (!template) return;

  isLoading.set(true);
  try {
    const result = await templateService.getVersions(template.company_id, template.id);
    templateVersions.set(result.data || result || []);
    return result;
  } catch (err) {
    errorNotify('Gagal memuat versi template');
    console.error('Load versions error:', err);
  } finally {
    isLoading.set(false);
  }
}

/**
 * Revert to a specific version
 * @param {number} version
 */
export async function revertToVersion(version) {
  const template = get(currentTemplate);
  if (!template) return null;

  isLoading.set(true);
  try {
    const result = await templateService.revertVersion(template.company_id, template.id, version);
    if (result) {
      // Reinitialize editor with reverted template
      initializeEditor(result);
      success(`Template dikembalikan ke versi ${version}`);
      return result;
    }
  } catch (err) {
    errorNotify('Gagal mengembalikan versi template');
    console.error('Revert version error:', err);
    return null;
  } finally {
    isLoading.set(false);
  }
}

// =============================================================================
// SECTION HELPERS
// =============================================================================

/**
 * Toggle section visibility
 * @param {string} sectionPath - e.g., 'header.logo' or 'table.columns.0'
 */
export function toggleSectionVisibility(sectionPath) {
  updateSchema((draft) => {
    const parts = sectionPath.split('.');
    let target = draft;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    if (!target[lastKey]) {
      target[lastKey] = { enabled: false };
    } else if (typeof target[lastKey] === 'object') {
      target[lastKey].enabled = !target[lastKey].enabled;
    }
  });
}

/**
 * Update a specific section property
 * @param {string} sectionPath
 * @param {string} property
 * @param {any} value
 */
export function updateSectionProperty(sectionPath, property, value) {
  updateSchema((draft) => {
    const parts = sectionPath.split('.');
    let target = draft;
    for (const part of parts) {
      if (!target[part]) target[part] = {};
      target = target[part];
    }
    target[property] = value;
  });
}

/**
 * Reorder columns in table
 * @param {string} tablePath - e.g., 'table' or 'items'
 * @param {number} oldIndex
 * @param {number} newIndex
 */
export function reorderColumns(tablePath, oldIndex, newIndex) {
  if (!tablePath) return;

  updateSchema((draft) => {
    const parts = tablePath.split('.');
    let target = draft;
    for (const part of parts) {
      if (!target?.[part]) return;
      target = target[part];
    }
    if (target?.columns && Array.isArray(target.columns)) {
      const [removed] = target.columns.splice(oldIndex, 1);
      target.columns.splice(newIndex, 0, removed);
    }
  });
}

/**
 * Update style property
 * @param {string} property
 * @param {any} value
 */
export function updateStyle(property, value) {
  updateSchema((draft) => {
    if (!draft.styles) draft.styles = {};
    draft.styles[property] = value;
  });
}

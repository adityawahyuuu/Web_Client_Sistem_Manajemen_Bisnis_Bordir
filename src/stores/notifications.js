import { writable } from 'svelte/store';

// =============================================================================
// TYPES
// =============================================================================

/**
 * @typedef {Object} Notification
 * @property {number} id
 * @property {string} message
 * @property {'info' | 'success' | 'error' | 'warning'} type
 */

/**
 * @typedef {Object} ConfirmDialogState
 * @property {string} message
 * @property {(value: boolean) => void} resolve
 */

// =============================================================================
// STORES
// =============================================================================

/** @type {import('svelte/store').Writable<Array<Notification>>} */
export const notifications = writable(([]));

// ── Confirm dialog ─────────────────────────────────────────────
/** @type {import('svelte/store').Writable<ConfirmDialogState|null>} */
export const confirmState = writable((null));

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Show confirm dialog
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function confirmDialog(message) {
  return new Promise((resolve) => {
    confirmState.set(({ message, resolve }));
  });
}

let notificationId = 0;

/**
 * Add notification to store
 * @param {string} message
 * @param {'info' | 'success' | 'error' | 'warning'} [type]
 * @param {number} [duration]
 * @returns {number}
 */
export function addNotification(message, type = 'info', duration = 3000) {
  const id = ++notificationId;
  const notification = ({ id, message, type });

  notifications.update((list) => [...list, notification]);

  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }

  return id;
}

/**
 * Remove notification from store
 * @param {number} id
 * @returns {void}
 */
export function removeNotification(id) {
  notifications.update((list) => list.filter((n) => n.id !== id));
}

/**
 * Add success notification
 * @param {string} message
 * @param {number} [duration]
 * @returns {number}
 */
export function success(message, duration = 3000) {
  return addNotification(message, 'success', duration);
}

/**
 * Add error notification
 * @param {string} message
 * @param {number} [duration]
 * @returns {number}
 */
export function error(message, duration = 5000) {
  return addNotification(message, 'error', duration);
}

/**
 * Add info notification
 * @param {string} message
 * @param {number} [duration]
 * @returns {number}
 */
export function info(message, duration = 3000) {
  return addNotification(message, 'info', duration);
}

/**
 * Add warning notification
 * @param {string} message
 * @param {number} [duration]
 * @returns {number}
 */
export function warning(message, duration = 4000) {
  return addNotification(message, 'warning', duration);
}

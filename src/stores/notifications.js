import { writable } from 'svelte/store';

export const notifications = writable([]);

// ── Confirm dialog ─────────────────────────────────────────────
export const confirmState = writable(null);

export function confirmDialog(message) {
  return new Promise(resolve => {
    confirmState.set({ message, resolve });
  });
}

let notificationId = 0;

export function addNotification(message, type = 'info', duration = 3000) {
  const id = ++notificationId;
  const notification = { id, message, type };

  notifications.update(list => [...list, notification]);

  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }

  return id;
}

export function removeNotification(id) {
  notifications.update(list => list.filter(n => n.id !== id));
}

export function success(message, duration = 3000) {
  return addNotification(message, 'success', duration);
}

export function error(message, duration = 5000) {
  return addNotification(message, 'error', duration);
}

export function info(message, duration = 3000) {
  return addNotification(message, 'info', duration);
}

export function warning(message, duration = 4000) {
  return addNotification(message, 'warning', duration);
}

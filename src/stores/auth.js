import { writable } from 'svelte/store';
import authService from '../services/auth.service.js';

/**
 * SECURITY: User data stored in memory only (Svelte store)
 * No sensitive data in localStorage to prevent XSS attacks
 * Tokens stored securely in memory via tokenStorage service
 */

export const user = writable(null);
export const isAuthenticated = writable(authService.isLoggedIn());
export const loading = writable(false);

export async function login(email, password) {
  loading.set(true);
  try {
    const result = await authService.login(email, password);
    user.set(result.user);
    isAuthenticated.set(true);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message || 'Email atau password salah' };
  } finally {
    loading.set(false);
  }
}

export async function logout() {
  try {
    await authService.logout();
  } catch (error) {
    console.error('Logout error:', error);
  }
  user.set(null);
  isAuthenticated.set(false);
}

export async function getProfile() {
  try {
    const profile = await authService.getProfile();
    if (profile) {
      user.update(u => ({
        ...u,
        fullName: profile.full_name || u?.fullName,
        role: profile.role || u?.role
      }));
    }
    return profile;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

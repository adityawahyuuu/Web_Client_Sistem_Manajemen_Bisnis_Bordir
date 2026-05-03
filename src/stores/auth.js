import { writable } from 'svelte/store';
import authService from '../services/auth.service.js';
import api from '../services/api.js';
import { isPublicRoute } from '../lib/router.js';

/**
 * SECURITY: User data stored in memory only (Svelte store)
 * No sensitive data in localStorage to prevent XSS attacks
 * Tokens stored securely in memory via tokenStorage service
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} email
 * @property {string} fullName
 * @property {string} role
 */

/**
 * @typedef {Object} Profile
 * @property {number} id
 * @property {string} email
 * @property {string} [full_name]
 * @property {string} [fullName]
 * @property {string} [role]
 */

/**
 * @type {import('svelte/store').Writable<User|null>}
 */
export const user = writable((null));

export const isAuthenticated = writable(false);
export const loading = writable(false);
export const authInitializing = writable(true);

/**
 * Initialize auth state on app startup.
 * Attempts to restore session via httpOnly refresh token cookie.
 */
export async function initAuth() {
  // Skip refresh attempt on public routes (no session to restore)
  const checkIsPublicRoute = typeof window !== 'undefined' &&
    isPublicRoute(window.location.pathname);
  
  if (checkIsPublicRoute) {
    authInitializing.set(false);
    return;
  }

  // If already has valid token in memory
  if (authService.isLoggedIn()) {
    isAuthenticated.set(true);
    authInitializing.set(false);
    return;
  }

  try {
    // Attempt to get new access token using httpOnly refresh token cookie
    const refreshed = await api.refreshAccessToken();
    if (refreshed) {
      isAuthenticated.set(true);
      // Load user profile after restoring session
      try {
        /** @type {any|Profile|null} */
        const profileData = await authService.getProfile();
        const profile = (profileData);
        if (profile) {
          user.set(({
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name || profile.fullName || '',
            role: profile.role || 'user'
          }));
        }
      } catch (e) {
        // Profile fetch failed but token is valid, continue authenticated
      }
    }
  } catch (e) {
    // No valid refresh token cookie — user must login
  } finally {
    authInitializing.set(false);
  }
}

/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, user?: User, error?: string}>}
 */
export async function login(email, password) {
  loading.set(true);
  try {
    const result = await authService.login(email, password);
    /** @type {User|any} */
    const userData = (result.user);
    user.set(userData);
    isAuthenticated.set(true);
    return { success: true, user: userData };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email atau password salah';
    return { success: false, error: message };
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

/**
 * Load and update user profile
 * @returns {Promise<any>}
 */
export async function getProfile() {
  try {
    const profileData = await authService.getProfile();
    const profile = /** @type {Profile|null} */ (profileData);
    if (profile) {
      user.update((u) => {
        if (!u) return null;
        return {
          id: u.id,
          email: u.email,
          fullName: profile.full_name || u.fullName,
          role: profile.role || u.role
        };
      });
    }
    return profile;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

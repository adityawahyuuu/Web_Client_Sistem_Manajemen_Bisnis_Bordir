import { writable } from 'svelte/store';
import authService from '../services/auth.service.js';
import api from '../services/api.js';

/**
 * SECURITY: User data stored in memory only (Svelte store)
 * No sensitive data in localStorage to prevent XSS attacks
 * Tokens stored securely in memory via tokenStorage service
 */

export const user = writable(null);
export const isAuthenticated = writable(false);
export const loading = writable(false);
export const authInitializing = writable(true);

/**
 * Initialize auth state on app startup.
 * Attempts to restore session via httpOnly refresh token cookie.
 */
export async function initAuth() {
  // Skip refresh attempt on public routes (no session to restore)
  const publicRoutes = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
  const isPublicRoute = typeof window !== 'undefined' &&
    publicRoutes.some(route => window.location.pathname.startsWith(route));
  
  if (isPublicRoute) {
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
        const profile = await authService.getProfile();
        if (profile) {
          user.set({
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name || profile.fullName || '',
            role: profile.role || 'user'
          });
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

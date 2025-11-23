import { writable } from 'svelte/store';
import authService from '../services/auth.service.js';

const storedUser = typeof localStorage !== 'undefined'
  ? JSON.parse(localStorage.getItem('user') || 'null')
  : null;

export const user = writable(storedUser);
export const isAuthenticated = writable(!!storedUser && authService.isLoggedIn());
export const loading = writable(false);

user.subscribe(value => {
  if (typeof localStorage !== 'undefined') {
    if (value) {
      localStorage.setItem('user', JSON.stringify(value));
    } else {
      localStorage.removeItem('user');
    }
  }
});

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

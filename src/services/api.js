import tokenStorage from './tokenStorage.js';
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';

class ApiService {
  constructor() {
    this.baseUrl = window.location.origin + API_PREFIX;
    this._refreshPromise = null;
  }

  /** @returns {string|null} */
  getAuthToken() {
    return tokenStorage.getAccessToken();
  }

  /**
   * Store access token in memory and schedule proactive refresh.
   * @param {string} accessToken
   * @param {number} expiresIn - seconds
   */
  setTokens(accessToken, expiresIn) {
    tokenStorage.setAccessToken(accessToken, expiresIn);
    tokenStorage.scheduleRefresh(() => this.refreshAccessToken());
  }

  clearTokens() {
    tokenStorage.clearTokens();
    this._refreshPromise = null;
  }

  /** @returns {boolean} */
  isAuthenticated() {
    return tokenStorage.hasValidToken();
  }

  /**
   * Refresh access token via httpOnly cookie.
   * Deduplicates concurrent calls.
   * @returns {Promise<boolean>}
   */
  async refreshAccessToken() {
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) return false;

        const responseJson = await response.json();

        if (responseJson.type === 'success' && responseJson.data.auth) {
          this.setTokens(responseJson.data.auth.accessToken, responseJson.data.auth.expiresIn);
          return true;
        }

        return false;
      } catch {
        return false;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  }

  /**
   * Central request method with automatic 401 retry.
   */
  async request(endpoint, options = {}) {
    const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh-token');

    // Proactive: refresh before request if token is expiring soon
    if (!isAuthEndpoint && tokenStorage.isExpiringSoon()) {
      await this.refreshAccessToken();
    }

    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    /** @type {RequestInit} */
    const fetchOptions = {
      method: options.method || 'GET',
      headers,
      credentials: 'include'
    };

    if (options.body && typeof options.body === 'object') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (isJson) {
        const data = await response.json();

        if (!response.ok) {
          // 401 — attempt one refresh + retry (skip if already retried or auth endpoint)
          if (response.status === 401 && !options._isRetry && !isAuthEndpoint) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
              return this.request(endpoint, { ...options, _isRetry: true });
            }
            // Refresh failed — clear session, redirect to login
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }

          throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiService();
export default api;

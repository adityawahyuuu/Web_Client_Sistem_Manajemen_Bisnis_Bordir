import tokenStorage from './tokenStorage.js';
import { withBasePath } from '../lib/router.js';

const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/patchwork/api';
const API_BASE_URL = import.meta.env.VITE_API_BASEURI || 'http://localhost:5090';

/**
 * @typedef {Object} RequestOptions
 * @property {string} [method] - HTTP method
 * @property {Object} [headers] - Custom headers
 * @property {Object} [body] - Request body
 * @property {boolean} [_isRetry] - Internal retry flag
 */

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL + API_PREFIX;
    this._refreshPromise = null;
  }

  /** @returns {string|null} */
  getAuthToken() {
    return tokenStorage.getAccessToken();
  }

  /**
   * Store access token in memory and schedule proactive refresh.
   * @param {string} accessToken - Access token
   * @param {number} expiresIn - Token expiration time in seconds
   * @returns {void}
   */
  setTokens(accessToken, expiresIn) {
    tokenStorage.setAccessToken(accessToken, expiresIn);
    tokenStorage.scheduleRefresh(() => this.refreshAccessToken());
  }

  /**
   * Clear all stored tokens
   * @returns {void}
   */
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
   * @param {string} endpoint - API endpoint path
   * @param {RequestOptions} options - Request options
   * @returns {Promise<any>} API response data
   */
  async request(endpoint, options = {}) {
    const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh-token');

    // Proactive: refresh before request if token is expiring soon
    if (!isAuthEndpoint && tokenStorage.isExpiringSoon()) {
      await this.refreshAccessToken();
    }

    const url = `${this.baseUrl}${endpoint}`;

    /** @type {Record<string, string>} */
    const headers = {};
    headers['Content-Type'] = 'application/json';

    if (options.headers && typeof options.headers === 'object') {
      Object.assign(headers, options.headers);
    }

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
              window.location.href = withBasePath('/login');
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

  /**
   * GET request
   * @param {string} endpoint - API endpoint path
   * @param {RequestOptions} options - Request options
   * @returns {Promise<any>} API response data
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint path
   * @param {Object} body - Request body
   * @param {RequestOptions} options - Request options
   * @returns {Promise<any>} API response data
   */
  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint path
   * @param {Object} body - Request body
   * @param {RequestOptions} options - Request options
   * @returns {Promise<any>} API response data
   */
  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint path
   * @param {Object} body - Request body
   * @param {RequestOptions} options - Request options
   * @returns {Promise<any>} API response data
   */
  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint path
   * @param {RequestOptions} options - Request options
   * @returns {Promise<any>} API response data
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiService();
export default api;

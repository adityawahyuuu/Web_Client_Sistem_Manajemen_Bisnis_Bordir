import { API_BASE_URL } from './config.js';
import tokenStorage from './tokenStorage.js';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.refreshTokenPromise = null;
  }

  /**
   * Get access token from secure memory storage
   * @returns {string|null}
   */
  getAuthToken() {
    return tokenStorage.getAccessToken();
  }

  /**
   * Set tokens securely (tokens stored in memory)
   * @param {string} accessToken - JWT access token
   * @param {number} expiresIn - Token expiration in seconds
   * @param {string} refreshToken - Optional refresh token for manual refresh
   */
  setTokens(accessToken, expiresIn, refreshToken) {
    tokenStorage.setAccessToken(accessToken, expiresIn);
    if (refreshToken) {
      tokenStorage.setRefreshToken(refreshToken);
    }
  }

  /**
   * Get refresh token from memory
   * @returns {string|null}
   */
  getRefreshToken() {
    return tokenStorage.getRefreshToken();
  }

  /**
   * Clear all tokens from memory
   */
  clearTokens() {
    tokenStorage.clearTokens();
    this.refreshTokenPromise = null;
  }

  /**
   * Check if user has valid token
   * @returns {boolean}
   */
  isAuthenticated() {
    return tokenStorage.hasValidToken();
  }

  /**
   * Refresh access token using httpOnly refresh token cookie
   * @returns {Promise<boolean>} - True if refresh successful
   */
  async refreshAccessToken() {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      try {
        // Call refresh endpoint (backend should read refresh token from httpOnly cookie)
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();

        if (data.type === 'success' && data.auth) {
          const { accessToken, expiresIn, refreshToken } = data.auth;
          this.setTokens(accessToken, expiresIn, refreshToken);
          return true;
        }

        return false;
      } catch (error) {
        console.error('Token refresh error:', error);
        this.clearTokens();
        return false;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  async request(endpoint, options = {}) {
    // Skip token refresh for login/refresh endpoints
    const skipRefresh = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh');

    // Check if token needs refresh before making request
    if (!skipRefresh && tokenStorage.shouldRefreshToken()) {
      await this.refreshAccessToken();
    }

    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add JWT Bearer token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Build fetch config
    const fetchOptions = {
      method: options.method || 'GET',
      headers,
      credentials: /** @type {RequestCredentials} */ ('include')
    };

    // Add body if present
    if (options.body && typeof options.body === 'object') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();

        // If response is not ok, throw with API message
        if (!response.ok) {
          // Handle 401 Unauthorized - try to refresh token once
          if (response.status === 401 && !skipRefresh) {
            const refreshed = await this.refreshAccessToken();

            if (refreshed) {
              // Retry original request with new token
              return this.request(endpoint, { ...options, _isRetry: true });
            } else {
              // Refresh failed, clear tokens and redirect to login
              this.clearTokens();
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
            }
          }

          throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
      }

      // Non-JSON response
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);

      // Don't retry if this was already a retry
      if (error.message.includes('401') && !options._isRetry && !skipRefresh) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.request(endpoint, { ...options, _isRetry: true });
        }
      }

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

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiService();
export default api;

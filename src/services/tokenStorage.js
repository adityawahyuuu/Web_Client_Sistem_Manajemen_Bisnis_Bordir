/**
 * Secure Token Storage Service
 * Based on OWASP JWT Security Recommendations
 *
 * Security measures:
 * 1. Tokens stored in memory (not localStorage - XSS vulnerable)
 * 2. Automatic cleanup on page unload
 * 3. Token expiration tracking
 * 4. Refresh token should be in httpOnly cookie (handled by backend)
 */

class TokenStorage {
  constructor() {
    // Store tokens in private closure variables (memory-only)
    this._accessToken = null;
    this._refreshToken = null; // For manual refresh endpoint
    this._tokenExpiry = null;
    this._refreshTimer = null;

    // Clean up tokens when page unloads
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearTokens();
      });
    }
  }

  /**
   * Set access token with expiration time
   * @param {string} token - JWT access token
   * @param {number} expiresIn - Expiration time in seconds
   */
  setAccessToken(token, expiresIn) {
    this._accessToken = token;

    if (expiresIn) {
      // Calculate expiry timestamp (convert seconds to milliseconds)
      this._tokenExpiry = Date.now() + (expiresIn * 1000);
    }
  }

  /**
   * Get current access token if valid
   * @returns {string|null} - Access token or null if expired/not set
   */
  getAccessToken() {
    // Check if token exists and is not expired
    if (this._accessToken && this._tokenExpiry) {
      if (Date.now() >= this._tokenExpiry) {
        // Token expired, clear it
        this.clearTokens();
        return null;
      }
    }

    return this._accessToken;
  }

  /**
   * Set refresh token (for manual refresh endpoint)
   * @param {string} token - Refresh token
   */
  setRefreshToken(token) {
    this._refreshToken = token;
  }

  /**
   * Get refresh token
   * @returns {string|null}
   */
  getRefreshToken() {
    return this._refreshToken;
  }

  /**
   * Check if access token is valid and not expired
   * @returns {boolean}
   */
  hasValidToken() {
    return !!this.getAccessToken();
  }

  /**
   * Check if token will expire soon (within 5 minutes)
   * @returns {boolean}
   */
  shouldRefreshToken() {
    if (!this._tokenExpiry) return false;

    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    const timeUntilExpiry = this._tokenExpiry - Date.now();

    return timeUntilExpiry < fiveMinutes && timeUntilExpiry > 0;
  }

  /**
   * Get time until token expires (in milliseconds)
   * @returns {number}
   */
  getTimeUntilExpiry() {
    if (!this._tokenExpiry) return 0;
    return Math.max(0, this._tokenExpiry - Date.now());
  }

  /**
   * Clear all tokens from memory
   */
  clearTokens() {
    this._accessToken = null;
    this._refreshToken = null;
    this._tokenExpiry = null;

    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  /**
   * Schedule automatic token refresh
   * @param {Function} refreshCallback - Function to call when token needs refresh
   */
  scheduleTokenRefresh(refreshCallback) {
    // Clear existing timer
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
    }

    if (!this._tokenExpiry) return;

    // Schedule refresh 2 minutes before expiry
    const twoMinutes = 2 * 60 * 1000;
    const timeUntilRefresh = Math.max(0, this._tokenExpiry - Date.now() - twoMinutes);

    this._refreshTimer = setTimeout(() => {
      if (this.hasValidToken()) {
        refreshCallback();
      }
    }, timeUntilRefresh);
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorage();
export default tokenStorage;

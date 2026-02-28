/**
 * Secure Token Storage Service
 *
 * Access token stored in memory only (not localStorage/sessionStorage - XSS vulnerable).
 * Refresh token handled exclusively by backend via httpOnly cookie.
 * Only explicit logout clears session.
 */

class TokenStorage {
  constructor() {
    this._accessToken = null;
    this._tokenExpiry = null;
    this._refreshTimer = null;
  }

  /**
   * @param {string} token - JWT access token
   * @param {number} expiresIn - Expiration time in seconds
   */
  setAccessToken(token, expiresIn) {
    this._accessToken = token;
    this._tokenExpiry = Date.now() + expiresIn * 1000;
  }

  /** @returns {string|null} */
  getAccessToken() {
    if (this._tokenExpiry && Date.now() >= this._tokenExpiry) {
      this._accessToken = null;
      this._tokenExpiry = null;
      return null;
    }
    return this._accessToken;
  }

  /** @returns {boolean} */
  hasValidToken() {
    return !!this.getAccessToken();
  }

  /** @returns {boolean} */
  isExpiringSoon() {
    if (!this._tokenExpiry) return false;
    const bufferMs = 2 * 60 * 1000; // 2 minutes
    return (this._tokenExpiry - Date.now()) < bufferMs && (this._tokenExpiry - Date.now()) > 0;
  }

  /**
   * Schedule proactive refresh before token expires.
   * @param {() => Promise<boolean>} refreshCallback
   */
  scheduleRefresh(refreshCallback) {
    this.cancelScheduledRefresh();
    if (!this._tokenExpiry) return;

    // Refresh 2 minutes before expiry
    const delay = Math.max(0, this._tokenExpiry - Date.now() - 2 * 60 * 1000);

    this._refreshTimer = setTimeout(async () => {
      if (this.hasValidToken()) {
        await refreshCallback();
      }
    }, delay);
  }

  cancelScheduledRefresh() {
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  clearTokens() {
    this._accessToken = null;
    this._tokenExpiry = null;
    this.cancelScheduledRefresh();
  }
}

export const tokenStorage = new TokenStorage();
export default tokenStorage;

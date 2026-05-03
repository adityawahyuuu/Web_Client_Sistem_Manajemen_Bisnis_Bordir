import api from './api.js';

export const authService = {
  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{user: Object, expiresIn: number}>} Login response
   */
  async login(email, password) {
    // Backend sets httpOnly cookie for refresh token automatically
    const response = await api.post('/auth/login', { email, password });

    if (response.type === 'success' && response.auth) {
      const { accessToken, expiresIn } = response.auth;
      // Only store access token in memory — refresh token lives in httpOnly cookie
      api.setTokens(accessToken, expiresIn);

      const userData = response.data || {};

      return {
        user: {
          id: userData.id,
          email: userData.email,
          fullName: userData.full_name || userData.fullName || '',
          role: userData.role || 'user'
        },
        expiresIn
      };
    }

    throw new Error(response.message || 'Login failed');
  },

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      // Backend clears httpOnly refresh token cookie
      await api.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    }
    api.clearTokens();
  },

  /**
   * Get current user profile
   * @returns {Promise<Object|null>} User profile or null if error
   */
  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      return response.data || response;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

  /**
   * Register new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} repeatPassword - Repeat password confirmation
   * @param {string} name - User full name
   * @returns {Promise<Object>} Registration response
   */
  async register(email, password, repeatPassword, name) {
    const response = await api.post('/auth/register', {
      email,
      password,
      repeat_password: repeatPassword,
      name
    });

    if (response.type === 'success') {
      return response;
    }

    throw new Error(response.message || 'Registration failed');
  },

  /**
   * Verify email with OTP code
   * @param {string} email - User email
   * @param {string} otpCode - OTP code from email
   * @returns {Promise<Object>} Verification response
   */
  async verifyEmail(email, otpCode) {
    const response = await api.post('/auth/verify-email', {
      email,
      otp_code: otpCode
    });

    if (response.type === 'success') {
      return response;
    }

    throw new Error(response.message || 'Email verification failed');
  },

  /**
   * Resend OTP code to email
   * @param {string} email - User email
   * @returns {Promise<Object>} Resend response
   */
  async resendOtp(email) {
    const response = await api.post('/auth/resend-otp', { email });

    if (response.type === 'success') {
      return response;
    }

    throw new Error(response.message || 'Failed to resend OTP');
  },

  /**
   * Send password reset link to email
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset link response
   */
  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });

    if (response.type === 'success') {
      return response;
    }

    throw new Error(response.message || 'Failed to send reset link');
  },

  /**
   * Reset password with token
   * @param {string} token - Reset token from email link
   * @param {string} password - New password
   * @param {string} repeatPassword - Repeat password confirmation
   * @returns {Promise<Object>} Reset response
   */
  async resetPassword(token, password, repeatPassword) {
    const response = await api.post('/auth/reset-password', {
      token,
      password,
      repeat_password: repeatPassword
    });

    if (response.type === 'success') {
      return response;
    }

    throw new Error(response.message || 'Password reset failed');
  },

  /**
   * Check if user is logged in
   * @returns {boolean}
   */
  isLoggedIn() {
    return api.isAuthenticated();
  },

  /**
   * Get all users
   * @returns {Promise<Object|Array<any>>} Users data
   */
  async getAllUsers() {
    const response = await api.get('/auth/users');
    return response.data || response;
  },

  /**
   * Set user role
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @returns {Promise<Object>} Updated user data
   */
  async setUserRole(userId, role) {
    const response = await api.put(`/auth/users/${userId}/role`, { role });
    return response.data || response;
  }
};

export default authService;

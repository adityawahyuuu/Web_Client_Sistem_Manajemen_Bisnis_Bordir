import api from './api.js';

export const authService = {
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

  async logout() {
    try {
      // Backend clears httpOnly refresh token cookie
      await api.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    }
    api.clearTokens();
  },

  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      return response.data || response;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

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

  async resendOtp(email) {
    const response = await api.post('/auth/resend-otp', { email });

    if (response.type === 'success') {
      return response;
    }

    throw new Error(response.message || 'Failed to resend OTP');
  },

  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });

    if (response.type === 'success') {
      return response;
    }

    throw new Error(response.message || 'Failed to send reset link');
  },

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

  isLoggedIn() {
    return api.isAuthenticated();
  },

  async getAllUsers() {
    const response = await api.get('/auth/users');
    return response.data || response;
  },

  async setUserRole(userId, role) {
    const response = await api.put(`/auth/users/${userId}/role`, { role });
    return response.data || response;
  }
};

export default authService;

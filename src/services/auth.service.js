import api from './api.js';

export const authService = {
  // Login with API
  async login(email, password) {
    try {
      // Call /api/v1/auth/login endpoint
      // Backend should set httpOnly cookie for refresh token
      const response = await api.post('/auth/login', { email, password });

      // Check response type
      if (response.type === 'success' && response.auth) {
        const { accessToken, expiresIn, refreshToken } = response.auth;

        // Store tokens securely in memory (not localStorage!)
        // Both access and refresh tokens stored in memory
        api.setTokens(accessToken, expiresIn, refreshToken);

        // Extract user data from response
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

      // Handle error/fail responses
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      // Fallback to mock for development
      if (error.message.includes('fetch') || error.message.includes('Network') || error.message.includes('Failed')) {
        return this.mockLogin(email, password);
      }
      throw error;
    }
  },

  // Logout
  async logout() {
    try {
      // Call backend logout to clear httpOnly refresh token cookie
      await api.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    }
    // Clear access token from memory
    api.clearTokens();
  },

  // Get user profile from backend
  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      return response.data || response;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

  // Register new user
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

  // Verify email with OTP
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

  // Resend OTP code
  async resendOtp(email) {
    const response = await api.post('/auth/resend-otp', { email });

    if (response.type === 'success') {
      return response;
    }

    throw new Error(response.message || 'Failed to resend OTP');
  },

  // Request password reset
  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });

    if (response.type === 'success') {
      return response;
    }

    throw new Error(response.message || 'Failed to send reset link');
  },

  // Reset password with token
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

  // Refresh access token using refresh token
  async refreshToken(refreshToken) {
    // Use stored refresh token if not provided
    const tokenToUse = refreshToken || api.getRefreshToken();

    if (!tokenToUse) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh-token', { refreshToken: tokenToUse });

    if (response.type === 'success' && response.auth) {
      const { accessToken, expiresIn, refreshToken: newRefreshToken } = response.auth;
      api.setTokens(accessToken, expiresIn, newRefreshToken);
      return response;
    }

    throw new Error(response.message || 'Token refresh failed');
  },

  // Check if logged in (using secure memory-based token)
  isLoggedIn() {
    return api.isAuthenticated();
  },

  // Get all users (admin only)
  async getAllUsers() {
    const response = await api.get('/auth/users');
    return response.data || response;
  },

  // Set user role (admin only)
  async setUserRole(userId, role) {
    const response = await api.put(`/auth/users/${userId}/role`, { role });
    return response.data || response;
  },

  // Mock login for development without API
  async mockLogin(email, password) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUsers = [
      { id: '1', email: 'admin@bordir.com', password: 'admin123', fullName: 'Administrator', role: 'admin' },
      { id: '2', email: 'user@bordir.com', password: 'user123', fullName: 'Staff User', role: 'user' }
    ];

    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Email atau password salah');
    }

    const { password: _, ...userData } = user;

    // Set mock tokens with expiry (1 hour)
    const mockExpiresIn = 3600; // 1 hour in seconds
    const mockRefreshToken = 'mock-refresh-' + userData.id;
    api.setTokens('mock-token-' + userData.id, mockExpiresIn, mockRefreshToken);

    return { user: userData, expiresIn: mockExpiresIn };
  }
};

export default authService;
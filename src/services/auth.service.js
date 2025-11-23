import api from './api.js';

export const authService = {
  // Login with API
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });

    if (response.type === 'success' && response.data) {
      const { accessToken, refreshToken, user } = response.data;

      // Store tokens
      api.setTokens(accessToken, refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name || '',
          role: user.role || 'user'
        }
      };
    }

    throw new Error(response.message || 'Login failed');
  },

  // Logout
  async logout() {
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

  // Create profile
  async createProfile(fullName) {
    const response = await api.post('/auth/profile', { full_name: fullName });
    return response.data || response;
  },

  // Refresh token
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh-token', { refreshToken });

    if (response.type === 'success' && response.data) {
      api.setTokens(response.data.accessToken, response.data.refreshToken);
      return response.data;
    }

    throw new Error('Token refresh failed');
  },

  // Check if logged in
  isLoggedIn() {
    return !!api.getAuthToken();
  },

  // Mock login for development without API
  async mockLogin(email, password) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockUsers = [
      { id: '1', email: 'admin@bordir.com', password: 'admin123', fullName: 'Administrator', role: 'admin' },
      { id: '2', email: 'user@bordir.com', password: 'user123', fullName: 'Staff User', role: 'staff' }
    ];

    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Email atau password salah');
    }

    const { password: _, ...userData } = user;

    // Set mock token
    api.setTokens('mock-token-' + userData.id, 'mock-refresh-' + userData.id);

    return { user: userData };
  }
};

export default authService;

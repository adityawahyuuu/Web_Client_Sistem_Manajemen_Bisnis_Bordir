// API Configuration
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';

export const API_BASE_URL = `${BASE_URL}${API_PREFIX}`;

// API Configuration
// In development, Vite proxy handles /api/* -> http://localhost:3000/api/*
// In production, set VITE_API_BASE_URL to the actual backend URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';

export const API_BASE_URL = `${BASE_URL}${API_PREFIX}`;

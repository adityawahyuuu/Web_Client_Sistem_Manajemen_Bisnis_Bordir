/**
 * API Response Type Definitions
 * @typedef {'success' | 'error' | 'fail'} ResponseType
 */

/**
 * Standard API Response Structure
 * @template T
 * @typedef {Object} ApiResponse
 * @property {ResponseType} type - Response type indicator
 * @property {string} message - Response message
 * @property {T | null} data - Response data payload
 * @property {Object} [meta] - Optional metadata for pagination
 * @property {number} [meta.page] - Current page number
 * @property {number} [meta.limit] - Items per page
 * @property {number} [meta.total] - Total items count
 * @property {number} [meta.totalPages] - Total pages count
 * @property {Object} [auth] - Optional authentication data
 * @property {string} [auth.accessToken] - JWT access token
 * @property {string} [auth.refreshToken] - JWT refresh token
 * @property {number} [auth.expiresIn] - Token expiration in seconds
 */

/**
 * Login Response Data
 * @typedef {Object} LoginData
 * @property {Object} user - User information
 * @property {string} user.id - User ID
 * @property {string} user.email - User email
 * @property {string} [user.full_name] - User full name
 * @property {string} [user.role] - User role
 */

export {};

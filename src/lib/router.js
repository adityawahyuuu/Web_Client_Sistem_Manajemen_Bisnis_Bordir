// Router utility with base path support
const BASE_PATH = import.meta.env.VITE_WEB_BASE_PATH || '/patchwork/web';

/**
 * Prepend base path to a route path
 * @param {string} path - Route path
 * @returns {string} Full path with base
 */
export function withBasePath(path) {
  if (!path) return BASE_PATH;
  if (path === '/') return BASE_PATH;
  return `${BASE_PATH}${path}`;
}

/**
 * Remove base path from a full pathname
 * @param {string} pathname - Full pathname
 * @returns {string} Path without base
 */
export function stripBasePath(pathname) {
  if (!pathname) return '/';
  if (pathname.startsWith(BASE_PATH)) {
    return pathname.slice(BASE_PATH.length) || '/';
  }
  return pathname;
}

export const publicRoutes = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password'
];

/**
 * Check if a pathname is a public route
 * @param {string} pathname - Full pathname
 * @returns {boolean} True if public route
 */
export function isPublicRoute(pathname) {
  if (!pathname) return false;
  const path = stripBasePath(pathname);
  return publicRoutes.some(route => path.startsWith(route));
}

export function getBasePath() {
  return BASE_PATH;
}

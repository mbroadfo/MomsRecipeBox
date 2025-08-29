/**
 * Auth middleware for API endpoints
 * Currently a simple implementation for development purposes
 * Should be replaced with proper authentication in production
 */

/**
 * Simple authentication check - all requests are allowed in development mode
 * @param {Object} event - Lambda event object
 * @returns {boolean} - True if authenticated, false otherwise
 */
export function isAuthenticated(event) {
  // In development mode, all requests are allowed
  // In production, this should be replaced with proper authentication using Auth0 or similar
  return true;
}

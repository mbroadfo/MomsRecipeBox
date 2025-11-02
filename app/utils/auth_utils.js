/**
 * Authentication utilities for extracting user information from Lambda events
 */

/**
 * Extract user ID from Lambda event based on deployment mode
 * @param {Object} event - Lambda event object
 * @returns {string|null} User ID if authenticated, null otherwise
 */
export function getUserId(event) {
  // Lambda mode with JWT authorizer - user ID is in principalId
  if (event.requestContext?.authorizer?.principalId) {
    const principalId = event.requestContext.authorizer.principalId;
    console.log('📝 User ID from JWT authorizer:', principalId);
    return principalId;
  }
  
  // Fallback for local/atlas modes - user ID in query parameters
  if (event.queryStringParameters?.user_id) {
    const userId = event.queryStringParameters.user_id;
    console.log('📝 User ID from query parameters:', userId);
    return userId;
  }
  
  // Fallback for POST requests - user ID in body
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      if (body.user_id) {
        console.log('📝 User ID from request body:', body.user_id);
        return body.user_id;
      }
    } catch (e) {
      // Invalid JSON, continue
    }
  }
  
  console.log('⚠️ No user ID found in event');
  return null;
}

/**
 * Require authentication and return user ID
 * @param {Object} event - Lambda event object
 * @returns {string} User ID
 * @throws {Error} If not authenticated
 */
export function requireAuth(event) {
  const userId = getUserId(event);
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}

/**
 * Check if user is authenticated (has valid user ID)
 * @param {Object} event - Lambda event object
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated(event) {
  return getUserId(event) !== null;
}
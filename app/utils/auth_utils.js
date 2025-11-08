/**
 * Authentication utilities for extracting user information from Lambda events
 */
import { createLogger } from './logger.js';

const logger = createLogger('auth_utils');

/**
 * Extract user ID from Lambda event based on deployment mode
 * @param {Object} event - Lambda event object
 * @returns {string|null} User ID if authenticated, null otherwise
 */
export function getUserId(event) {
  // Lambda mode with JWT authorizer - user ID is in principalId
  if (event.requestContext?.authorizer?.principalId) {
    const principalId = event.requestContext.authorizer.principalId;
    logger.debug('User ID from JWT authorizer', { principalId }, event);
    return principalId;
  }
  
  // Fallback for local/atlas modes - user ID in query parameters
  if (event.queryStringParameters?.user_id) {
    const userId = event.queryStringParameters.user_id;
    logger.debug('User ID from query parameters', { userId }, event);
    return userId;
  }
  
  // Fallback for POST requests - user ID in body
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      if (body.user_id) {
        logger.debug('User ID from request body', { userId: body.user_id }, event);
        return body.user_id;
      }
    } catch (e) {
      // Invalid JSON, continue
    }
  }
  
  logger.debug('No user ID found in event', {}, event);
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
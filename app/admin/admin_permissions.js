// Admin permissions and role management for MomsRecipeBox
import { validateLambdaAuth } from './jwt_validator.js';

// Define available roles and their capabilities
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

// Define permissions for each role
export const PERMISSIONS = {
  // User management permissions
  LIST_USERS: 'list_users',
  VIEW_USER_DETAILS: 'view_user_details',
  INVITE_USERS: 'invite_users',
  DELETE_USERS: 'delete_users',
  MODIFY_USER_ROLES: 'modify_user_roles',
  
  // Recipe management permissions
  DELETE_ANY_RECIPE: 'delete_any_recipe',
  MODERATE_COMMENTS: 'moderate_comments',
  VIEW_ALL_RECIPES: 'view_all_recipes',
  
  // System permissions
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SYSTEM: 'manage_system'
};

// Map roles to their permissions
const ADMIN_PERMISSIONS = [
  PERMISSIONS.LIST_USERS,
  PERMISSIONS.VIEW_USER_DETAILS,
  PERMISSIONS.INVITE_USERS,
  PERMISSIONS.DELETE_USERS,
  PERMISSIONS.MODIFY_USER_ROLES,
  PERMISSIONS.DELETE_ANY_RECIPE,
  PERMISSIONS.MODERATE_COMMENTS,
  PERMISSIONS.VIEW_ALL_RECIPES,
  PERMISSIONS.VIEW_ANALYTICS,
  PERMISSIONS.MANAGE_SYSTEM
];

const ROLE_PERMISSIONS = {
  [ROLES.USER]: [],
  [ROLES.ADMIN]: ADMIN_PERMISSIONS
};

/**
 * Check if a user has a specific permission
 * @param {string} userRole - The user's role
 * @param {string} permission - The permission to check
 * @returns {boolean} - Whether the user has the permission
 */
export function hasPermission(userRole, permission) {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 * @param {string} userRole - The user's role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - Whether the user has any of the permissions
 */
export function hasAnyPermission(userRole, permissions) {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if a user has all of the specified permissions
 * @param {string} userRole - The user's role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - Whether the user has all of the permissions
 */
export function hasAllPermissions(userRole, permissions) {
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Lambda middleware to require specific permissions
 * @param {string|string[]} requiredPermissions - Permission(s) required
 * @returns {Function} - Middleware function
 */
export function requirePermissions(requiredPermissions) {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return async function permissionMiddleware(event) {
    try {
      // First validate authentication
      const authResult = await validateLambdaAuth(event);
      
      if (!authResult.isAuthorized) {
        return {
          statusCode: authResult.statusCode,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: authResult.error,
            details: authResult.details,
            code: 'AUTH_FAILED'
          })
        };
      }

      // Check permissions
      const userRole = authResult.role;
      const hasRequiredPermissions = hasAllPermissions(userRole, permissions);
      
      if (!hasRequiredPermissions) {
        console.log(`🚫 User ${authResult.userId} (${userRole}) lacks required permissions: ${permissions.join(', ')}`);
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Insufficient permissions',
            required: permissions,
            userRole: userRole,
            code: 'INSUFFICIENT_PERMISSIONS'
          })
        };
      }

      console.log(`✅ User ${authResult.userId} (${userRole}) has required permissions: ${permissions.join(', ')}`);
      
      // Return auth result for use in handler
      return {
        isAuthorized: true,
        ...authResult
      };

    } catch (error) {
      console.error('❌ Permission check failed:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Permission validation failed',
          details: error.message,
          code: 'PERMISSION_CHECK_FAILED'
        })
      };
    }
  };
}

/**
 * Simple admin check for backward compatibility
 * @param {Object} event - Lambda event
 * @returns {Object} - Authorization result
 */
export async function requireAdmin(event) {
  return await requirePermissions([PERMISSIONS.LIST_USERS])(event);
}

/**
 * Get all permissions for a role
 * @param {string} role - The role to get permissions for
 * @returns {string[]} - Array of permissions
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role exists
 * @param {string} role - The role to check
 * @returns {boolean} - Whether the role exists
 */
export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

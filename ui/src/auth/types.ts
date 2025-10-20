// Admin authentication types and utilities
export interface AdminUser {
  user_id: string;
  email: string;
  firstName: string;
  lastName: string;
  loginCount: number;
  lastLogin: string | null;
  userImage: string | null;
  favoriteCount: number;
  commentCount: number;
  emailVerified: boolean;
  createdAt: string;
  lastUpdated: string;
}

export interface AdminUserStats {
  total_users: number;
  active_users: number;
  new_users_this_month: number;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  stats?: AdminUserStats;
}

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  roles?: string[];
}

export interface InviteUserResponse {
  success: boolean;
  message: string;
  user: {
    user_id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
  };
}

export interface DeleteUserResponse {
  success: boolean;
  message: string;
  deletedUserId: string;
}

// Auth Context Types
export interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  isAdmin: boolean;
  token: string | null;
  login: () => void;
  logout: () => void;
  checkAdminStatus: () => boolean;
}

// Admin role checking utilities
export const checkUserIsAdmin = (user: any): boolean => {
  if (!user) return false;
  
  // Check for admin role in custom claims  
  // Support both namespaces since apps share Auth0 tenant
  const momsRolesClaimKey = `https://momsrecipebox.app/roles`;
  const cruiseRolesClaimKey = `https://cruise-viewer.app/roles`;
  
  // Prefer MomsRecipeBox namespace, fallback to CruiseViewer
  const rolesClaim = user[momsRolesClaimKey] || user[cruiseRolesClaimKey];
  
  let roles: string[] = [];
  if (Array.isArray(rolesClaim)) {
    roles = rolesClaim;
  } else if (typeof rolesClaim === 'object' && rolesClaim?.role) {
    roles = Array.isArray(rolesClaim.role) ? rolesClaim.role : [rolesClaim.role];
  } else if (typeof rolesClaim === 'string') {
    roles = [rolesClaim];
  }
  
  return roles.includes('admin');
};

// Check app_metadata.role as well for fallback
export const checkAppMetadataRole = (user: any): boolean => {
  if (!user) return false;
  return user.app_metadata?.role === 'admin';
};

// Combined admin check
export const isUserAdmin = (user: any): boolean => {
  return checkUserIsAdmin(user) || checkAppMetadataRole(user);
};

export default {
  checkUserIsAdmin,
  checkAppMetadataRole,
  isUserAdmin
};

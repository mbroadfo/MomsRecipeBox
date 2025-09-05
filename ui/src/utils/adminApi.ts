import type { AdminUserListResponse, InviteUserRequest, InviteUserResponse, DeleteUserResponse } from '../auth/types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api.com' 
  : 'http://localhost:3000';

/**
 * Get authorization header with current user token
 */
const getAuthHeaders = (): Record<string, string> => {
  // For now, we'll need to get the token from wherever it's stored
  // This will be updated once we understand your current auth implementation
  const token = localStorage.getItem('auth_token') || '';
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Handle API responses and errors
 */
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Admin API functions
 */
export const adminApi = {
  /**
   * List all users with statistics
   */
  async listUsers(page: number = 1, search?: string): Promise<AdminUserListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: '20'
    });
    
    if (search) {
      params.append('search', search);
    }
    
    const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    return handleResponse(response);
  },

  /**
   * Invite a new user
   */
  async inviteUser(userData: InviteUserRequest): Promise<InviteUserResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/users/invite`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    
    return handleResponse(response);
  },

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<DeleteUserResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    return handleResponse(response);
  },

  /**
   * Test admin API connectivity
   */
  async testConnection(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users?page=1&per_page=1`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        return { status: 'success', message: 'Admin API connection successful' };
      } else {
        return { status: 'error', message: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  },

  /**
   * Test system connectivity (S3, AI services)
   */
  async testSystemStatus(): Promise<{
    overall_status: 'operational' | 'degraded';
    services: {
      s3: { status: string; message: string };
      ai: { status: string; message: string; provider?: string };
    };
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/system-status`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      const data = await handleResponse(response);
      return data;
    } catch (error) {
      // Return a fallback response if the endpoint isn't available
      return {
        overall_status: 'degraded',
        services: {
          s3: { 
            status: 'error', 
            message: error instanceof Error ? error.message : 'System status check failed' 
          },
          ai: { 
            status: 'error', 
            message: 'Unable to check AI service status' 
          }
        }
      };
    }
  }
};

export default adminApi;

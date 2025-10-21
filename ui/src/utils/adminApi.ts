import type { AdminUserListResponse, InviteUserRequest, InviteUserResponse, DeleteUserResponse } from '../auth/types';

// More flexible stats interfaces to match actual API responses
interface BaseStats {
  [key: string]: unknown;
}

interface MongoDBStats extends BaseStats {
  environment?: string;
  totalRecipes?: number;
  connectionTime?: number;
}

interface S3Stats extends BaseStats {
  imageObjects?: number;
  imageSize?: string;
  totalObjects?: number;
  totalSize?: string;
  bucketCount?: number;
  lastBackup?: string;
}

interface APIGatewayStats extends BaseStats {
  responseTime?: string;
  httpStatus?: string;
  requestsPerMinute?: number;
  errorRate?: number;
}

interface LambdaStats extends BaseStats {
  mrbAdminFunctions?: number;
  totalFunctions?: number;
  executionsToday?: number;
}

interface BackupStats extends BaseStats {
  totalBackupFolders?: number;
  lastFull?: string;
  lastIncremental?: string;
  nextScheduled?: string;
}

interface TerraformStats extends BaseStats {
  environment?: string;
  awsConfigured?: boolean;
  lastApply?: string;
  resourceCount?: number;
  driftDetected?: boolean;
}

interface SecurityStats extends BaseStats {
  configurationComplete?: boolean;
  corsEnabled?: boolean;
  sslExpiry?: string;
  auth0Status?: string;
}

interface PerformanceStats extends BaseStats {
  memoryPercentage?: string;
  uptime?: string;
  cdnHitRate?: string;
  avgResponseTime?: string;
  cachingEnabled?: boolean;
}

// Union type for all possible service stats
type ServiceStats = MongoDBStats | S3Stats | APIGatewayStats | LambdaStats | BackupStats | TerraformStats | SecurityStats | PerformanceStats;

interface UserAnalytics {
  success: boolean;
  timestamp: string;
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
  users: {
    totalUsers: number;
    activeContentCreators: number;
    usersWhoFavorited: number;
    usersWhoCommented: number;
    recentActivity: {
      newFavorites: number;
      newComments: number;
    };
  };
  recipes: {
    total: number;
    recentlyCreated: number;
    byVisibility: Record<string, number>;
    mostLiked: Array<{
      _id: string;
      title: string;
      likes_count: number;
      owner_id: string;
    }>;
    averageLikes: number;
  };
  engagement: {
    favorites: {
      total: number;
      recent: number;
      topRecipes: Array<{
        recipeId: string;
        title: string;
        favoriteCount: number;
      }>;
    };
    comments: {
      total: number;
      recent: number;
      topRecipes: Array<{
        recipeId: string;
        title: string;
        commentCount: number;
      }>;
    };
  };
  content: {
    creationTrend: Array<{
      _id: string;
      count: number;
    }>;
    topCreators: Array<{
      _id: string;
      recipeCount: number;
    }>;
    withImages: number;
    imagePercentage: number;
  };
  shoppingLists: {
    totalLists: number;
    recentlyActive: number;
    averageItemsPerList: number;
    totalItems: number;
    checkedItems: number;
    completionRate: number;
  };
  growth: {
    recipes: {
      current: number;
      previous: number;
      growthRate: number;
    };
    favorites: {
      current: number;
      previous: number;
      growthRate: number;
    };
    comments: {
      current: number;
      previous: number;
      growthRate: number;
    };
    dailyActivity: Array<{
      _id: string;
      recipes: number;
    }>;
  };
  [key: string]: unknown;
}

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-api.com' 
  : 'http://localhost:3000';

/**
 * Get authorization header with current user token
 * Token should be passed from React component using useAdminAuth() hook
 */
const getAuthHeaders = (token?: string | null): Record<string, string> => {
  return {
    'Authorization': `Bearer ${token || ''}`,
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
  
  const data = await response.json();
  return data;
};

/**
 * Admin API functions
 */
const adminApi = {
  /**
   * List all users with statistics
   */
  async listUsers(token: string | null, page: number = 1, search?: string): Promise<AdminUserListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: '20'
    });
    
    if (search) {
      params.append('search', search);
    }
    
    const url = `${API_BASE_URL}/api/admin/users?${params}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(token)
    });
    
    return handleResponse(response);
  },

  /**
   * Invite a new user
   */
  async inviteUser(token: string | null, userData: InviteUserRequest): Promise<InviteUserResponse> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/invite`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(userData)
    });
    
    return handleResponse(response);
  },

  /**
   * Delete a user
   */
  async deleteUser(token: string | null, userId: string): Promise<DeleteUserResponse> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
    
    return handleResponse(response);
  },

  /**
   * Test admin API connectivity
   */
  async testConnection(token: string | null): Promise<{ status: string; message: string }> {
    const url = `${API_BASE_URL}/api/admin/users?page=1&per_page=1`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(token)
    });
    
    if (response.ok) {
      return { status: 'success', message: 'Admin API connection successful' };
    } else {
      return { status: 'error', message: `HTTP ${response.status}: ${response.statusText}` };
    }
  },

  /**
   * Test system connectivity (S3, infrastructure only)
   */
  async testSystemStatus(token: string | null): Promise<{
    overall_status: 'operational' | 'degraded';
    services: {
      s3: { status: string; message: string; stats?: S3Stats };
      mongodb?: { status: string; message: string; stats?: MongoDBStats };
      api_gateway?: { status: string; message: string; stats?: APIGatewayStats };
      lambda?: { status: string; message: string; stats?: LambdaStats };
      backup?: { status: string; message: string; stats?: BackupStats };
      terraform?: { status: string; message: string; stats?: TerraformStats };
      security?: { status: string; message: string; stats?: SecurityStats };
      performance?: { status: string; message: string; stats?: PerformanceStats };
    };
    note?: string;
  }> {
    console.log('🔧 AdminAPI: testSystemStatus called');
    
    try {
      const url = `${API_BASE_URL}/api/admin/system-status`;
      console.log('🔧 AdminAPI: Testing system status at', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token)
      });
      
      const data = await handleResponse(response);
      console.log('🔧 AdminAPI: System status received', data);
      return data;
    } catch (error) {
      console.error('🔧 AdminAPI: System status error', error);
      // Return a fallback response if the endpoint isn't available
      return {
        overall_status: 'degraded',
        services: {
          s3: { 
            status: 'error', 
            message: error instanceof Error ? error.message : 'System status check failed' 
          }
        }
      };
    }
  },

  /**
   * Test individual infrastructure service
   */
  async testIndividualService(token: string | null, serviceName: string): Promise<{
    success: boolean;
    timestamp: string;
    service: string;
    result: {
      status: string;
      message: string;
      stats?: ServiceStats;
    };
  }> {
    console.log('🔧 AdminAPI: testIndividualService called', serviceName);
    
    try {
      const url = `${API_BASE_URL}/api/admin/system-status?service=${encodeURIComponent(serviceName)}`;
      console.log('🔧 AdminAPI: Testing individual service at', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token)
      });
      
      const data = await handleResponse(response);
      console.log('🔧 AdminAPI: Individual service test result', data);
      return data;
    } catch (error) {
      console.error('🔧 AdminAPI: Individual service test error', error);
      throw error;
    }
  },

  /**
   * Get comprehensive AI services status for all providers
   */
  async getAIServicesStatus(token: string | null, options?: {
    test?: boolean;
    includeUnavailable?: boolean;
  }): Promise<{
    success: boolean;
    timestamp: string;
    overallStatus: 'operational' | 'degraded' | 'failed';
    summary: {
      total: number;
      configured: number;
      operational: number;
      unavailable: number;
      errors: number;
      rateLimited: number;
    };
    providers: Array<{
      key: string;
      name: string;
      status: 'operational' | 'configured' | 'rate_limited' | 'error' | 'unavailable';
      message: string;
      responseTime: string;
      provider: string;
      testedAt?: string;
      rateLimitExpiry?: string;
      errorType?: string;
    }>;
    timing?: {
      tested: number;
      fastest: { time: string; provider: string; key: string };
      slowest: { time: string; provider: string; key: string };
      average: string;
      totalTime: string;
    };
  }> {
    console.log('🔧 AdminAPI: getAIServicesStatus called', options);
    
    try {
      const params = new URLSearchParams();
      if (options?.test) params.append('test', 'basic'); // Changed from 'true' to 'basic'
      if (options?.includeUnavailable) params.append('includeUnavailable', 'true');
      
      const url = `${API_BASE_URL}/api/admin/ai-services-status${params.toString() ? '?' + params : ''}`;
      console.log('🔧 AdminAPI: Fetching AI services status from', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token)
      });
      
      const data = await handleResponse(response);
      console.log('🔧 AdminAPI: AI services status received', data);
      return data;
    } catch (error) {
      console.error('🔧 AdminAPI: AI services status error', error);
      throw error;
    }
  },

  /**
   * Test specific AI provider connectivity
   */
  async testAIProvider(token: string | null, providerKey: string): Promise<{
    success: boolean;
    timestamp: string;
    provider: {
      key: string;
      status: string;
      message: string;
      responseTime?: string;
      provider: string;
      testedAt: string;
    };
  }> {
    console.log('🔧 AdminAPI: testAIProvider called', providerKey);
    
    try {
      const url = `${API_BASE_URL}/api/admin/ai-services-status?provider=${encodeURIComponent(providerKey)}`;
      console.log('🔧 AdminAPI: Testing specific AI provider at', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token)
      });
      
      const data = await handleResponse(response);
      console.log('🔧 AdminAPI: AI provider test result', data);
      return data;
    } catch (error) {
      console.error('🔧 AdminAPI: AI provider test error', error);
      throw error;
    }
  },

  /**
   * Get comprehensive user analytics and engagement metrics
   */
  async getUserAnalytics(token: string | null, dateRange: string = '30'): Promise<UserAnalytics> {
    console.log('🔧 AdminAPI: getUserAnalytics called', { dateRange });
    
    try {
      const url = `${API_BASE_URL}/api/admin/user-analytics?range=${encodeURIComponent(dateRange)}`;
      console.log('🔧 AdminAPI: Fetching analytics from', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token)
      });
      
      const data = await handleResponse(response);
      console.log('🔧 AdminAPI: Analytics data received', data);
      return data;
    } catch (error) {
      console.error('🔧 AdminAPI: Analytics fetch error', error);
      throw error;
    }
  }
};

export { adminApi };
export default adminApi;

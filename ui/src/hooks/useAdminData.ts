import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../utils/adminApi';
import type { AdminUserListResponse } from '../auth/types';

// Helper function to handle authentication errors
const handleAuthError = (error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = (error as { code?: string })?.code;
  
  if (errorMessage.includes('Missing Authorization header') || 
      errorMessage.includes('AUTH_FAILED') ||
      errorCode === 'AUTH_FAILED') {
    console.warn('🔐 Authentication token expired or missing, will retry when token is refreshed');
    return;
  }
  throw error;
};

// User Statistics Hook
export const useUserStats = (token: string | null) => {
  return useQuery<AdminUserListResponse>({
    queryKey: ['admin', 'users', 'stats'],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token available');
      try {
        return await adminApi.listUsers(token, 1);
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!token,
    retry: (failureCount, error) => {
      // Don't retry auth failures, let the context handle token refresh
      if (error?.message?.includes('AUTH_FAILED') || 
          error?.message?.includes('Missing Authorization header')) {
        return false;
      }
      return failureCount < 2; // Retry other errors up to 2 times
    },
  });
};

// System Status Hook
export const useSystemStatus = (token: string | null) => {
  return useQuery({
    queryKey: ['admin', 'system', 'status'],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token available');
      try {
        return await adminApi.testSystemStatus(token);
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    enabled: !!token,
    retry: (failureCount, error) => {
      if (error?.message?.includes('AUTH_FAILED') || 
          error?.message?.includes('Missing Authorization header')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Individual Service Test Hook
export const useIndividualServiceTest = (token: string | null, serviceName?: string) => {
  return useQuery({
    queryKey: ['admin', 'system', 'service', serviceName],
    queryFn: () => serviceName ? adminApi.testIndividualService(token, serviceName) : Promise.reject('No service name'),
    enabled: false, // Only run manually
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: false, // Manual refresh only
  });
};

// Connection Test Hook
export const useConnectionTest = (token: string | null) => {
  return useQuery({
    queryKey: ['admin', 'connection', 'test'],
    queryFn: () => adminApi.testConnection(token),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!token,
  });
};

// Recent Users Hook (separate from stats for different refresh rates)
export const useRecentUsers = (token: string | null) => {
  return useQuery<AdminUserListResponse>({
    queryKey: ['admin', 'users', 'recent'],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token available');
      try {
        return await adminApi.listUsers(token, 1);
      } catch (error) {
        handleAuthError(error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!token,
    retry: (failureCount, error) => {
      if (error?.message?.includes('AUTH_FAILED') || 
          error?.message?.includes('Missing Authorization header')) {
        return false;
      }
      return failureCount < 2;
    },
    select: (data) => ({
      ...data,
      users: data.users.slice(0, 4), // Only take first 4 for recent list
    }),
  });
};

// AI Services Status Hook - Basic configuration check
export const useAIServicesStatus = (token: string | null) => {
  return useQuery({
    queryKey: ['admin', 'ai-services', 'status'],
    queryFn: () => adminApi.getAIServicesStatus(token),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes
    enabled: !!token,
  });
};

// AI Services Connectivity Test Hook - With actual testing
export const useAIServicesConnectivity = (token: string | null, options?: { 
  enabled?: boolean;
  includeUnavailable?: boolean;
}) => {
  return useQuery({
    queryKey: ['admin', 'ai-services', 'connectivity', options?.includeUnavailable],
    queryFn: () => adminApi.getAIServicesStatus(token, { 
      test: true, 
      includeUnavailable: options?.includeUnavailable 
    }),
    enabled: options?.enabled !== false && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes (longer due to API calls)
    refetchInterval: false, // Manual refresh only for connectivity tests
  });
};

// Individual AI Provider Test Hook
export const useAIProviderTest = (token: string | null, providerKey?: string) => {
  return useQuery({
    queryKey: ['admin', 'ai-provider', 'test', providerKey],
    queryFn: () => providerKey ? adminApi.testAIProvider(token, providerKey) : Promise.reject('No provider key'),
    enabled: false, // Only run manually
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: false, // Manual refresh only
  });
};

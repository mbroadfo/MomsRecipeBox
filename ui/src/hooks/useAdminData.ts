import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../utils/adminApi';
import type { AdminUserListResponse } from '../auth/types';

// User Statistics Hook
export const useUserStats = (token: string | null) => {
  return useQuery<AdminUserListResponse>({
    queryKey: ['admin', 'users', 'stats'],
    queryFn: () => adminApi.listUsers(token, 1),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!token,
  });
};

// System Status Hook
export const useSystemStatus = (token: string | null) => {
  return useQuery({
    queryKey: ['admin', 'system', 'status'],
    queryFn: () => adminApi.testSystemStatus(token),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    enabled: !!token,
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
    queryFn: () => adminApi.listUsers(token, 1),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!token,
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

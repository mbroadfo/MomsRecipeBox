import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../utils/adminApi';
import type { AdminUserListResponse } from '../auth/types';

// User Statistics Hook
export const useUserStats = () => {
  return useQuery<AdminUserListResponse>({
    queryKey: ['admin', 'users', 'stats'],
    queryFn: () => adminApi.listUsers(1),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// System Status Hook
export const useSystemStatus = () => {
  return useQuery({
    queryKey: ['admin', 'system', 'status'],
    queryFn: () => adminApi.testSystemStatus(),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
};

// Individual Service Test Hook
export const useIndividualServiceTest = (serviceName?: string) => {
  return useQuery({
    queryKey: ['admin', 'system', 'service', serviceName],
    queryFn: () => serviceName ? adminApi.testIndividualService(serviceName) : Promise.reject('No service name'),
    enabled: false, // Only run manually
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: false, // Manual refresh only
  });
};

// Connection Test Hook
export const useConnectionTest = () => {
  return useQuery({
    queryKey: ['admin', 'connection', 'test'],
    queryFn: () => adminApi.testConnection(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Recent Users Hook (separate from stats for different refresh rates)
export const useRecentUsers = () => {
  return useQuery<AdminUserListResponse>({
    queryKey: ['admin', 'users', 'recent'],
    queryFn: () => adminApi.listUsers(1),
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => ({
      ...data,
      users: data.users.slice(0, 4), // Only take first 4 for recent list
    }),
  });
};

// AI Services Status Hook - Basic configuration check
export const useAIServicesStatus = () => {
  return useQuery({
    queryKey: ['admin', 'ai-services', 'status'],
    queryFn: () => adminApi.getAIServicesStatus(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes
  });
};

// AI Services Connectivity Test Hook - With actual testing
export const useAIServicesConnectivity = (options?: { 
  enabled?: boolean;
  includeUnavailable?: boolean;
}) => {
  return useQuery({
    queryKey: ['admin', 'ai-services', 'connectivity', options?.includeUnavailable],
    queryFn: () => adminApi.getAIServicesStatus({ 
      test: true, 
      includeUnavailable: options?.includeUnavailable 
    }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes (longer due to API calls)
    refetchInterval: false, // Manual refresh only for connectivity tests
  });
};

// Individual AI Provider Test Hook
export const useAIProviderTest = (providerKey?: string) => {
  return useQuery({
    queryKey: ['admin', 'ai-provider', 'test', providerKey],
    queryFn: () => providerKey ? adminApi.testAIProvider(providerKey) : Promise.reject('No provider key'),
    enabled: false, // Only run manually
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: false, // Manual refresh only
  });
};

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

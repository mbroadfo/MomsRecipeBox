import React from 'react';
import { useUserStats } from '../../../hooks/useAdminData';
import { SectionWrapper } from '../ErrorBoundary';
import { StatsCardSkeleton } from '../skeletons';

const UserStatsContent: React.FC = () => {
  const { data: stats, isLoading, error, refetch } = useUserStats();

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<StatsCardSkeleton />}
      title="Failed to load user statistics"
    >
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">User Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats?.stats?.total_users || stats?.total || 0}</div>
            <div className="text-xs text-gray-600">Total Users</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats?.stats?.active_users || 0}</div>
            <div className="text-xs text-gray-600">Active Users</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats?.stats?.new_users_this_month || 0}</div>
            <div className="text-xs text-gray-600">New This Month</div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default UserStatsContent;

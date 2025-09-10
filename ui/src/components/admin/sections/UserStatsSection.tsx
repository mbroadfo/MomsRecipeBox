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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">User Statistics</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-150">
            <div className="text-3xl font-bold text-blue-600 mb-2">{stats?.stats?.total_users || stats?.total || 0}</div>
            <div className="text-sm text-blue-700 font-medium">Total Users</div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-150">
            <div className="text-3xl font-bold text-green-600 mb-2">{stats?.stats?.active_users || 0}</div>
            <div className="text-sm text-green-700 font-medium">Active Users</div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-150">
            <div className="text-3xl font-bold text-purple-600 mb-2">{stats?.stats?.new_users_this_month || 0}</div>
            <div className="text-sm text-purple-700 font-medium">New This Month</div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default UserStatsContent;

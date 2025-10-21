import React from 'react';
import { useUserStats } from '../../../hooks/useAdminData';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { SectionWrapper } from '../ErrorBoundary';
import { StatsCardSkeleton } from '../skeletons';

const UserStatsContent: React.FC = () => {
  const { token } = useAdminAuth();
  const { data: stats, isLoading, error, refetch } = useUserStats(token);

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<StatsCardSkeleton />}
      title="Failed to load user statistics"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-100">
          <div className="text-4xl font-bold text-blue-600 mb-2">{stats?.stats?.total_users || stats?.total || 0}</div>
          <div className="text-sm text-blue-700 font-medium">Total Users</div>
          <div className="text-xs text-blue-600 mt-1 opacity-75">All registered accounts</div>
        </div>
        <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-100">
          <div className="text-4xl font-bold text-emerald-600 mb-2">{stats?.stats?.active_users || 0}</div>
          <div className="text-sm text-emerald-700 font-medium">Active Users</div>
          <div className="text-xs text-emerald-600 mt-1 opacity-75">Recent activity</div>
        </div>
        <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-100">
          <div className="text-4xl font-bold text-purple-600 mb-2">{stats?.stats?.new_users_this_month || 0}</div>
          <div className="text-sm text-purple-700 font-medium">New This Month</div>
          <div className="text-xs text-purple-600 mt-1 opacity-75">Growth metric</div>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default UserStatsContent;

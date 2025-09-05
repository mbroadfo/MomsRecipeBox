import React, { useState, useEffect } from 'react';
import type { AdminUser, AdminUserStats } from '../../auth/types';

interface UserStatisticsProps {
  stats?: AdminUserStats;
  users: AdminUser[];
}

export const UserStatistics: React.FC<UserStatisticsProps> = ({ stats, users }) => {
  const [calculatedStats, setCalculatedStats] = useState<AdminUserStats>({
    total_users: 0,
    active_users: 0,
    new_users_this_month: 0
  });

  useEffect(() => {
    if (stats) {
      setCalculatedStats(stats);
    } else {
      // Calculate stats from users array if not provided by API
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      
      const newUsersThisMonth = users.filter(user => {
        const createdDate = new Date(user.createdAt);
        return createdDate >= oneMonthAgo;
      }).length;

      const activeUsers = users.filter(user => 
        user.lastLogin && new Date(user.lastLogin) >= oneMonthAgo
      ).length;

      setCalculatedStats({
        total_users: users.length,
        active_users: activeUsers,
        new_users_this_month: newUsersThisMonth
      });
    }
  }, [stats, users]);

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    description: string;
  }> = ({ title, value, icon, color, description }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard
        title="Total Users"
        value={calculatedStats.total_users}
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        }
        color="bg-blue-500"
        description="All registered users"
      />
      
      <StatCard
        title="Active Users"
        value={calculatedStats.active_users}
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        color="bg-green-500"
        description="Logged in this month"
      />
      
      <StatCard
        title="New This Month"
        value={calculatedStats.new_users_this_month}
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        }
        color="bg-purple-500"
        description="New registrations"
      />
    </div>
  );
};

export default UserStatistics;

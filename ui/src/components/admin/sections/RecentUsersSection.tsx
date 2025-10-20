import React from 'react';
import { useRecentUsers } from '../../../hooks/useAdminData';
import { useAdminAuth } from '../../../contexts/AdminContext';
import { SectionWrapper } from '../ErrorBoundary';
import { RecentUsersSkeleton } from '../skeletons';

const RecentUsersContent: React.FC = () => {
  const { token } = useAdminAuth();
  const { data: users, isLoading, error, refetch } = useRecentUsers(token);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Show first 5 users, sorted by creation date
  const recentUsers = users?.users
    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    ?.slice(0, 5) || [];

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<RecentUsersSkeleton />}
      title="Failed to load recent users"
    >
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">Recent Users</h3>
          <span className="text-xs text-gray-500">{users?.total || 0} total</span>
        </div>
        
        {recentUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No users found
          </div>
        ) : (
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  {user.userImage ? (
                    <img 
                      src={user.userImage} 
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                  )}
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-gray-900">
                    {user.loginCount} login{user.loginCount !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    Joined {formatDate(user.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default RecentUsersContent;

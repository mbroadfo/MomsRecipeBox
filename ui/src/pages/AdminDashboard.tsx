import React, { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from '../components/admin/ErrorBoundary';
import { queryClient } from '../utils/queryClient';

// Lazy load section components
const UserStatsSection = React.lazy(() => import('../components/admin/sections/UserStatsSection'));
const SystemStatusSection = React.lazy(() => import('../components/admin/sections/SystemStatusSection'));
const RecentUsersSection = React.lazy(() => import('../components/admin/sections/RecentUsersSection'));
const QuickActionsSection = React.lazy(() => import('../components/admin/sections/QuickActionsSection'));

// Loading fallbacks for Suspense
const SectionFallback: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse ${className || ''}`}>
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-8 bg-gray-200 rounded"></div>
      <div className="h-8 bg-gray-200 rounded"></div>
      <div className="h-8 bg-gray-200 rounded"></div>
    </div>
  </div>
);

const AdminDashboardContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Monitor and manage your Recipe Box application</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Statistics */}
            <ErrorBoundary title="User Statistics Error">
              <Suspense fallback={<SectionFallback />}>
                <UserStatsSection />
              </Suspense>
            </ErrorBoundary>

            {/* System Status */}
            <ErrorBoundary title="System Status Error">
              <Suspense fallback={<SectionFallback />}>
                <SystemStatusSection />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Recent Users */}
            <ErrorBoundary title="Recent Users Error">
              <Suspense fallback={<SectionFallback />}>
                <RecentUsersSection />
              </Suspense>
            </ErrorBoundary>

            {/* Quick Actions */}
            <ErrorBoundary title="Quick Actions Error">
              <Suspense fallback={<SectionFallback />}>
                <QuickActionsSection />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminDashboardContent />
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export default AdminDashboard;

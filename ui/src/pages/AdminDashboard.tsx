import React, { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from '../components/admin/ErrorBoundary';
import { queryClient } from '../utils/queryClient';

// Lazy load section components
const UserStatsSection = React.lazy(() => import('../components/admin/sections/UserStatsSection'));
const SystemStatusSection = React.lazy(() => import('../components/admin/sections/SystemStatusSection'));
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Monitor and manage your Recipe Box application</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* User Statistics - Full width */}
          <div className="lg:col-span-4">
            <ErrorBoundary title="User Statistics Error">
              <Suspense fallback={<SectionFallback />}>
                <UserStatsSection />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* System Status - 2/3 width */}
          <div className="lg:col-span-3">
            <ErrorBoundary title="System Status Error">
              <Suspense fallback={<SectionFallback />}>
                <SystemStatusSection />
              </Suspense>
            </ErrorBoundary>
          </div>

          {/* Quick Actions - 1/3 width */}
          <div className="lg:col-span-1">
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

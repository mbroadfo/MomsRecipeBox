import React, { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from '../components/admin/ErrorBoundary';
import { queryClient } from '../utils/queryClient';

// Lazy load section components
const SystemStatusSection = React.lazy(() => import('../components/admin/sections/SystemStatusSection'));
const QuickActionsSection = React.lazy(() => import('../components/admin/sections/QuickActionsSection'));
const UnifiedAISection = React.lazy(() => import('../components/admin/sections/UnifiedAISection'));

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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 pt-2 pb-4">
        {/* Quick Actions Bar - Tighter spacing from header */}
        <div className="mb-5 bg-white rounded-2xl shadow-md border border-slate-200 hover:shadow-lg transition-all duration-200">
          <div className="p-3 max-w-full overflow-hidden">
            <ErrorBoundary title="Quick Actions Error">
              <Suspense fallback={<SectionFallback />}>
                <div className="max-w-full overflow-hidden">
                  <QuickActionsSection />
                </div>
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>

        {/* Responsive Grid Layout with tighter spacing */}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
          {/* Unified AI Services Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300 max-w-full">
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center">
                    <span className="mr-3">🤖</span>
                    AI Services
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">Provider status and performance monitoring</p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                    title="Refresh AI Services"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm">Refresh All</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 max-w-full overflow-hidden">
              <ErrorBoundary title="AI Services Error">
                <Suspense fallback={<SectionFallback />}>
                  <div className="max-w-full overflow-hidden">
                    <UnifiedAISection />
                  </div>
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>

          {/* Infrastructure Status Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300 max-w-full">
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center">
                    <span className="mr-3">🏗️</span>
                    Infrastructure
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">System health and service status</p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button 
                    className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                    title="Refresh Infrastructure Services"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm">Refresh All</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 max-w-full overflow-hidden">
              <ErrorBoundary title="System Status Error">
                <Suspense fallback={<SectionFallback />}>
                  <div className="max-w-full overflow-hidden">
                    <SystemStatusSection />
                  </div>
                </Suspense>
              </ErrorBoundary>
            </div>
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

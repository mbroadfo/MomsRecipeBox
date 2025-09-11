import React, { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from '../components/admin/ErrorBoundary';
import { queryClient } from '../utils/queryClient';
import AIQuickControls from '../components/admin/AIQuickControls';

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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="mr-3">🎛️</span>
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Monitor infrastructure and AI services • Enhanced with comprehensive AI provider management
              </p>
            </div>
            
            {/* AI Quick Controls */}
            <div className="flex-shrink-0 ml-6">
              <AIQuickControls className="w-80" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Quick Actions Bar - Outside Grid */}
        <div className="mb-6 bg-white rounded-2xl shadow-lg border border-slate-200">
          <div className="p-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <span className="mr-2">⚡</span>
                Quick Actions
              </h2>
              <p className="text-xs text-slate-600 mt-1">Common admin tasks</p>
            </div>
          </div>
          <div className="p-6" style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <ErrorBoundary title="Quick Actions Error">
              <Suspense fallback={<SectionFallback />}>
                <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
                  <QuickActionsSection />
                </div>
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>

        {/* Responsive Grid Layout with fractional units */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {/* Unified AI Services Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200" style={{ maxWidth: '100%' }}>
            <div className="p-6 border-b border-slate-100">
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
                    className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Refresh AI Services"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6" style={{ maxWidth: '100%', overflow: 'hidden' }}>
              <ErrorBoundary title="AI Services Error">
                <Suspense fallback={<SectionFallback />}>
                  <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
                    <UnifiedAISection />
                  </div>
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>

          {/* Infrastructure Status Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200" style={{ maxWidth: '100%' }}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center">
                    <span className="mr-3">🏗️</span>
                    Infrastructure
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">System health and service status</p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full">Monitored</span>
                </div>
              </div>
            </div>
            <div className="p-6" style={{ maxWidth: '100%', overflow: 'hidden' }}>
              <ErrorBoundary title="System Status Error">
                <Suspense fallback={<SectionFallback />}>
                  <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
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

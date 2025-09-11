import React from 'react';
import { useSystemStatus } from '../../../hooks/useAdminData';
import { SectionWrapper } from '../ErrorBoundary';
import { SystemStatusSkeleton } from '../skeletons';

const SystemStatusContent: React.FC = () => {
  const { data: status, isLoading, error, refetch } = useSystemStatus();

  const getStatusColor = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'operational':
      case 'success':
        return 'text-green-600';
      case 'degraded':
      case 'warning':
        return 'text-yellow-600';
      case 'error':
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'operational':
      case 'success':
        return '✓';
      case 'degraded':
      case 'warning':
        return '⚠';
      case 'error':
      case 'failed':
        return '✗';
      default:
        return '?';
    }
  };

  const services = [
    {
      name: 'Overall System',
      status: status?.overall_status || 'unknown',
      icon: '⚙️',
      message: 'Infrastructure Health'
    },
    {
      name: 'S3 Storage',
      status: status?.services?.s3?.status || 'unknown',
      icon: '💾',
      message: status?.services?.s3?.message || 'No status available'
    }
  ];

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<SystemStatusSkeleton />}
      title="Failed to load system status"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              status?.overall_status === 'operational' ? 'bg-emerald-100 text-emerald-700' :
              status?.overall_status === 'degraded' ? 'bg-amber-100 text-amber-700' :
              'bg-rose-100 text-rose-700'
            }`}>
              {status?.overall_status === 'operational' ? '✓' : 
               status?.overall_status === 'degraded' ? '⚠' : '✗'}
              {status?.overall_status?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
            title="Refresh status"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {services.map((service, index) => (
            <div key={index} className="bg-slate-50 rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{service.icon}</span>
                  <span className="text-base font-semibold text-slate-900">{service.name}</span>
                </div>
                <span className={`text-xl ${getStatusColor(service.status)}`}>
                  {getStatusIcon(service.status)}
                </span>
              </div>
              <div className="text-sm text-slate-600 leading-relaxed">
                {service.message}
              </div>
            </div>
          ))}
        </div>

        {/* Note about AI Services */}
        {status?.note && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center text-blue-800 text-sm">
              <svg className="w-4 h-4 min-w-4 min-h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{width: '1rem', height: '1rem'}}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {status.note}
            </div>
          </div>
        )}

        {/* Quick Stats Footer */}
        {status && (
          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
            <div className="flex justify-between items-center">
              <span>Updated: {new Date().toLocaleString()}</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs">Infrastructure Only</span>
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default SystemStatusContent;

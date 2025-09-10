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
      message: 'System Health'
    },
    {
      name: 'S3 Storage',
      status: status?.services?.s3?.status || 'unknown',
      icon: '💾',
      message: status?.services?.s3?.message || 'No status available'
    },
    {
      name: 'AI Services',
      status: status?.services?.ai?.status || 'unknown',
      icon: '🤖',
      message: status?.services?.ai?.message || 'No status available'
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">System Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map((service, index) => (
            <div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-150 p-4 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-lg mr-3">{service.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{service.name}</span>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => refetch()}
                    className="text-gray-400 hover:text-gray-600 mr-2 p-1 rounded hover:bg-gray-200 transition-colors duration-150"
                    title="Refresh status"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <span className={`text-lg ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-600 leading-relaxed">
                {service.message}
                {service.name === 'AI Services' && status?.services?.ai?.provider && (
                  <span className="ml-1 text-blue-600 font-medium">({status.services.ai.provider})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};

export default SystemStatusContent;

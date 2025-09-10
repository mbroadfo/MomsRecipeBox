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
        return 'text-green-600 bg-green-100';
      case 'degraded':
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
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

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<SystemStatusSkeleton />}
      title="Failed to load system status"
    >
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">System Status</h3>
        
        {/* Overall Status */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                status?.overall_status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm font-medium">Overall System</span>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              getStatusColor(status?.overall_status || 'unknown')
            }`}>
              {status?.overall_status || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Service Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center mb-1">
              <span className={`text-xs mr-1.5 ${
                getStatusColor(status?.services?.s3?.status || 'unknown').split(' ')[0]
              }`}>
                {getStatusIcon(status?.services?.s3?.status || 'unknown')}
              </span>
              <span className="text-xs font-medium">S3 Storage</span>
            </div>
            <div className="text-xs text-gray-600">
              {status?.services?.s3?.message || 'No status available'}
            </div>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center mb-1">
              <span className={`text-xs mr-1.5 ${
                getStatusColor(status?.services?.ai?.status || 'unknown').split(' ')[0]
              }`}>
                {getStatusIcon(status?.services?.ai?.status || 'unknown')}
              </span>
              <span className="text-xs font-medium">AI Services</span>
            </div>
            <div className="text-xs text-gray-600">
              {status?.services?.ai?.message || 'No status available'}
              {status?.services?.ai?.provider && (
                <span className="ml-1 text-blue-600">({status.services.ai.provider})</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default SystemStatusContent;

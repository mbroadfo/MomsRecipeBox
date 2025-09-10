import React from 'react';
import { useConnectionTest } from '../../../hooks/useAdminData';
import { SectionWrapper } from '../ErrorBoundary';
import { QuickActionsSkeleton } from '../skeletons';

const QuickActionsContent: React.FC = () => {
  const { data: connectionStatus, isLoading, error, refetch } = useConnectionTest();

  const handleAction = (action: string) => {
    console.log(`Executing action: ${action}`);
    // TODO: Implement specific actions
    switch (action) {
      case 'refresh-cache':
        // Implement cache refresh
        break;
      case 'backup-db':
        // Implement database backup
        break;
      case 'test-connection':
        refetch();
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const actions = [
    {
      id: 'test-connection',
      title: 'Test Connection',
      description: 'Check API connectivity',
      icon: '🔌',
      status: connectionStatus?.status || 'unknown'
    },
    {
      id: 'refresh-cache',
      title: 'Refresh Cache',
      description: 'Clear system cache',
      icon: '🔄',
      status: 'ready'
    },
    {
      id: 'backup-db',
      title: 'Backup Database',
      description: 'Create data backup',
      icon: '💾',
      status: 'ready'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'ready':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'ready':
        return '▶';
      default:
        return '?';
    }
  };

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<QuickActionsSkeleton />}
      title="Failed to load quick actions"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="space-y-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="w-full bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-150 p-4 hover:shadow-md hover:from-blue-50 hover:to-blue-100 transition-all duration-200 text-left group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-lg mr-3">{action.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 group-hover:text-blue-800">
                      {action.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {action.description}
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-medium ${getStatusColor(action.status)}`}>
                  {getStatusIcon(action.status)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};

export default QuickActionsContent;

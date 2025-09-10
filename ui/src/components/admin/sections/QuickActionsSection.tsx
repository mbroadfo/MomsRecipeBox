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
      icon: '↻',
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

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<QuickActionsSkeleton />}
      title="Failed to load quick actions"
    >
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="w-full flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-left"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <span className="text-sm">{action.icon}</span>
              </div>
              <div className="ml-3 flex-1">
                <div className="text-sm font-medium text-gray-900">{action.title}</div>
                <div className="text-xs text-gray-500">{action.description}</div>
              </div>
              <div className={`text-xs font-medium ${getStatusColor(action.status)}`}>
                {action.status === 'success' && '✓'}
                {action.status === 'error' && '✗'}
                {action.status === 'ready' && '▶'}
                {action.status === 'unknown' && '?'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};

export default QuickActionsContent;

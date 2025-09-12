import React from 'react';
import { useConnectionTest } from '../../../hooks/useAdminData';
import { SectionWrapper } from '../ErrorBoundary';
import { QuickActionsSkeleton } from '../skeletons';

const QuickActionsContent: React.FC = () => {
  const { data: connectionStatus, isLoading, error, refetch } = useConnectionTest();

  const handleAction = (action: string) => {
    console.log(`Executing action: ${action}`);
    switch (action) {
      case 'refresh-cache':
        // TODO: Implement cache refresh
        break;
      case 'backup-db':
        // TODO: Implement database backup
        break;
      case 'test-connection':
        refetch();
        break;
      case 'restart-services':
        // TODO: Implement service restart
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
    },
    {
      id: 'restart-services',
      title: 'Restart Services',
      description: 'Restart key services',
      icon: '⚡',
      status: 'ready'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
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
      case 'warning':
        return '⚠';
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
      <div className="space-y-4">
        {/* Action Bar with inline title */}
        <div className="flex items-center gap-4 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 flex items-center flex-shrink-0">
            <span className="mr-2">⚡</span>
            Actions
          </h2>
          <div className="flex gap-2 min-w-0 overflow-x-auto">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className="flex items-center px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md hover:from-blue-50 hover:to-blue-100 transition-all duration-200 group flex-shrink-0 whitespace-nowrap"
                title={action.description}
              >
                <span className="text-sm mr-2">{action.icon}</span>
                <span className="text-xs font-medium text-gray-700 group-hover:text-blue-800">
                  {action.title}
                </span>
                <span className={`text-xs ml-2 ${getStatusColor(action.status)}`}>
                  {getStatusIcon(action.status)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};

export default QuickActionsContent;

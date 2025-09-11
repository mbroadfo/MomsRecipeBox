import React from 'react';
import { useConnectionTest, useAIServicesStatus } from '../../../hooks/useAdminData';
import { SectionWrapper } from '../ErrorBoundary';
import { QuickActionsSkeleton } from '../skeletons';

const QuickActionsContent: React.FC = () => {
  const { data: connectionStatus, isLoading, error, refetch } = useConnectionTest();
  const { data: aiStatus, refetch: refetchAI } = useAIServicesStatus();

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
      case 'test-ai-services':
        refetchAI();
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
      id: 'test-ai-services',
      title: 'Check AI Services',
      description: 'Refresh AI status',
      icon: '🤖',
      status: aiStatus?.overallStatus === 'operational' ? 'success' : 
              aiStatus?.overallStatus === 'degraded' ? 'warning' : 'ready'
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
        {/* Action Bar */}
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="flex items-center px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md hover:from-blue-50 hover:to-blue-100 transition-all duration-200 group min-w-0 flex-shrink-0"
              title={action.description}
            >
              <span className="text-sm mr-2">{action.icon}</span>
              <span className="text-xs font-medium text-gray-700 group-hover:text-blue-800 truncate">
                {action.title}
              </span>
              <span className={`text-xs ml-2 ${getStatusColor(action.status)}`}>
                {getStatusIcon(action.status)}
              </span>
            </button>
          ))}
        </div>

        {/* AI Services Quick Status */}
        {aiStatus && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                AI Services: {aiStatus.summary.operational}/{aiStatus.summary.total} operational
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                aiStatus.overallStatus === 'operational' ? 'bg-green-100 text-green-700' :
                aiStatus.overallStatus === 'degraded' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {aiStatus.overallStatus.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default QuickActionsContent;

import React, { useState } from 'react';
import { useAIServicesStatus, useAIServicesConnectivity } from '../../hooks/useAdminData';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface AIQuickControlsProps {
  className?: string;
}

const AIQuickControls: React.FC<AIQuickControlsProps> = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testMode, setTestMode] = useState<'basic' | 'connectivity'>('basic');
  const { token } = useAdminAuth();
  
  const { data: basicStatus, refetch: refetchBasic } = useAIServicesStatus(token);
  const { 
    data: connectivityStatus, 
    refetch: refetchConnectivity,
    isLoading: connectivityLoading 
  } = useAIServicesConnectivity(token, { enabled: testMode === 'connectivity' });

  const currentData = testMode === 'connectivity' ? connectivityStatus : basicStatus;

  const handleQuickTest = async () => {
    if (testMode === 'connectivity') {
      await refetchConnectivity();
    } else {
      await refetchBasic();
    }
  };

  const getOverallStatusColor = (status?: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'degraded':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'failed':
        return 'text-red-700 bg-red-100 border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Compact View */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg">🤖</span>
            <div>
              <div className="text-sm font-medium text-gray-900">AI Services</div>
              {currentData && (
                <div className="text-xs text-gray-600">
                  {currentData.summary.operational}/{currentData.summary.total} operational
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Overall Status Badge */}
            {currentData && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getOverallStatusColor(currentData.overallStatus)}`}>
                {currentData.overallStatus.toUpperCase()}
              </span>
            )}
            
            {/* Quick Test Button */}
            <button
              onClick={handleQuickTest}
              disabled={connectivityLoading}
              className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors disabled:opacity-50"
            >
              {connectivityLoading ? '⟳' : '🔄'} Test
            </button>
            
            {/* Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <svg 
                className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {/* Test Mode Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-700">Test Mode</div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTestMode('basic')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  testMode === 'basic' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Quick
              </button>
              <button
                onClick={() => setTestMode('connectivity')}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  testMode === 'connectivity' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Live Test
              </button>
            </div>
          </div>

          {/* Provider Summary */}
          {currentData && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Operational:</span>
                  <span className="font-medium text-green-600">{currentData.summary.operational}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Configured:</span>
                  <span className="font-medium text-blue-600">{currentData.summary.configured}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Errors:</span>
                  <span className="font-medium text-red-600">{currentData.summary.errors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rate Limited:</span>
                  <span className="font-medium text-orange-600">{currentData.summary.rateLimited}</span>
                </div>
              </div>

              {/* Timing Stats (if available) */}
              {testMode === 'connectivity' && connectivityStatus?.timing && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 mb-2">Performance:</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-green-600 font-medium">{connectivityStatus.timing.fastest.time}</div>
                      <div className="text-gray-500">Fastest</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-600 font-medium">{connectivityStatus.timing.average}</div>
                      <div className="text-gray-500">Average</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-medium">{connectivityStatus.timing.slowest.time}</div>
                      <div className="text-gray-500">Slowest</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 mt-2">
                Last updated: {new Date(currentData.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIQuickControls;

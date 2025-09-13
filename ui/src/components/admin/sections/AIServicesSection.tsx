import React, { useState } from 'react';
import { useAIServicesStatus, useAIServicesConnectivity } from '../../../hooks/useAdminData';
import { SectionWrapper } from '../ErrorBoundary';
import { AIServicesSkeleton } from '../skeletons';

interface AIProvider {
  key: string;
  name: string;
  status: 'operational' | 'configured' | 'rate_limited' | 'error' | 'unavailable';
  message: string;
  responseTime: string;
  provider: string;
  testedAt?: string;
  rateLimitExpiry?: string;
  errorType?: string;
}

interface TimingStats {
  tested: number;
  fastest: { time: string; provider: string; key: string };
  slowest: { time: string; provider: string; key: string };
  average: string;
  totalTime: string;
}

const AIServicesContent: React.FC = () => {
  const [testMode, setTestMode] = useState<'basic' | 'connectivity'>('basic');
  const [includeUnavailable, setIncludeUnavailable] = useState(false);
  
  const { 
    data: basicStatus, 
    isLoading: basicLoading, 
    error: basicError, 
    refetch: refetchBasic 
  } = useAIServicesStatus();
  
  const { 
    data: connectivityStatus, 
    isLoading: connectivityLoading, 
    error: connectivityError, 
    refetch: refetchConnectivity 
  } = useAIServicesConnectivity({ 
    enabled: testMode === 'connectivity',
    includeUnavailable 
  });

  const currentData = testMode === 'connectivity' ? connectivityStatus : basicStatus;
  const isLoading = testMode === 'connectivity' ? connectivityLoading : basicLoading;
  const error = testMode === 'connectivity' ? connectivityError : basicError;
  const refetch = testMode === 'connectivity' ? refetchConnectivity : refetchBasic;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'configured':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'rate_limited':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'unavailable':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return '🟢';
      case 'configured':
        return '🟡';
      case 'rate_limited':
        return '🟠';
      case 'error':
        return '🔴';
      case 'unavailable':
        return '⚫';
      default:
        return '❓';
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-700 bg-green-100';
      case 'degraded':
        return 'text-yellow-700 bg-yellow-100';
      case 'failed':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const formatResponseTime = (time: string) => {
    if (time === 'N/A') return time;
    const ms = parseInt(time.replace('ms', ''));
    if (ms < 500) return `${time} ⚡`;
    if (ms < 1000) return `${time} 🚀`;
    if (ms < 2000) return `${time} ✅`;
    return `${time} 🐌`;
  };

  const handleModeChange = (newMode: 'basic' | 'connectivity') => {
    setTestMode(newMode);
  };

  const TimingStatsDisplay: React.FC<{ timing: TimingStats }> = ({ timing }) => (
    <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
      <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
        <span className="mr-2">📊</span>
        Performance Analytics
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-white rounded p-3 border border-blue-100">
          <div className="text-xs text-gray-600 mb-1">Fastest</div>
          <div className="font-medium text-green-700">{timing.fastest.time}</div>
          <div className="text-xs text-gray-500">{timing.fastest.provider}</div>
        </div>
        <div className="bg-white rounded p-3 border border-blue-100">
          <div className="text-xs text-gray-600 mb-1">Slowest</div>
          <div className="font-medium text-red-700">{timing.slowest.time}</div>
          <div className="text-xs text-gray-500">{timing.slowest.provider}</div>
        </div>
        <div className="bg-white rounded p-3 border border-blue-100">
          <div className="text-xs text-gray-600 mb-1">Average</div>
          <div className="font-medium text-blue-700">{timing.average}</div>
          <div className="text-xs text-gray-500">{timing.tested} providers</div>
        </div>
        <div className="bg-white rounded p-3 border border-blue-100">
          <div className="text-xs text-gray-600 mb-1">Total Time</div>
          <div className="font-medium text-purple-700">{timing.totalTime}</div>
          <div className="text-xs text-gray-500">All tests</div>
        </div>
      </div>
    </div>
  );

  const ProviderCard: React.FC<{ provider: AIProvider }> = ({ provider }) => (
    <div className={`rounded-lg border p-4 transition-all duration-200 hover:shadow-md ${getStatusColor(provider.status)}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-lg mr-3">{getStatusIcon(provider.status)}</span>
          <div>
            <div className="font-medium text-sm">{provider.name}</div>
            <div className="text-xs opacity-75 capitalize">{provider.status.replace('_', ' ')}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {formatResponseTime(provider.responseTime)}
          </div>
          {provider.testedAt && (
            <div className="text-xs opacity-75">
              {new Date(provider.testedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
      
      <div className="text-xs leading-relaxed">
        {provider.message}
        
        {provider.rateLimitExpiry && (
          <div className="mt-2 text-orange-700 font-medium">
            Rate limit expires: {new Date(provider.rateLimitExpiry).toLocaleString()}
          </div>
        )}
        
        {provider.errorType && (
          <div className="mt-2 text-red-700 font-medium">
            Error type: {provider.errorType}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<AIServicesSkeleton />}
      title="Failed to load AI services status"
    >
      <div className="space-y-6">
        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Mode Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => handleModeChange('basic')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                testMode === 'basic' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quick Check
            </button>
            <button
              onClick={() => handleModeChange('connectivity')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                testMode === 'connectivity' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Test
            </button>
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

        {/* Overall Status Banner */}
        {currentData && (
          <div className={`rounded-xl p-4 ${getOverallStatusColor(currentData.overallStatus)}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-base">
                  Status: {currentData.overallStatus.toUpperCase()}
                </div>
                <div className="text-sm mt-1 opacity-90">
                  {currentData.summary.operational}/{currentData.summary.total} providers operational
                  {testMode === 'connectivity' && ` • Last tested: ${new Date(currentData.timestamp).toLocaleTimeString()}`}
                </div>
              </div>
              <div className="flex space-x-4 text-sm">
                <span className="flex items-center">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></span>
                  {currentData.summary.operational} Operational
                </span>
                <span className="flex items-center">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-2"></span>
                  {currentData.summary.configured} Configured
                </span>
                {currentData.summary.errors > 0 && (
                  <span className="flex items-center">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full mr-2"></span>
                    {currentData.summary.errors} Errors
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Options */}
        {testMode === 'connectivity' && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeUnavailable}
                    onChange={(e) => setIncludeUnavailable(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Include unavailable providers in tests</span>
                </label>
              </div>
              <div className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                ⚠️ Live API calls
              </div>
            </div>
          </div>
        )}

        {/* Provider Grid */}
        {currentData && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {currentData.providers.map((provider, index) => (
              <ProviderCard key={provider.key || index} provider={provider} />
            ))}
          </div>
        )}

        {/* Timing Statistics */}
        {testMode === 'connectivity' && connectivityStatus?.timing && (
          <TimingStatsDisplay timing={connectivityStatus.timing} />
        )}

        {/* Footer */}
        {currentData && (
          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
            <div className="flex justify-between items-center">
              <span>Updated: {new Date(currentData.timestamp).toLocaleString()}</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                {testMode === 'connectivity' ? 'Live Testing' : 'Configuration Check'}
              </span>
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default AIServicesContent;

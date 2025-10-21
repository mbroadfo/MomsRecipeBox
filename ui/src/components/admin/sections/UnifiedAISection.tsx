import React, { useState } from 'react';
import { useAIServicesConnectivity } from '../../../hooks/useAdminData';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { adminApi } from '../../../utils/adminApi';
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

interface TimingData {
  fastest?: { key: string };
  slowest?: { key: string };
}

const UnifiedAISectionContent: React.FC = () => {
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const { token } = useAdminAuth();
  
  const { 
    data: aiData, 
    isLoading, 
    error, 
    refetch 
  } = useAIServicesConnectivity(token, { 
    enabled: true,
    includeUnavailable: true 
  });

  const testSpecificProvider = async (providerKey: string) => {
    setTestingProvider(providerKey);
    try {
      await adminApi.testAIProvider(token, providerKey);
      refetch();
    } catch (error) {
      console.error('Provider test failed:', error);
    } finally {
      setTestingProvider(null);
    }
  };

  const getProviderDisplayName = (provider: AIProvider) => {
    // Map provider keys to display names
    const providerNames = {
      'google': 'Google Gemini',
      'openai': 'OpenAI',
      'groq': 'Groq',
      'anthropic': 'Anthropic',
      'deepseek': 'DeepSeek'
    };
    
    return provider.name || providerNames[provider.key as keyof typeof providerNames] || provider.provider || provider.key || 'Unknown';
  };

  const getStatusEmoji = (status: string) => {
    const emojis = {
      operational: '🟢',      // Green circle
      configured: '🔵',       // Blue circle  
      rate_limited: '🟡',     // Yellow circle
      error: '🔴',            // Red circle
      unavailable: '⚪'       // White circle
    };
    return emojis[status as keyof typeof emojis] || emojis.unavailable;
  };

  const formatResponseTime = (time: string) => {
    if (time === 'N/A' || !time) return 'N/A';
    return time.includes('ms') ? time : `${time}ms`;
  };

  const getBadgeForProvider = (provider: AIProvider, timing: TimingData | undefined) => {
    if (!timing || provider.responseTime === 'N/A') return null;
    
    if (timing.fastest?.key === provider.key) {
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500 text-white border border-emerald-600 shadow-sm">
          Fastest
        </span>
      );
    }
    
    if (timing.slowest?.key === provider.key) {
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500 text-white border border-amber-600 shadow-sm">
          Slowest
        </span>
      );
    }
    
    return null;
  };

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={refetch}
      skeleton={<AIServicesSkeleton />}
    >
      <div className="space-y-4">
        {/* Provider Table */}
        {aiData && (
          <div className="space-y-2">
            {aiData.providers
              .sort((a, b) => {
                const statusPriority = { operational: 0, configured: 1, rate_limited: 2, error: 3, unavailable: 4 };
                const aPriority = statusPriority[a.status as keyof typeof statusPriority] ?? 5;
                const bPriority = statusPriority[b.status as keyof typeof statusPriority] ?? 5;
                
                if (aPriority !== bPriority) return aPriority - bPriority;
                
                if (a.responseTime === 'N/A' && b.responseTime === 'N/A') return 0;
                if (a.responseTime === 'N/A') return 1;
                if (b.responseTime === 'N/A') return -1;
                
                return parseInt(a.responseTime.replace('ms', '')) - parseInt(b.responseTime.replace('ms', ''));
              })
              .map((provider, index) => (
                <div 
                  key={provider.key || index} 
                  className="grid grid-cols-11 gap-3 items-center p-1 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow min-h-[30px]"
                >
                  {/* Status + Provider Name with Badge - Col 1-5 */}
                  <div className="col-span-5 flex items-center space-x-2">
                    <span 
                      className="text-base leading-none cursor-help flex-shrink-0"
                      title={`${provider.status.charAt(0).toUpperCase() + provider.status.slice(1).replace('_', ' ')} - ${
                        provider.status === 'operational' ? 'Working normally' :
                        provider.status === 'configured' ? 'Set up but not tested recently' :
                        provider.status === 'rate_limited' ? 'Temporarily limiting requests' :
                        provider.status === 'error' ? 'Experiencing errors' :
                        'Not configured or inaccessible'
                      }`}
                    >
                      {getStatusEmoji(provider.status)}
                    </span>
                    <div className="font-medium text-sm text-slate-900 min-w-0 flex items-center space-x-2">
                      <span className="truncate">{getProviderDisplayName(provider)}</span>
                      {getBadgeForProvider(provider, aiData.timing)}
                    </div>
                  </div>
                  
                  {/* Response Time - Col 6-9 */}
                  <div className="col-span-4 text-right pr-3">
                    <span className="text-sm font-medium text-slate-700">
                      {formatResponseTime(provider.responseTime)}
                    </span>
                  </div>
                  
                  {/* Test Button - Col 10-11 */}
                  <div className="col-span-2 flex justify-center pl-2">
                    <button
                      onClick={() => testSpecificProvider(provider.key)}
                      disabled={testingProvider === provider.key}
                      className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-lg"
                      title={`Test ${getProviderDisplayName(provider)}

Status Legend:
🟢 Operational - Working normally
🔵 Configured - Set up but not tested recently  
🟡 Rate Limited - Temporarily limiting requests
🔴 Error - Experiencing errors
⚪ Unavailable - Not configured or inaccessible`}
                    >
                      🔄
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Simple Footer with just refresh time */}
        {aiData && (
          <div className="pt-4 border-t border-slate-200">
            <div className="flex justify-end">
              <span className="text-xs text-slate-500">
                Updated: {new Date(aiData.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export const UnifiedAISection: React.FC = () => {
  return <UnifiedAISectionContent />;
};

export default UnifiedAISection;

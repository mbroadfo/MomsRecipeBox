import React, { useState } from 'react';
import { useAIServicesConnectivity } from '../../../hooks/useAdminData';
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

const UnifiedAISectionContent: React.FC = () => {
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  
  const { 
    data: aiData, 
    isLoading, 
    error, 
    refetch 
  } = useAIServicesConnectivity({ 
    enabled: true,
    includeUnavailable: true 
  });

  const testSpecificProvider = async (providerKey: string) => {
    setTestingProvider(providerKey);
    try {
      await adminApi.testAIProvider(providerKey);
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

  const getBadgeForProvider = (provider: AIProvider, timing: any) => {
    if (!timing || provider.responseTime === 'N/A') return null;
    
    if (timing.fastest?.key === provider.key) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          Fastest
        </span>
      );
    }
    
    if (timing.slowest?.key === provider.key) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
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
                  className="grid grid-cols-12 gap-3 items-center p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                  style={{ minHeight: '60px' }}
                >
                  {/* Status Dot - Col 1 */}
                  <div className="col-span-1 flex justify-center">
                    <span 
                      className="text-lg leading-none cursor-help"
                      title={`${provider.status.charAt(0).toUpperCase() + provider.status.slice(1).replace('_', ' ')} - ${
                        provider.status === 'operational' ? 'Working normally' :
                        provider.status === 'configured' ? 'Set up but not tested recently' :
                        provider.status === 'rate_limited' ? 'Temporarily limiting requests' :
                        provider.status === 'error' ? 'Experiencing errors' :
                        'Not configured or inaccessible'
                      }`}
                      style={{ fontSize: '16px' }}
                    >
                      {getStatusEmoji(provider.status)}
                    </span>
                  </div>
                  
                  {/* Provider Name - Col 2-6 */}
                  <div className="col-span-5">
                    <div 
                      className="font-medium text-base"
                      style={{ 
                        color: '#1f2937',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {getProviderDisplayName(provider)}
                    </div>
                  </div>
                  
                  {/* Response Time - Col 7-8 */}
                  <div className="col-span-2 text-right pr-2">
                    <span className="text-sm font-medium text-slate-700">
                      {formatResponseTime(provider.responseTime)}
                    </span>
                  </div>
                  
                  {/* Badge - Col 9-11 */}
                  <div className="col-span-3 flex justify-center">
                    {getBadgeForProvider(provider, aiData.timing) || (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>-</span>
                    )}
                  </div>
                  
                  {/* Test Button - Col 12 */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => testSpecificProvider(provider.key)}
                      disabled={testingProvider === provider.key}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: testingProvider === provider.key ? '#e5e7eb' : '#f3f4f6',
                        color: '#3b82f6',
                        cursor: testingProvider === provider.key ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}
                      title={`Test ${getProviderDisplayName(provider)}

Status Legend:
🟢 Operational - Working normally
🔵 Configured - Set up but not tested recently  
🟡 Rate Limited - Temporarily limiting requests
🔴 Error - Experiencing errors
⚪ Unavailable - Not configured or inaccessible`}
                      onMouseOver={(e) => {
                        if (!testingProvider) {
                          e.currentTarget.style.backgroundColor = '#e5e7eb';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!testingProvider) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                        }
                      }}
                    >
                      {testingProvider === provider.key ? '🔄' : '🔄'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Summary Footer */}
        {aiData && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mt-4">
            <div className="flex justify-between items-center text-sm px-2 py-1">
              <div className="flex space-x-6 text-slate-600">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  {aiData.summary.operational} Operational
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-rose-500 rounded-full mr-2"></span>
                  {aiData.summary.errors} Errors
                </span>
              </div>
              <span className="text-slate-500">
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

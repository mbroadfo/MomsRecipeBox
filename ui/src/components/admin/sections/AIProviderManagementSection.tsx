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

const AIProviderManagementContent: React.FC = () => {
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [selectedProviderForModal, setSelectedProviderForModal] = useState<AIProvider | null>(null);
  
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
      const result = await adminApi.testAIProvider(providerKey);
      console.log(`Test result for ${providerKey}:`, result);
      refetch();
    } catch (error) {
      console.error('Provider test failed:', error);
    } finally {
      setTestingProvider(null);
    }
  };

  const getProviderStatusBadge = (status: string) => {
    const configs = {
      operational: { color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: '✓', label: 'Operational' },
      configured: { color: 'bg-sky-50 text-sky-700 border-sky-100', icon: '○', label: 'Configured' },
      rate_limited: { color: 'bg-amber-50 text-amber-700 border-amber-100', icon: '⚡', label: 'Rate Limited' },
      error: { color: 'bg-rose-50 text-rose-700 border-rose-100', icon: '⚠', label: 'Error' },
      unavailable: { color: 'bg-slate-50 text-slate-600 border-slate-100', icon: '○', label: 'Unavailable' }
    };
    
    const config = configs[status as keyof typeof configs] || configs.unavailable;
    
    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <span className="mr-1.5">{config.icon}</span>
        {config.label}
      </div>
    );
  };

  const formatResponseTime = (time: string) => {
    if (time === 'N/A' || !time) return 'N/A';
    return time.includes('ms') ? time : `${time}ms`;
  };

  const getPerformanceCategory = (responseTime: string) => {
    if (responseTime === 'N/A') return 'unknown';
    const ms = parseInt(responseTime.replace('ms', ''));
    if (ms < 500) return 'excellent';
    if (ms < 1000) return 'good';
    if (ms < 2000) return 'fair';
    return 'slow';
  };

  const getProviderIcon = (name: string) => {
    const icons = {
      'Google Gemini': '🌟',
      'OpenAI': '🤖',
      'Groq': '⚡',
      'Anthropic': '🧠',
      'DeepSeek': '🔍'
    };
    return icons[name as keyof typeof icons] || '🤖';
  };

  const ProviderDetailModal: React.FC<{ provider: AIProvider; onClose: () => void }> = ({ provider, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">{getProviderIcon(provider.name)}</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{provider.name}</h3>
                <p className="text-sm text-slate-500">{provider.key}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
              {getProviderStatusBadge(provider.status)}
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Response Time</label>
              <div className="text-lg font-semibold text-slate-900">{formatResponseTime(provider.responseTime)}</div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Message</label>
              <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{provider.message}</div>
            </div>
            
            {provider.testedAt && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Last Tested</label>
                <div className="text-sm text-slate-600">{new Date(provider.testedAt).toLocaleString()}</div>
              </div>
            )}
            
            {provider.rateLimitExpiry && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Rate Limit Expires</label>
                <div className="text-sm text-amber-700 font-medium bg-amber-50 p-2 rounded-lg">
                  {new Date(provider.rateLimitExpiry).toLocaleString()}
                </div>
              </div>
            )}
            
            {provider.errorType && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Error Type</label>
                <div className="text-sm text-rose-700 font-medium bg-rose-50 p-2 rounded-lg">{provider.errorType}</div>
              </div>
            )}
          </div>
          
          <div className="mt-8 flex space-x-3">
            <button
              onClick={() => testSpecificProvider(provider.key)}
              disabled={testingProvider === provider.key}
              className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {testingProvider === provider.key ? 'Testing...' : 'Test Provider'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={refetch}
      skeleton={<AIServicesSkeleton />}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Providers</h2>
            <p className="text-slate-600">Monitor and test AI service connectivity</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh all providers"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh All
          </button>
        </div>

        {/* Performance Overview */}
        {aiData?.timing && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Performance Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-emerald-100">
                <div className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Fastest</div>
                <div className="text-2xl font-bold text-emerald-700">{aiData.timing.fastest.time}</div>
                <div className="text-sm text-slate-600">{aiData.timing.fastest.provider}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-blue-100">
                <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Average</div>
                <div className="text-2xl font-bold text-blue-700">{aiData.timing.average}</div>
                <div className="text-sm text-slate-600">{aiData.timing.tested} tested</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-amber-100">
                <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Slowest</div>
                <div className="text-2xl font-bold text-amber-700">{aiData.timing.slowest.time}</div>
                <div className="text-sm text-slate-600">{aiData.timing.slowest.provider}</div>
              </div>
            </div>
          </div>
        )}

        {/* Provider Cards */}
        {aiData && (
          <div className="grid gap-4">
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
              .map((provider, index) => {
                const performanceCategory = getPerformanceCategory(provider.responseTime);
                
                return (
                  <div 
                    key={provider.key || index} 
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-200 cursor-pointer group"
                    onClick={() => setSelectedProviderForModal(provider)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl group-hover:scale-110 transition-transform duration-200">
                          {getProviderIcon(provider.name)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{provider.name}</h3>
                          <p className="text-sm text-slate-500 mt-1">{provider.message}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            performanceCategory === 'excellent' ? 'text-emerald-600' :
                            performanceCategory === 'good' ? 'text-blue-600' :
                            performanceCategory === 'fair' ? 'text-amber-600' :
                            performanceCategory === 'slow' ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                            {formatResponseTime(provider.responseTime)}
                          </div>
                          {provider.testedAt && (
                            <div className="text-xs text-slate-400 mt-1">
                              {new Date(provider.testedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            testSpecificProvider(provider.key);
                          }}
                          disabled={testingProvider === provider.key}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-full transition-colors disabled:opacity-50"
                          title={`Test ${provider.name}`}
                        >
                          {testingProvider === provider.key ? (
                            <div className="animate-spin">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                        </button>
                        
                        {getProviderStatusBadge(provider.status)}
                      </div>
                    </div>
                    
                    {provider.rateLimitExpiry && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-xs font-medium text-amber-700 mb-1">Rate Limited</div>
                        <div className="text-sm text-amber-700">
                          Until: {new Date(provider.rateLimitExpiry).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Summary */}
        {aiData && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex justify-between items-center text-sm">
              <div className="flex space-x-6 text-slate-600">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  {aiData.summary.operational} Operational
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-sky-500 rounded-full mr-2"></span>
                  {aiData.summary.configured} Configured
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

        {/* Modal */}
        {selectedProviderForModal && (
          <ProviderDetailModal 
            provider={selectedProviderForModal} 
            onClose={() => setSelectedProviderForModal(null)} 
          />
        )}
      </div>
    </SectionWrapper>
  );
};

export const AIProviderManagementSection: React.FC = () => {
  return <AIProviderManagementContent />;
};

export default AIProviderManagementSection;

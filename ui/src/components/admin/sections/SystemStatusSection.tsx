import React, { useState } from 'react';
import { useSystemStatus } from '../../../hooks/useAdminData';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { SectionWrapper } from '../ErrorBoundary';
import { SystemStatusSkeleton } from '../skeletons';

const SystemStatusContent: React.FC = () => {
  const { token } = useAdminAuth();
  const { data: status, isLoading, error, refetch } = useSystemStatus(token);
  const [testingService, setTestingService] = useState<string | null>(null);
  
  // Service name mapping for API calls
  const serviceApiNames: { [key: string]: string } = {
    'MongoDB Database': 'mongodb',
    'S3 Image Bucket': 's3',
    'API Gateway': 'api_gateway',
    'Lambda Functions': 'lambda',
    'Backup System': 'backup',
    'Infrastructure': 'terraform',
    'Security & SSL': 'security',
    'Performance & CDN': 'performance'
  };

  const handleIndividualTest = async (serviceName: string) => {
    const apiServiceName = serviceApiNames[serviceName];
    if (!apiServiceName) return;
    
    setTestingService(serviceName);
    
    try {
      // Use the admin API to test individual service
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? 'https://your-production-api.com' 
        : 'http://localhost:3000';
        
      const result = await fetch(`${API_BASE_URL}/admin/system-status?service=${apiServiceName}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (result.ok) {
        console.log(`✅ Individual test completed for ${serviceName}`);
        // Refresh the full status to update the UI
        refetch();
      } else {
        console.error(`❌ Individual test failed for ${serviceName}`);
      }
    } catch (error) {
      console.error('Individual service test failed:', error);
    } finally {
      setTestingService(null);
    }
  };

  const services = [
    {
      name: 'MongoDB Database',
      status: status?.services?.mongodb?.status || 'unknown',
      icon: '�️',
      message: status?.services?.mongodb?.message || 'Database connection status unknown',
      stats: status?.services?.mongodb?.stats || null
    },
    {
      name: 'S3 Image Bucket',
      status: status?.services?.s3?.status || 'unknown',
      icon: '🖼️',
      message: status?.services?.s3?.message || 'Image storage status unknown',
      stats: status?.services?.s3?.stats || null
    },
    {
      name: 'API Gateway',
      status: status?.services?.api_gateway?.status || 'unknown',
      icon: '🌐',
      message: status?.services?.api_gateway?.message || 'API Gateway status unknown',
      stats: status?.services?.api_gateway?.stats || null
    },
    {
      name: 'Lambda Functions',
      status: status?.services?.lambda?.status || 'unknown',
      icon: '🚀',
      message: status?.services?.lambda?.message || 'Lambda functions status unknown',
      stats: status?.services?.lambda?.stats || null
    },
    {
      name: 'Backup System',
      status: status?.services?.backup?.status || 'unknown',
      icon: '�',
      message: status?.services?.backup?.message || 'Backup status unknown',
      stats: status?.services?.backup?.stats || null
    },
    {
      name: 'Infrastructure',
      status: status?.services?.terraform?.status || 'unknown',
      icon: '⚙️',
      message: status?.services?.terraform?.message || 'Infrastructure state unknown',
      stats: status?.services?.terraform?.stats || null
    },
    {
      name: 'Security & SSL',
      status: status?.services?.security?.status || 'unknown',
      icon: '🔒',
      message: status?.services?.security?.message || 'Security status unknown',
      stats: status?.services?.security?.stats || null
    },
    {
      name: 'Performance & CDN',
      status: status?.services?.performance?.status || 'unknown',
      icon: '📊',
      message: status?.services?.performance?.message || 'Performance status unknown',
      stats: status?.services?.performance?.stats || null
    }
  ];

  return (
    <SectionWrapper
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      skeleton={<SystemStatusSkeleton />}
      title="Failed to load system status"
    >
      <div className="space-y-4">
        {/* Infrastructure Services Grid - AI Services Style */}
        <div className="space-y-2">
          {services.map((service, index) => (
            <div key={index} className="bg-slate-50 rounded-lg border border-slate-200 p-1 hover:shadow-sm transition-all duration-200 min-h-[30px]">
              {/* 11-column grid layout without badge column */}
              <div className="grid grid-cols-11 gap-3 items-center">
                
                {/* Status + Service Icon & Name - Col 1-4 */}
                <div className="col-span-4 flex items-center space-x-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    service.status === 'operational' || service.status === 'success' ? 'bg-emerald-500' :
                    service.status === 'degraded' ? 'bg-amber-500' :
                    service.status === 'error' || service.status === 'failed' ? 'bg-rose-500' :
                    'bg-slate-400'
                  }`} 
                  title={service.message}
                  />
                  <span className="text-lg flex-shrink-0">{service.icon}</span>
                  <span className="text-sm font-medium text-slate-900 truncate">{service.name}</span>
                </div>

                {/* Key Metrics - Col 5-8 */}
                <div className="col-span-4 text-right pr-3 text-xs text-slate-600 min-w-0">
                  {/* MongoDB Metrics */}
                  {service.name === 'MongoDB Database' && service.stats && (
                    <span className="truncate">
                      {String((service.stats as Record<string, unknown>).environment || 'MongoDB')} • {Number((service.stats as Record<string, unknown>).totalRecipes || 0)} recipes
                    </span>
                  )}
                  
                  {/* S3 Image Bucket Metrics */}
                  {service.name === 'S3 Image Bucket' && service.stats && (
                    <span className="truncate">
                      {Number((service.stats as Record<string, unknown>).imageObjects || 0)} images • {String((service.stats as Record<string, unknown>).imageSize || '0 MB')}
                    </span>
                  )}
                  
                  {/* API Gateway Metrics */}
                  {service.name === 'API Gateway' && service.stats && (
                    <span className="truncate">
                      {String((service.stats as Record<string, unknown>).responseTime || 'N/A')} • {String((service.stats as Record<string, unknown>).httpStatus || 'N/A')}
                    </span>
                  )}
                  
                  {/* Lambda Metrics */}
                  {service.name === 'Lambda Functions' && service.stats && (
                    <span className="truncate">
                      {Number((service.stats as Record<string, unknown>).mrbAdminFunctions || 0)} mrb-admin • {Number((service.stats as Record<string, unknown>).totalFunctions || 0)} total
                    </span>
                  )}
                  
                  {/* Backup Metrics */}
                  {service.name === 'Backup System' && service.stats && (
                    <span className="truncate">
                      {Number((service.stats as Record<string, unknown>).totalBackupFolders || 0)} backup folders
                    </span>
                  )}
                  
                  {/* Infrastructure Metrics */}
                  {service.name === 'Infrastructure' && service.stats && (
                    <span className="truncate">
                      {String((service.stats as Record<string, unknown>).environment || 'unknown')} • {(service.stats as Record<string, unknown>).awsConfigured ? 'AWS ✓' : 'AWS ✗'}
                    </span>
                  )}
                  
                  {/* Security Metrics */}
                  {service.name === 'Security & SSL' && service.stats && (
                    <span className="truncate">
                      Auth0: {(service.stats as Record<string, unknown>).configurationComplete ? 'Complete' : 'Incomplete'} • CORS: {(service.stats as Record<string, unknown>).corsEnabled ? '✓' : '✗'}
                    </span>
                  )}
                  
                  {/* Performance Metrics */}
                  {service.name === 'Performance & CDN' && service.stats && (
                    <span className="truncate">
                      Memory: {String((service.stats as Record<string, unknown>).memoryPercentage || 'N/A')} • {String((service.stats as Record<string, unknown>).uptime || 'N/A')}
                    </span>
                  )}
                  
                  {/* Fallback for services without stats */}
                  {!service.stats && (
                    <span className="text-slate-400 truncate">No metrics available</span>
                  )}
                </div>

                {/* Test Button - Col 9-11 */}
                <div className="col-span-3 flex justify-center pl-2">
                  <button
                    onClick={() => handleIndividualTest(service.name)}
                    disabled={testingService === service.name}
                    className={`p-0.5 transition-colors text-lg ${
                      testingService === service.name 
                        ? 'text-blue-500 animate-spin' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={`Test ${service.name}`}
                  >
                    {testingService === service.name ? '⟳' : '🔄'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Simple Footer with refresh time */}
        {status && (
          <div className="pt-4 border-t border-slate-200">
            <div className="flex justify-end">
              <span className="text-xs text-slate-500">
                Updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

export default SystemStatusContent;

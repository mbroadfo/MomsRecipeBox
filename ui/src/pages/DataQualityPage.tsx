// Data Quality Admin Page
import React, { useState, useEffect, useContext, useCallback } from 'react';
import AdminContext from '../contexts/AdminContext';
import { adminApi } from '../utils/adminApi';
import { showToast, ToastType } from '../components/Toast';

interface MongoDBStats {
  totalRecipes?: number;
  cleanRecipes?: number;
  dataQualityPercentage?: number;
  environment?: string;
  dbName?: string;
  lastChecked?: string;
}

interface ServiceHealth {
  status: string;
  message: string;
  stats?: MongoDBStats;
}

const DataQualityPage: React.FC = () => {
  const context = useContext(AdminContext);
  const token = context?.token || null;
  
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<ServiceHealth | null>(null);

  const fetchDataQuality = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      
      // Get system status which includes MongoDB health and data quality
      const response = await adminApi.testSystemStatus(token);
      
      if (response.services?.mongodb) {
        setHealthData(response.services.mongodb);
        console.log('MongoDB health data:', response.services.mongodb);
      } else {
        showToast('Failed to load data quality information', ToastType.Error);
      }
    } catch (error) {
      console.error('Error fetching data quality:', error);
      showToast('Error loading data quality data', ToastType.Error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDataQuality();
  }, [fetchDataQuality]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'operational':
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'error':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getQualityGrade = (percentage: number): { grade: string; color: string } => {
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600' };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600' };
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600' };
    if (percentage >= 60) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data quality analysis...</p>
        </div>
      </div>
    );
  }

  if (!healthData || !healthData.stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Unable to load data quality information</p>
        </div>
      </div>
    );
  }

  const stats = healthData.stats;
  const dataQualityPercentage = stats.dataQualityPercentage ?? 0;
  const totalRecipes = stats.totalRecipes ?? 0;
  const cleanRecipes = stats.cleanRecipes ?? 0;
  const environment = stats.environment ?? 'Unknown';
  const dbName = stats.dbName ?? 'Unknown';
  const lastChecked = stats.lastChecked ?? new Date().toISOString();

  const { grade, color } = getQualityGrade(dataQualityPercentage);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Quality Dashboard</h1>
        <p className="text-gray-600">Database health and recipe quality analysis</p>
      </div>

      {/* Overall Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Overall Database Health</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(healthData.status)}`}>
            {healthData.status.toUpperCase()}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Environment</div>
            <div className="text-2xl font-bold text-gray-900">{environment}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Database</div>
            <div className="text-lg font-semibold text-gray-900">{dbName}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Last Checked</div>
            <div className="text-sm font-medium text-gray-900">
              {new Date(lastChecked).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality Score Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Quality Score</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quality Percentage */}
          <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8">
            <div className="text-center">
              <div className={`text-7xl font-bold ${color} mb-2`}>{grade}</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {dataQualityPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Clean Recipes</div>
            </div>
          </div>

          {/* Recipe Stats */}
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-900">Clean Recipes</span>
                <span className="text-2xl font-bold text-green-700">{cleanRecipes}</span>
              </div>
              <div className="mt-2 text-xs text-green-700">
                Recipes with complete required fields
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Total Recipes</span>
                <span className="text-2xl font-bold text-blue-700">{totalRecipes}</span>
              </div>
              <div className="mt-2 text-xs text-blue-700">
                All recipes in database
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-900">Needs Attention</span>
                <span className="text-2xl font-bold text-orange-700">
                  {totalRecipes - cleanRecipes}
                </span>
              </div>
              <div className="mt-2 text-xs text-orange-700">
                Recipes with data quality issues
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Criteria */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Quality Criteria</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-2">🚨 Critical Issues</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="mr-2">•</span>
                <span>Missing title - Recipe cannot be identified</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">•</span>
                <span>Missing ingredients - Cannot cook the recipe</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">•</span>
                <span>Missing instructions - No cooking guidance</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-2">⚠️ High Priority Issues</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="mr-2">•</span>
                <span>Empty ingredients array - Data structure present but no content</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">•</span>
                <span>Empty instructions array - No cooking steps defined</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-2">🟡 Medium Priority Issues</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="mr-2">•</span>
                <span>Missing time information - No cooking duration</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">•</span>
                <span>Missing yield information - Serving size unknown</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-2">🔵 Low Priority Issues</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="mr-2">•</span>
                <span>Missing description - No recipe overview</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">•</span>
                <span>Missing optional metadata - Tags, categories, etc.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Improvement Recommendations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">💡 Recommendations</h2>
        
        <div className="space-y-3">
          {dataQualityPercentage < 70 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    <strong>Critical:</strong> Data quality is below 70%. Immediate action required to improve recipe completeness.
                  </p>
                </div>
              </div>
            </div>
          )}

          {dataQualityPercentage >= 70 && dataQualityPercentage < 90 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Good:</strong> Data quality is acceptable but could be improved. Focus on completing missing optional fields.
                  </p>
                </div>
              </div>
            </div>
          )}

          {dataQualityPercentage >= 90 && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    <strong>Excellent:</strong> Data quality is very high. Continue maintaining recipe completeness standards.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <div className="ml-3">
              <p className="text-sm text-blue-700 font-semibold mb-2">Suggested Actions:</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Review recipes with missing critical fields (title, ingredients, instructions)</li>
                <li>• Add time and yield information to improve recipe usability</li>
                <li>• Encourage recipe descriptions for better searchability</li>
                <li>• Use the AI assistant to help complete incomplete recipes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchDataQuality}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh Data Quality Analysis'}
        </button>
      </div>
    </div>
  );
};

export default DataQualityPage;

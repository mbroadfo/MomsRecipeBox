import React, { useState, useEffect } from 'react';
import { UserStatistics } from '../components/admin/UserStatistics';
import { adminApi } from '../utils/adminApi';
import type { AdminUserListResponse } from '../auth/types';

export const AdminDashboard: React.FC = () => {
  const [userStats, setUserStats] = useState<AdminUserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionTest, setConnectionTest] = useState<{ status: string; message: string } | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    overall_status: 'operational' | 'degraded';
    services: {
      s3: { status: string; message: string };
      ai: { status: string; message: string; provider?: string };
    };
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
    testApiConnection();
    testSystemConnectivity();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load user statistics for dashboard
      const response = await adminApi.listUsers(1);
      setUserStats(response);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    try {
      const result = await adminApi.testConnection();
      setConnectionTest(result);
    } catch (err) {
      setConnectionTest({
        status: 'error',
        message: 'Connection test failed'
      });
    }
  };

  const testSystemConnectivity = async () => {
    try {
      const result = await adminApi.testSystemStatus();
      setSystemStatus(result);
    } catch (err) {
      console.error('System connectivity test failed:', err);
      setSystemStatus({
        overall_status: 'degraded',
        services: {
          s3: { status: 'error', message: 'S3 connectivity test failed' },
          ai: { status: 'error', message: 'AI connectivity test failed' }
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Manage users, moderate content, and monitor system performance.
        </p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Admin API Status */}
        {connectionTest && (
          <div className={`rounded-lg p-4 ${
            connectionTest.status === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {connectionTest.status === 'success' ? (
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div>
                <span className={`text-sm font-medium ${
                  connectionTest.status === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  Admin API
                </span>
                <p className={`text-xs ${
                  connectionTest.status === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {connectionTest.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* S3 Status */}
        {systemStatus?.services.s3 && (
          <div className={`rounded-lg p-4 ${
            systemStatus.services.s3.status === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {systemStatus.services.s3.status === 'success' ? (
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div>
                <span className={`text-sm font-medium ${
                  systemStatus.services.s3.status === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  S3 Storage
                </span>
                <p className={`text-xs ${
                  systemStatus.services.s3.status === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {systemStatus.services.s3.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Service Status */}
        {systemStatus?.services.ai && (
          <div className={`rounded-lg p-4 ${
            systemStatus.services.ai.status === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {systemStatus.services.ai.status === 'success' ? (
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div>
                <span className={`text-sm font-medium ${
                  systemStatus.services.ai.status === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  AI Assistant
                  {systemStatus.services.ai.provider && (
                    <span className="ml-1 text-xs">({systemStatus.services.ai.provider})</span>
                  )}
                </span>
                <p className={`text-xs ${
                  systemStatus.services.ai.status === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {systemStatus.services.ai.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overall System Status Banner */}
      {systemStatus && (
        <div className={`rounded-lg p-4 ${
          systemStatus.overall_status === 'operational'
            ? 'bg-blue-50 border border-blue-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {systemStatus.overall_status === 'operational' ? (
                <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
              <div>
                <h3 className={`font-medium ${
                  systemStatus.overall_status === 'operational' ? 'text-blue-800' : 'text-yellow-800'
                }`}>
                  System Status: {systemStatus.overall_status === 'operational' ? 'All Systems Operational' : 'System Degraded'}
                </h3>
                <p className={`text-sm ${
                  systemStatus.overall_status === 'operational' ? 'text-blue-600' : 'text-yellow-600'
                }`}>
                  {systemStatus.overall_status === 'operational' 
                    ? 'All core services are running normally'
                    : 'One or more services are experiencing issues'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                testApiConnection();
                testSystemConnectivity();
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                systemStatus.overall_status === 'operational'
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button 
                onClick={() => {
                  loadDashboardData();
                  testApiConnection();
                  testSystemConnectivity();
                }}
                className="mt-2 text-sm text-red-800 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Statistics */}
      {userStats && (
        <UserStatistics 
          stats={userStats.stats} 
          users={userStats.users} 
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">User Management</h3>
          </div>
          <p className="text-gray-600 mb-4">
            View, invite, and manage users in the system.
          </p>
          <a 
            href="/admin/users"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Manage Users
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Recipe Moderation</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Review and moderate user-submitted recipes.
          </p>
          <button 
            disabled
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
          >
            Coming Soon
            <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
              Phase 3
            </span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Analytics</h3>
          </div>
          <p className="text-gray-600 mb-4">
            View detailed analytics and system reports.
          </p>
          <button 
            disabled
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
          >
            Coming Soon
            <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
              Phase 4
            </span>
          </button>
        </div>
      </div>

      {/* Recent Activity Preview */}
      {userStats && userStats.users.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Users</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {userStats.users.slice(0, 5).map((user) => (
                <div key={user.user_id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.firstName?.[0] || user.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">
                      {user.loginCount} logins
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never logged in'
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <a 
                href="/admin/users"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all users →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

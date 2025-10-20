import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAdminAuth } from '../../contexts/AdminContext';
import { useNavigate } from 'react-router-dom';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isLoading } = useAuth0();
  const { isAuthenticated, isAdmin, login, token } = useAdminAuth();
  const navigate = useNavigate();

  // Wait for both Auth0 and AdminContext to fully initialize
  const isInitializing = isLoading || (isAuthenticated && !token);

  // Redirect to home if authenticated but not admin (only after full initialization)
  useEffect(() => {
    if (isAuthenticated && !isLoading && token && !isAdmin) {
      console.log('🚫 User is authenticated but not admin, redirecting to home');
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate, token]);

  // Show loading state while Auth0 is loading or while we're waiting for token
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoading ? 'Authenticating...' : 'Loading admin access...'}
          </p>
        </div>
      </div>
    );
  }

  // Trigger Auth0 login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-6">
            <svg className="mx-auto h-16 w-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 1.732a8.962 8.962 0 0012 0M12 15V9.5a2.5 2.5 0 10-5 0V12H5.5a2.5 2.5 0 000 5.196"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-6">
            You need to sign in to access the admin area.
          </p>
          <button
            onClick={() => login()}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In with Auth0
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated and has admin privileges, and token is available
  return <>{children}</>;
};

export default AdminProtectedRoute;

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import type { ReactNode } from 'react';
import type { AuthContextType } from '../auth/types';
import { isUserAdmin } from '../auth/types';

interface AdminProviderProps {
  children: ReactNode;
}

const AdminContext = createContext<AuthContextType | undefined>(undefined);

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const { user: auth0User, isAuthenticated: auth0IsAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect, logout: auth0Logout } = useAuth0();
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const initializeAuth = useCallback(async () => {
    try {
      setAuthError(null); // Clear any previous errors
      
      if (auth0IsAuthenticated && auth0User) {
        // Get the access token for API calls
        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
        
        setToken(accessToken);
        setIsAdmin(isUserAdmin(auth0User));
      }
    } catch (error) {
      console.error('Error getting Auth0 access token:', error);
      setAuthError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback to development mode for now
      if (import.meta.env.DEV) {
        setupTestAdmin();
      }
    }
  }, [auth0IsAuthenticated, auth0User, getAccessTokenSilently]);

  useEffect(() => {
    // Initialize auth state when Auth0 loads
    if (!isLoading) {
      initializeAuth();
    }
  }, [isLoading, initializeAuth]);

  // Retry authentication (useful for token refresh issues)
  const retryAuth = async () => {
    await initializeAuth();
  };

  const setupTestAdmin = () => {
    // Only for development when Auth0 fails - simplified mock
    const testToken = 'test-admin-token';
    
    setToken(testToken);
    setIsAdmin(true);
  };

  const login = () => {
    loginWithRedirect();
  };

  const logout = () => {
    setToken(null);
    setIsAdmin(false);
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const checkAdminStatus = (): boolean => {
    return isAdmin && !!auth0User && isUserAdmin(auth0User);
  };

  const contextValue: AuthContextType = {
    user: auth0User,
    isAuthenticated: auth0IsAuthenticated,
    isAdmin,
    token,
    login,
    logout,
    checkAdminStatus,
    retryAuth,
    authError
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminContext;

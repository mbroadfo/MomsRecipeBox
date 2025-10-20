import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import type { ReactNode } from 'react';
import type { AuthContextType } from '../auth/types';
import { isUserAdmin, checkUserIsAdmin, checkAppMetadataRole } from '../auth/types';

interface AdminProviderProps {
  children: ReactNode;
}

const AdminContext = createContext<AuthContextType | undefined>(undefined);

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const { user: auth0User, isAuthenticated: auth0IsAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect, logout: auth0Logout } = useAuth0();
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize auth state when Auth0 loads
    if (!isLoading) {
      initializeAuth();
    }
  }, [isLoading, auth0IsAuthenticated, auth0User]);

  const initializeAuth = async () => {
    try {
      setAuthError(null); // Clear any previous errors
      
      console.log('🔄 AdminContext: Initializing auth...', {
        auth0IsAuthenticated,
        hasAuth0User: !!auth0User,
        userEmail: auth0User?.email
      });
      
      if (auth0IsAuthenticated && auth0User) {
        console.log('🔍 Getting access token with audience:', import.meta.env.VITE_AUTH0_AUDIENCE);
        
        // Get the access token for API calls
        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });
        
        setToken(accessToken);
        setIsAdmin(isUserAdmin(auth0User));
        
        console.log('🔐 Auth0 authenticated:', {
          user: auth0User.email,
          isAdmin: isUserAdmin(auth0User),
          tokenLength: accessToken.length,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE
        });
        
        // Debug: Let's also decode and log the token payload to see what audience it contains
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          console.log('🎫 Token payload:', {
            aud: payload.aud,
            iss: payload.iss,
            sub: payload.sub,
            exp: new Date(payload.exp * 1000).toISOString(),
            scope: payload.scope
          });
        } catch (e) {
          console.log('🎫 Could not decode token payload:', e);
        }
        
        // Debug: Log the full user object to see what's available
        console.log('🔍 Full Auth0 user object:', auth0User);
        console.log('🔍 User app_metadata:', auth0User.app_metadata);
        console.log('🔍 User custom claims (shared tenant):', {
          momsRoles: auth0User[`https://momsrecipebox.app/roles`],
          cruiseRoles: auth0User[`https://cruise-viewer.app/roles`],
          appMetadataRole: auth0User.app_metadata?.role
        });
      } else {
        // User not authenticated
        setToken(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error getting Auth0 access token:', error);
      setAuthError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback to development mode for now
      if (import.meta.env.DEV) {
        console.log('🔧 Development mode: Using mock admin for testing');
        setupTestAdmin();
      }
    }
  };

  // Retry authentication (useful for token refresh issues)
  const retryAuth = async () => {
    console.log('🔄 Retrying authentication...');
    await initializeAuth();
  };

  const setupTestAdmin = () => {
    // Only for development when Auth0 fails - simplified mock
    const testToken = 'test-admin-token';
    
    setToken(testToken);
    setIsAdmin(true);
    
    console.log('⚠️ Using mock admin token for development');
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

export const useAdminAuth = (): AuthContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminProvider');
  }
  return context;
};

export default AdminContext;

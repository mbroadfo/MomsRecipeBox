import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthContextType } from '../auth/types';
import { isUserAdmin } from '../auth/types';

interface AdminProviderProps {
  children: ReactNode;
}

const AdminContext = createContext<AuthContextType | undefined>(undefined);

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Initialize auth state
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // For development/testing - we'll update this with your actual auth implementation
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user_data');
      
      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        setIsAuthenticated(true);
        setIsAdmin(isUserAdmin(userData));
      } else {
        // Check if we're in development mode and set up test admin
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: Setting up test admin user');
          setupTestAdmin();
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  };

  const setupTestAdmin = () => {
    // For development testing - create a mock admin user
    const testAdminUser = {
      sub: 'auth0|testadmin',
      email: 'admin@test.com',
      name: 'Test Admin',
      given_name: 'Test',
      family_name: 'Admin',
      'https://momsrecipebox.app/roles': ['admin'],
      app_metadata: {
        role: 'admin'
      }
    };
    
    const testToken = 'test-admin-token';
    
    setUser(testAdminUser);
    setToken(testToken);
    setIsAuthenticated(true);
    setIsAdmin(true);
    
    // Store for persistence during development
    localStorage.setItem('auth_token', testToken);
    localStorage.setItem('user_data', JSON.stringify(testAdminUser));
  };

  const login = () => {
    // This will be implemented with your actual Auth0 login
    console.log('Login function called - implement with Auth0');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  };

  const checkAdminStatus = (): boolean => {
    return isAdmin && user && isUserAdmin(user);
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isAdmin,
    token,
    login,
    logout,
    checkAdminStatus
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

// File: ui/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { apiClient } from './lib/api-client';
import { HomePage } from './pages/HomePage';
import { RecipeDetail } from './components/RecipeDetail';
import ShoppingListPage from './components/shoppingList/ShoppingListPage';
import { UserProfileEditor } from './components/profile/UserProfile';
import { Layout } from './components/layout';
import CallbackPage from './pages/CallbackPage';

// Admin Components
import { AdminProvider } from './contexts/AdminContext';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminErrorBoundary from './components/admin/AdminErrorBoundary';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import UserManagementPage from './pages/UserManagementPage';
import AnalyticsPage from './pages/AnalyticsPage';

// Authentication wrapper component
const AuthenticatedApp: React.FC = () => {
  const { isLoading, isAuthenticated, loginWithRedirect, error, user, getAccessTokenSilently } = useAuth0();

  // Handle automatic login redirect - must be at top level
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && !error) {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect, error]);

  // Set current user ID on window for global access and configure API client with Auth0 token
  React.useEffect(() => {
    if (isAuthenticated && user) {
      window.currentUser = { id: user.sub || 'unknown' };
      window.currentUserId = user.sub || 'unknown';
      
      // Configure API client with Auth0 token
      getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://momsrecipebox/api',
        },
      }).then((token) => {
        apiClient.setAuthToken(token);
      }).catch((error) => {
        console.error('❌ Failed to get Auth0 token:', error);
        // Clear any existing token on error
        apiClient.clearAuthToken();
      });
    } else if (!isAuthenticated && !isLoading) {
      // Only clear token when definitely not authenticated (not during loading)
      apiClient.clearAuthToken();
    }
  }, [isAuthenticated, user, getAccessTokenSilently, isLoading]);

  // Show loading spinner while Auth0 initializes
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if Auth0 failed to initialize
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Error</h1>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <div className="text-left bg-gray-100 p-4 rounded text-sm mb-4">
              <p><strong>Error Details:</strong></p>
              <p>Domain: dev-jdsnf3lqod8nxlnv.us.auth0.com</p>
              <p>Redirect URI: {window.location.origin}/callback</p>
              <p>Current URL: {window.location.href}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated, show loading state while redirect happens
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // User is authenticated - show the full application
  return (
    <Routes>
      {/* Auth0 Callback Route */}
      <Route path="/callback" element={<CallbackPage />} />
      
      {/* Admin Routes - wrapped with AdminProvider only for admin section */}
      <Route path="/admin/*" element={
        <AdminProvider>
          <AdminRoutes />
        </AdminProvider>
      } />
      
      {/* Regular App Routes */}
      <Route path="/*" element={<AppRoutes />} />
    </Routes>
  );
};

const AppRoutes = () => {
  // Simplified - no more sidebar management
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* The "new" route must come before the :id route to prevent treating "new" as an ID */}
        <Route path="/recipe/new" element={<NewRecipeWrapper />} />
        <Route path="/recipe/:id" element={<RecipeDetailRouteWrapper />} />
        <Route path="/shopping-list" element={<ShoppingListPage />} />
        <Route path="/profile" element={<UserProfileEditor />} />
      </Routes>
    </Layout>
  );
};

const AdminRoutes = () => {
  return (
    <AdminProtectedRoute>
      <AdminErrorBoundary>
        <AdminLayout>
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/recipes" element={<div>Recipe Moderation - Coming Soon</div>} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </AdminLayout>
      </AdminErrorBoundary>
    </AdminProtectedRoute>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthenticatedApp />
    </BrowserRouter>
  );
};

// Wrapper to extract recipeId from route params and pass to RecipeDetail
import { useParams, useNavigate } from 'react-router-dom';
const RecipeDetailRouteWrapper: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  if (!id) return <div style={{ padding:'2rem' }}>Recipe not found</div>;
  // Always navigate to the recipe list when "Back to List" is clicked
  return <RecipeDetail recipeId={id} onBack={() => navigate('/')} />;
};

// Wrapper for creating a new recipe
const NewRecipeWrapper: React.FC = () => {
  const navigate = useNavigate();
  // Always navigate to the recipe list when "Back to List" is clicked
  return <RecipeDetail isNew={true} onBack={() => navigate('/')} />;
};

export default App;

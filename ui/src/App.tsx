// File: ui/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RecipeDetail } from './components/RecipeDetail';
import ShoppingListPage from './components/shoppingList/ShoppingListPage';
import { Layout } from './components/layout';

// Admin Components
import { AdminProvider } from './contexts/AdminContext';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import UserManagementPage from './pages/UserManagementPage';

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
      </Routes>
    </Layout>
  );
};

const AdminRoutes = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/recipes" element={<div>Recipe Moderation - Coming Soon</div>} />
          <Route path="/admin/analytics" element={<div>Analytics - Coming Soon</div>} />
        </Routes>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AdminProvider>
        <Routes>
          {/* Regular App Routes */}
          <Route path="/*" element={<AppRoutes />} />
          
          {/* Admin Routes */}
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Routes>
      </AdminProvider>
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

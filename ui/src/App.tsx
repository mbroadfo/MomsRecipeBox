// File: ui/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RecipeDetail } from './components/RecipeDetail';
import ShoppingListPage from './components/shoppingList/ShoppingListPage';
import { Layout } from './components/layout';

const AppRoutes = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  // For simplicity, we'll use window.innerWidth to determine initial drawer state
  // This would typically come from the HomePage component itself through a context or state management
  const [showSidebar, setShowSidebar] = React.useState(window.innerWidth >= 768);

  React.useEffect(() => {
    // Update drawer state when window is resized
    const handleResize = () => {
      setShowSidebar(window.innerWidth >= 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Custom event handler to update drawer state
    const handleToggleSidebar = () => {
      if (isHomePage) {
        setShowSidebar(prev => !prev);
      }
    };
    
    window.addEventListener('toggle-sidebar', handleToggleSidebar);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('toggle-sidebar', handleToggleSidebar);
    };
  }, [isHomePage]);

  return (
    <Layout 
      onToggleSidebar={isHomePage ? () => window.dispatchEvent(new Event('toggle-sidebar')) : undefined}
      showSidebar={showSidebar}
    >
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

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
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

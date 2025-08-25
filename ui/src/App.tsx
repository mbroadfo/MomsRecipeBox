// File: ui/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RecipeDetail } from './components/RecipeDetail';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* The "new" route must come before the :id route to prevent treating "new" as an ID */}
        <Route path="/recipe/new" element={<NewRecipeWrapper />} />
        <Route path="/recipe/:id" element={<RecipeDetailRouteWrapper />} />
      </Routes>
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

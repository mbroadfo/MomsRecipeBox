// File: ui/src/components/RecipeDetail.tsx
import React, { useEffect, useState } from 'react';
import './RecipeDetail.css';

interface RecipeDetailProps {
  recipeId: string;
  onBack: () => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipeId, onBack }) => {
  const [recipe, setRecipe] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/recipes/${recipeId}`)
      .then((res) => res.json())
      .then((data) => {
        console.log('RecipeDetail API response:', data);
        setRecipe(data);
      })
      .catch((err) => {
        console.error('Error loading recipe detail:', err);
      });
  }, [recipeId]);

  if (!recipe) return <p>Loading...</p>;

  return (
    <div className="recipe-detail max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <button className="mb-4 text-blue-600 underline" onClick={onBack}>← Back to list</button>
      <header className="recipe-detail__header mb-6">
        {recipe.image_url && (
          <img src={recipe.image_url} alt={recipe.title} className="recipe-detail__image mb-4 rounded-xl w-full max-w-md object-cover" style={{maxHeight: '320px'}} />
        )}
        <h1 className="recipe-detail__title text-3xl font-bold mb-2 text-center">{recipe.title}</h1>
        {recipe.subtitle && <p className="text-lg text-gray-600 mb-2 text-center">{recipe.subtitle}</p>}
        <div className="flex flex-wrap gap-2 justify-center mb-2">
          {recipe.tags?.map((tag: string, idx: number) => (
            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">{tag}</span>
          ))}
        </div>
        <div className="flex gap-6 justify-center items-center text-gray-500 text-sm mb-2">
          {recipe.author && <span>By <span className="font-semibold text-gray-700">{recipe.author}</span></span>}
          {recipe.source && <span>Source: {recipe.source}</span>}
          {recipe.yield && <span>Yield: {recipe.yield}</span>}
          {recipe.time?.total && <span>Time: {recipe.time.total}</span>}
        </div>
        <div className="flex gap-8 justify-center items-center text-lg font-bold mt-2">
          <span className="flex items-center gap-2 text-red-500">
            <svg width="20" height="20" fill="#e53e3e" stroke="#e53e3e" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 1.01 4.5 2.09C13.09 4.01 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            {recipe.favorites}
          </span>
          <span className="flex items-center gap-2 text-blue-500">
            <svg width="20" height="20" fill="#3182ce" stroke="#3182ce" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="7" width="18" height="10" rx="2" />
              <rect x="7" y="11" width="2" height="2" rx="1" fill="#fff" />
              <rect x="11" y="11" width="2" height="2" rx="1" fill="#fff" />
              <rect x="15" y="11" width="2" height="2" rx="1" fill="#fff" />
            </svg>
            {recipe.comments.length}
          </span>
        </div>
      </header>

      <section className="recipe-detail__ingredients mb-6">
        <h2 className="font-semibold text-xl mt-6 mb-2">Ingredients</h2>
        <ul className="list-disc ml-6">
          {recipe.ingredients?.map((ing: any, idx: number) => (
            <li key={idx} className="mb-1">{ing.quantity} {ing.name}</li>
          ))}
        </ul>
      </section>

      <section className="recipe-detail__notes mb-6">
        <h2 className="font-semibold text-xl mt-6 mb-2">Notes</h2>
        <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <div className="text-gray-800 whitespace-pre-line">{recipe.notes}</div>
        </div>
      </section>

      <section className="recipe-detail__comments mb-6">
        <h2 className="font-semibold text-xl mt-6 mb-2">Comments</h2>
        <ul className="list-none ml-0">
          {Array.isArray(recipe.comments) && recipe.comments.length > 0 ? (
            recipe.comments.map((comment: any, idx: number) => (
              <li key={idx} className="mb-4 p-3 bg-gray-100 rounded">
                <div className="font-semibold text-gray-700 mb-1">{comment.author || 'Anonymous'} <span className="text-xs text-gray-500">{comment.date ? `(${comment.date})` : ''}</span></div>
                <div className="text-gray-800">{comment.text || comment.content}</div>
              </li>
            ))
          ) : (
            <li className="text-gray-500">No comments yet.</li>
          )}
        </ul>
      </section>

      <footer className="recipe-detail__footer flex gap-4 justify-center">
        <button className="recipe-detail__save-button px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors">
          Save Recipe
        </button>
        <button className="recipe-detail__rate-button px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors">
          Rate Recipe
        </button>
      </footer>
    </div>
  );
};

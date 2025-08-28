import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipe } from './hooks/useRecipe';
import { useNewRecipe } from './hooks/useNewRecipe';
import { useWorkingRecipe, buildSavePayload } from './hooks/useWorkingRecipe';
import { useImageUpload } from './hooks/useImageUpload';
import { Header } from './parts/Header';
import { Tags } from './parts/Tags';
import { Subtitle } from './parts/Subtitle';
import { Meta } from './parts/Meta';
import { YieldTime } from './parts/YieldTime';
import { IngredientsView } from './parts/IngredientsView';
import { IngredientsEditor } from './parts/IngredientsEditor';
import { InstructionsView } from './parts/InstructionsView';
import { Notes } from './parts/Notes';
import { Comments } from './parts/Comments';
import { ImagePane } from './parts/ImagePane';
import { StepsEditor } from './parts/StepsEditor';
import '../RecipeDetail.css';

interface Props { recipeId?: string; isNew?: boolean; onBack: () => void; }
export const RecipeDetailContainer: React.FC<Props> = ({ recipeId, isNew = false, onBack }) => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(isNew);
  const [saving, setSaving] = useState(false);
  
  // For existing recipes
  const { recipe: existingRecipe, loading: existingLoading, error: existingError, refresh } = 
    !isNew && recipeId ? useRecipe(recipeId) : { recipe: null, loading: false, error: null, refresh: () => {} };
  
  // For new recipes
  const newRecipeHook = useNewRecipe();
  const { recipe: newRecipe, loading: newLoading, error: newError } = 
    isNew ? newRecipeHook : { recipe: null, loading: false, error: null };
  const saveNewRecipe = isNew ? newRecipeHook.saveNewRecipe : null;
  
  // If we're on the new recipe page, set edit mode to true
  useEffect(() => {
    if (isNew) {
      setEditMode(true);
    }
  }, [isNew]);
  
  // Combine states for unified handling
  const recipe = isNew ? newRecipe : existingRecipe;
  const loading = isNew ? newLoading : existingLoading;
  const error = isNew ? newError : existingError;
  
  // Clean up any temp image data when navigating away
  useEffect(() => {
    return () => {
      if (isNew) {
        localStorage.removeItem('newRecipe_tempImageUrl');
      }
    };
  }, [isNew]);
  
  const { working, patch, addTag, removeTag, updateIngredient, addIngredient, removeIngredient, moveIngredientItem } = 
    useWorkingRecipe(recipe, editMode);
  
  // For image uploads - need to handle both new and existing recipes
  const [tempId] = useState(() => `temp-${Date.now()}`);
  const effectiveId = recipeId || tempId; // Use tempId for new recipes until they're saved
  
  const { uploading, error: uploadError, upload, lastUploadTime } = useImageUpload(
    effectiveId, 
    (url) => { 
      patch({ image_url: url }); 
      // Store in localStorage for new recipes to retrieve later
      if (!recipeId) {
        localStorage.setItem('newRecipe_tempImageUrl', url);
      }
      // Refresh the recipe data to get updated metadata
      if (recipeId) {
        setTimeout(() => refresh(), 500);
      }
    }
  );

  const [liked, setLiked] = useState(() => {
    const raw: any = recipe;
    return !!raw?.liked;
  });

  // Sync liked state when a fresh recipe payload arrives (e.g., after navigation or refresh())
  useEffect(() => {
    if (recipe && Object.prototype.hasOwnProperty.call(recipe, 'liked')) {
      setLiked(!!(recipe as any).liked);
    }
  }, [recipe?._id, (recipe as any)?.liked]);

  const toggleLike = async () => {
    setLiked((l: boolean) => !l);
    try {
      const userId = (window as any).currentUser?.id || (window as any).currentUserId || 'demo-user';
      const resp = await fetch(`/api/recipes/${recipeId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      if (!resp.ok) throw new Error('Like toggle failed');
      const data = await resp.json();
      if (typeof data.liked === 'boolean') setLiked(data.liked);
      // Refresh recipe to sync liked & likes_count
      await refresh();
    } catch (e) {
      setLiked((l: boolean) => !l);
      console.error(e);
    }
  };

  const startEdit = () => setEditMode(true);
  const cancelEdit = () => { 
    if (isNew) {
      // When canceling a new recipe, go back to the previous page
      onBack();
    } else {
      // Just exit edit mode for existing recipes
      setEditMode(false); 
    }
  };
  
  // Handle back button click - always go back to recipe list for both new and existing recipes
  const handleBack = () => {
    // Use navigate to go back to the recipe list page
    navigate('/');
  };

  const save = async () => {
    setSaving(true);
    try {
      // Validate title
      if (!working.title.trim()) {
        alert("Recipe title is required");
        setSaving(false);
        return;
      }
      
      // Log working state to help debug
      console.log("Working recipe state:", {
        title: working.title,
        subtitle: working.subtitle,
        author: working.author,
        source: working.source,
        tags: working.tags,
        yield: working.yield,
        time: working.time,
        ingredients: working.ingredients,
        steps: working.steps,
        notes: working.notes,
        visibility: working.visibility,
        owner_id: working.owner_id
      });
      
      // Build save payload
      const payload = buildSavePayload(working);
      
      // Ensure we have all fields for a comprehensive save
      if (!payload.instructions && Array.isArray(payload.steps)) {
        payload.instructions = payload.steps;
      }
      
      console.log("Saving recipe with payload:", payload);
      console.log("Recipe fields present:", {
        hasTitle: !!payload.title,
        hasSubtitle: !!payload.subtitle,
        hasDescription: !!payload.description,
        hasAuthor: !!payload.author,
        hasSource: !!payload.source,
        tags: payload.tags,
        hasYield: !!payload.yield,
        time: payload.time,
        ingredients: payload.ingredients?.length || 0,
        steps: payload.steps?.length || 0,
        instructions: payload.instructions?.length || 0,
        notes: !!payload.notes,
        hasImageUrl: !!payload.image_url
      });
      
      if (isNew && saveNewRecipe) {
        // Creating a new recipe
        try {
          // Check for a temporary image that was uploaded
          const tempImageUrl = localStorage.getItem('newRecipe_tempImageUrl');
          if (tempImageUrl) {
            console.log("Found temporary image URL:", tempImageUrl);
            payload.image_url = tempImageUrl;
          }
          
          const newRecipeId = await saveNewRecipe(payload);
          if (newRecipeId) {
            console.log("Created recipe with ID:", newRecipeId);
            
            // If we have a temporary image, we'll need to copy it to the new ID
            if (tempImageUrl) {
              try {
                // Extract the filename part from the URL
                const urlParts = tempImageUrl.split('/');
                const filename = urlParts[urlParts.length - 1];
                
                // Tell the backend to copy the image from temp to permanent ID
                await fetch(`/api/recipes/${newRecipeId}/copy-image`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sourceKey: `${tempId}.${filename.split('.').pop()}`,
                    targetKey: `${newRecipeId}.${filename.split('.').pop()}`
                  })
                });
                
                // Clean up the localStorage
                localStorage.removeItem('newRecipe_tempImageUrl');
              } catch (imageErr) {
                console.error("Error copying temporary image:", imageErr);
                // Continue anyway, the recipe is saved
              }
            }
            
            // Navigate to the newly created recipe
            navigate(`/recipe/${newRecipeId}`);
          }
        } catch (err) {
          console.error("Error in saveNewRecipe:", err);
          alert(`Failed to save new recipe: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        // Updating an existing recipe
        try {
          const resp = await fetch(`/api/recipes/${recipeId}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
          });
          
          if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`Save failed (${resp.status}): ${errorText}`);
          }
          
          await refresh();
          setEditMode(false);
        } catch (err) {
          console.error("Error updating existing recipe:", err);
          alert(`Failed to update recipe: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (e: any) { 
      console.error("Error in save function:", e);
      alert(e.message); 
    } finally { 
      setSaving(false); 
    }
  };
  
  const deleteRecipe = async () => {
    try {
      const resp = await fetch(`/api/recipes/${recipeId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(`Delete failed (${resp.status})`);
      navigate('/');
    } catch (e: any) { 
      alert(e.message); 
    }
  };

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>;
  if (error || !recipe) return <p style={{ padding: '2rem' }}>Error loading recipe.</p>;

  return (
    <div className="recipe-page">
      <div className="recipe-left">{/* flex column; header separated from scroll area */}
        <Header
          title={working.title}
          editing={editMode}
          saving={saving}
          onTitleChange={v => patch({ title: v })}
          onEdit={startEdit}
          onSave={save}
          onCancel={cancelEdit}
          onBack={handleBack}
          liked={liked}
          onToggleLike={toggleLike}
          visibility={working.visibility}
          owner_id={working.owner_id}
          onVisibilityChange={patch}
        />
        <div className="recipe-left-scroll">{/* new scroll container */}
          <Subtitle value={working.subtitle} editing={editMode} onChange={v => patch({ subtitle: v })} />
          <Meta source={working.source as any} author={working.author} editing={editMode} onChange={patch} />
          <Tags tags={working.tags} editing={editMode} add={addTag} remove={removeTag} />
          <YieldTime yieldValue={working.yield} time={working.time} editing={editMode} onChange={patch} />
          {editMode ? (
            <IngredientsEditor
              groups={working.ingredients}
              update={updateIngredient}
              addItem={addIngredient}
              removeItem={removeIngredient}
              moveItem={moveIngredientItem}
            />
          ) : (
            <IngredientsView 
              groups={working.ingredients} 
              recipeId={recipeId || working?.original?._id}
              recipeTitle={working.title || "Recipe"}
            />
          )}
          {editMode ? (
            <StepsEditor
              steps={working.steps}
              update={(i,v)=>patch({ steps: working.steps.map((s,si)=>si===i?v:s) })}
              add={()=>patch({ steps:[...working.steps,''] })}
              remove={(i)=>patch({ steps: working.steps.filter((_,si)=>si!==i) })}
              move={(from,to)=>patch({ steps: (()=>{ const arr=[...working.steps]; const [m]=arr.splice(from,1); arr.splice(to,0,m); return arr; })() })}
            />
          ) : (
            <InstructionsView steps={working.steps} />
          )}
          <Notes value={working.notes} editing={editMode} onChange={v => patch({ notes: v })} />
          {Array.isArray((recipe as any).comments) && <Comments comments={(recipe as any).comments} />}
          {uploadError && <div style={{ color: '#dc2626', fontSize: '.75rem' }}>{uploadError}</div>}
          
          {/* Only show delete button for existing recipes that aren't in edit mode */}
          {!editMode && !isNew && (
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
                    deleteRecipe();
                  }
                }}
                style={{ 
                  background: '#dc2626', 
                  color: '#fff', 
                  fontSize: '0.875rem',
                  fontWeight: 600, 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Delete Recipe
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="recipe-right">
        <ImagePane 
          url={working.image_url} 
          uploading={uploading} 
          onUpload={f => upload(f)}
          lastUploadTime={lastUploadTime} 
        />
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { getApiUrl } from '../../config/environment.js';
import { useRecipe } from './hooks/useRecipe';
import type { RawRecipe } from './hooks/useRecipe';
import { useNewRecipe } from './hooks/useNewRecipe';
import { useWorkingRecipe, buildSavePayload } from './hooks/useWorkingRecipe';
import { getCurrentUserId } from '../../types/global';
import { useImageUpload } from './hooks/useImageUpload';
import { showToast, ToastType } from '../../components/Toast';
import ConfirmModal from '../../components/shoppingList/components/ConfirmModal';
import { Header as RecipeHeader } from './parts/Header';
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
import { InstructionsEditor } from './parts/StepsEditor';
import { RecipeAIChat } from './parts/RecipeAIChat';
import { Description } from './parts/Description';
import '../RecipeDetail.css';
import './parts/RecipeAIChat.css';
import '../../components/shoppingList/ShoppingListPage.css';

// Extend RawRecipe to include liked property for this component
interface RecipeWithLiked extends RawRecipe {
  liked?: boolean;
  comments?: Array<Record<string, unknown>>;
}

// Type for window global user context  
interface WindowWithUser extends Window {
  currentUser?: { id: string };
  currentUserId?: string;
}

declare const window: WindowWithUser;

interface Props { recipeId?: string; isNew?: boolean; onBack: () => void; }
export const RecipeDetailContainer: React.FC<Props> = ({ recipeId, isNew = false, onBack }) => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const [editMode, setEditMode] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [showAIChat, setShowAIChat] = useState(isNew); // Show AI chat by default for new recipes
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Always call hooks, but conditionally use their results
  const existingRecipeHook = useRecipe(recipeId || '');
  const newRecipeHook = useNewRecipe();
  
  // For existing recipes - use hook results only when not isNew and have recipeId
  const { recipe: existingRecipe, loading: existingLoading, error: existingError, refresh } = 
    !isNew && recipeId ? existingRecipeHook : { recipe: null, loading: false, error: null, refresh: () => {} };
  
  // For new recipes - use hook results only when isNew
  const { recipe: newRecipe, loading: newLoading, error: newError } = 
    isNew ? newRecipeHook : { recipe: null, loading: false, error: null };
  const saveNewRecipe = isNew ? newRecipeHook.saveNewRecipe : null;
  
  // If we're on the new recipe page, set edit mode to true
  useEffect(() => {
    if (isNew) {
      setEditMode(true);
    } else if (recipeId) {
      // Check if this is a newly created recipe that might need image polling
      const isNewlyCreated = window.location.pathname.includes(`/recipe/${recipeId}`) && 
        window.performance && 
        window.performance.navigation && 
        window.performance.navigation.type === 0; // 0 means navigation by direct URL (not reload)
      
      if (isNewlyCreated) {
        console.log('Detected new recipe navigation, will poll for image updates');
        // Poll for image updates after a short delay to ensure backend processing is complete
        setTimeout(() => {
          refresh();
        }, 500);
      }
    }
  }, [isNew, recipeId, refresh]);
  
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
  
  const { working, patch, addTag, removeTag, updateIngredient, addIngredient, removeIngredient, moveIngredientItem, updateInstruction, addInstruction, removeInstruction } = 
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
    const recipeWithLiked = recipe as RecipeWithLiked;
    return !!recipeWithLiked?.liked;
  });

  // Sync liked state when a fresh recipe payload arrives (e.g., after navigation or refresh())
  useEffect(() => {
    if (recipe && Object.prototype.hasOwnProperty.call(recipe, 'liked')) {
      const recipeWithLiked = recipe as RecipeWithLiked;
      setLiked(!!recipeWithLiked.liked);
    }
  }, [recipe]);

  const toggleLike = async () => {
    setLiked((l: boolean) => !l);
    try {
      // Get authentication token
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://momsrecipebox/api'
        }
      });

      const userId = getCurrentUserId();
      const resp = await fetch(getApiUrl(`recipes/${recipeId}/like`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      // Get authentication token for API calls
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://momsrecipebox/api'
        }
      });

      // Validate title
      if (!working.title.trim()) {
        showToast("Recipe title is required", ToastType.Error);
        setSaving(false);
        return;
      }
      
      // Build save payload
      const payload = buildSavePayload(working);
      
      // Ensure we have all fields for a comprehensive save - standardize on instructions
      if (!payload.instructions && Array.isArray(payload.steps)) {
        payload.instructions = payload.steps;
        delete payload.steps; // Remove the old steps field
      }
      

      
      if (isNew && saveNewRecipe) {
        // Creating a new recipe
        try {
          // Check for a temporary image that was uploaded
          const tempImageUrl = localStorage.getItem('newRecipe_tempImageUrl');
          if (tempImageUrl) {
            payload.image_url = tempImageUrl;
          }
          
          const newRecipeId = await saveNewRecipe(payload);
          if (newRecipeId) {
            
            // If we have a temporary image, we'll need to copy it to the new ID
            if (tempImageUrl) {
              try {
                // Extract the filename part from the URL
                const urlParts = tempImageUrl.split('/');
                const filename = urlParts[urlParts.length - 1];
                
                // Tell the backend to copy the image from temp to permanent ID
                await fetch(getApiUrl(`recipes/${newRecipeId}/copy-image`), {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
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
          showToast(`Failed to save new recipe: ${err instanceof Error ? err.message : String(err)}`, ToastType.Error);
        }
      } else {
        // Updating an existing recipe
        try {
          const resp = await fetch(getApiUrl(`recipes/${recipeId}`), { 
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
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
          showToast(`Failed to update recipe: ${err instanceof Error ? err.message : String(err)}`, ToastType.Error);
        }
      }
    } catch (e: Error | unknown) { 
      console.error("Error in save function:", e);
      showToast(e instanceof Error ? e.message : 'An error occurred', ToastType.Error); 
    } finally { 
      setSaving(false); 
    }
  };
  
  const deleteRecipe = async () => {
    try {
      // Get authentication token
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://momsrecipebox/api'
        }
      });

      const resp = await fetch(getApiUrl(`recipes/${recipeId}`), { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!resp.ok) throw new Error(`Delete failed (${resp.status})`);
      showToast('Recipe deleted successfully', ToastType.Success);
      navigate('/');
    } catch (e: Error | unknown) { 
      showToast(e instanceof Error ? e.message : 'Failed to delete recipe', ToastType.Error); 
    }
    setShowDeleteConfirm(false);
  };

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>;
  if (error || !recipe) return <p style={{ padding: '2rem' }}>Error loading recipe.</p>;

  return (
    <div className="recipe-page">
      <div className="recipe-left">{/* flex column; header separated from scroll area */}
        <RecipeHeader
          title={working.title}
          editing={editMode}
          saving={saving}
          onTitleChange={(v: string) => patch({ title: v })}
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
          {isNew && (
            <button 
              className="recipe-ai-toggle" 
              onClick={() => setShowAIChat(!showAIChat)}
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showAIChat ? (
                  <>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </>
                )}
              </svg>
              {showAIChat ? "Hide Recipe AI Assistant" : "Show Recipe AI Assistant"}
            </button>
          )}
          
          <Subtitle value={working.subtitle} editing={editMode} onChange={v => patch({ subtitle: v })} />
          <Description value={working.description} editing={editMode} onChange={v => patch({ description: v })} />
          <Meta source={working.source} author={working.author} editing={editMode} onChange={patch} />
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
            <InstructionsEditor
              instructions={working.instructions}
              update={updateInstruction}
              add={addInstruction}
              remove={removeInstruction}
              move={(from: number, to: number) => patch({ instructions: (()=>{ const arr=[...working.instructions]; const [m]=arr.splice(from,1); arr.splice(to,0,m); return arr; })() })}
            />
          ) : (
            <InstructionsView instructions={working.instructions} />
          )}
          <Notes value={working.notes} editing={editMode} onChange={v => patch({ notes: v })} />
          {Array.isArray(recipe.comments) && <Comments comments={recipe.comments} />}
          {uploadError && <div style={{ color: '#dc2626', fontSize: '.75rem' }}>{uploadError}</div>}
          
          {/* Only show delete button in edit mode for recipe owners */}
          {editMode && !isNew && getCurrentUserId() === working.owner_id && (
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
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
        <div className="recipe-right-content">
          <ImagePane 
            url={working.image_url} 
            uploading={uploading} 
            onUpload={f => upload(f)}
            lastUploadTime={lastUploadTime} 
          />
          
          {isNew && (
            <div className="recipe-ai-container">
              <RecipeAIChat 
                isVisible={showAIChat} 
                onApplyRecipe={async (recipeData) => {
                  // We'll directly create the recipe using the recipe data without updating the form
                  try {
                    setSaving(true);
                    
                    // Build a complete recipe object
                    const userId = getCurrentUserId();
                    
                    // Prepare ingredients in the right format
                    const ingredients = Array.isArray(recipeData.ingredients) ? recipeData.ingredients.map(ingredient => ({
                      name: ingredient.name || "",
                      quantity: ingredient.quantity || "",
                      position: 1
                    })) : [];
                    
                    // Normalize tags to lowercase
                    const normalizedTags = Array.isArray(recipeData.tags) 
                      ? recipeData.tags.map(tag => tag.toLowerCase()) 
                      : [];
                    
                    // Save the AI extraction image URL for later use
                    const initialImageUrl = recipeData.imageUrl || null;
                    if (initialImageUrl) {
                      console.log("Found image URL from AI extraction:", initialImageUrl);
                      // Don't set image_url yet - we'll handle it in a dedicated step after recipe creation
                    }
                    
                    // Build the payload
                    const payload = {
                      title: recipeData.title || "New Recipe",
                      subtitle: recipeData.subtitle || "",
                      description: recipeData.description || "",
                      author: recipeData.author || "",
                      source: recipeData.source || "",
                      owner_id: userId,
                      visibility: "private", // Default to private for AI-generated recipes
                      tags: normalizedTags,
                      yield: recipeData.yield || "",
                      time: recipeData.time || {},
                      ingredients: ingredients,
                      instructions: Array.isArray(recipeData.steps) ? recipeData.steps : [],
                      notes: recipeData.notes || "",
                      // Don't set image_url in initial creation to avoid race conditions
                    };
                    
                    console.log("Creating new recipe with payload:", payload);
                    
                    // Get authentication token
                    const token = await getAccessTokenSilently({
                      authorizationParams: {
                        audience: 'https://momsrecipebox/api'
                      }
                    });
                    
                    // Make the API call to create the recipe
                    const response = await fetch(getApiUrl('recipes'), {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify(payload)
                    });
                    
                    if (!response.ok) {
                      const errorText = await response.text();
                      throw new Error(`Recipe creation failed (${response.status}): ${errorText}`);
                    }
                    
                    const data = await response.json();
                    console.log("Successfully created recipe:", data);
                    
                    // Check if we have an image URL from the AI extraction
                    if (initialImageUrl) {
                      try {
                        console.log("Uploading image from URL:", initialImageUrl);
                        
                        // Fetch the image from the URL
                        const imageResponse = await fetch(getApiUrl(`recipes/${data._id}/image`), {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            imageUrl: initialImageUrl,
                            recipeName: recipeData.title || "Recipe" 
                          })
                        });
                        
                        if (!imageResponse.ok) {
                          console.error("Failed to upload image from URL:", await imageResponse.text());
                        } else {
                          console.log("Successfully uploaded image from URL");
                          
                          // After successful image upload, we need to verify the image is properly saved in MongoDB
                          // Add a significantly longer delay to ensure S3 processing completes and MongoDB update is done
                          const maxAttempts = 5;
                          let attempt = 0;
                          let imageUrlConfirmed = false;
                          
                          while (attempt < maxAttempts && !imageUrlConfirmed) {
                            attempt++;
                            console.log(`Verification attempt ${attempt}/${maxAttempts} for image URL...`);
                            
                            try {
                              // Wait between attempts with increasing delay
                              await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                              
                              const refreshResponse = await fetch(getApiUrl(`recipes/${data._id}?user_id=${getCurrentUserId()}`), {
                                headers: {
                                  'Authorization': `Bearer ${token}`
                                }
                              });
                              if (refreshResponse.ok) {
                                const refreshedData = await refreshResponse.json();
                                console.log("Refreshed recipe data with image:", refreshedData);
                                console.log("Updated image_url:", refreshedData.image_url);
                                
                                // If we have the image_url, update our local state to ensure it's available when we navigate
                                if (refreshedData && refreshedData.image_url) {
                                  console.log("Setting image URL for navigation:", refreshedData.image_url);
                                  imageUrlConfirmed = true;
                                  // If imageUrl is confirmed, manually update MongoDB again just to be absolutely sure
                                  try {
                                    const manualUpdateResponse = await fetch(getApiUrl(`recipes/${data._id}`), {
                                      method: 'PUT',
                                      headers: { 
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ 
                                        image_url: refreshedData.image_url 
                                      })
                                    });
                                    
                                    if (manualUpdateResponse.ok) {
                                      console.log("Manually reinforced image URL in recipe document");
                                    }
                                  } catch (updateErr) {
                                    console.error("Error in manual image_url update:", updateErr);
                                  }
                                } else {
                                  console.log("No image_url found yet, will retry");
                                }
                              }
                            } catch (refreshErr) {
                              console.error("Error refreshing recipe data:", refreshErr);
                            }
                          }
                          
                          if (!imageUrlConfirmed) {
                            console.error("Failed to verify image_url after multiple attempts!");
                          }
                        }
                      } catch (imageErr) {
                        console.error("Error uploading image from URL:", imageErr);
                      }
                    } 
                    // If we have a temporary image, copy it to the new ID
                    else {
                      const tempImageUrl = localStorage.getItem('newRecipe_tempImageUrl');
                      if (tempImageUrl && data._id) {
                        try {
                          // Extract the filename part from the URL
                          const urlParts = tempImageUrl.split('/');
                          const filename = urlParts[urlParts.length - 1];
                          
                          // Tell the backend to copy the image
                          await fetch(getApiUrl(`recipes/${data._id}/copy-image`), {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              sourceKey: `${tempId}.${filename.split('.').pop()}`,
                              targetKey: `${data._id}.${filename.split('.').pop()}`
                            })
                          });
                          
                          // Clean up the localStorage
                          localStorage.removeItem('newRecipe_tempImageUrl');
                        } catch (imageErr) {
                          console.error("Error copying temporary image:", imageErr);
                        }
                      }
                    }
                    
                    // Wait for the S3 image processing to complete and MongoDB to update
                    console.log('Recipe created with ID:', data._id);
                    console.log('Image URL from AI data:', recipeData.imageUrl);
                    
                    // Add a longer delay to ensure everything is processed before navigation
                    console.log('Waiting for image processing to complete...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Do one final refresh to get the most up-to-date data including the S3 image URL
                    try {
                      const finalRefreshResponse = await fetch(getApiUrl(`recipes/${data._id}?user_id=${getCurrentUserId()}`), {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      if (finalRefreshResponse.ok) {
                        const finalData = await finalRefreshResponse.json();
                        console.log("Final recipe data before navigation:", finalData);
                        console.log("Final image_url:", finalData.image_url);
                      }
                    } catch (err) {
                      console.error("Error in final refresh:", err);
                    }
                    
                    // Navigate to the newly created recipe
                    navigate(`/recipe/${data._id}`);
                    
                  } catch (err) {
                    console.error("Error creating recipe:", err);
                    showToast(`Failed to create recipe: ${err instanceof Error ? err.message : String(err)}`, ToastType.Error);
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Recipe Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Recipe"
        message={`Are you sure you want to delete "${working.title}"? This action cannot be undone.`}
        confirmText="Delete Recipe"
        cancelText="Cancel"
        onConfirm={deleteRecipe}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
    </div>
  );
};

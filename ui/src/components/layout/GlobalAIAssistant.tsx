import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAI } from '../../contexts/AIContext';
import { useRecipe } from '../../contexts/RecipeContext';
import { RecipeAIChat } from '../recipeDetail/parts/RecipeAIChat';
import { getApiUrl } from '../../config/environment';
import { getCurrentUserId } from '../../types/global';
import { showToast, ToastType } from '../Toast';
import './GlobalAIAssistant.css';

interface ParsedRecipe {
  title?: string;
  subtitle?: string;
  description?: string;
  author?: string;
  source?: string;
  yield?: string;
  time?: { prep?: string; cook?: string; total?: string };
  ingredients?: { quantity?: string; name?: string }[];
  steps?: string[];
  tags?: string[];
  notes?: string;
  imageUrl?: string;
}

export const GlobalAIAssistant: React.FC = () => {
  const { isVisible, hideAI } = useAI();
  const { currentRecipe, recipeMode } = useRecipe();
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  const handleApplyRecipe = async (recipe: ParsedRecipe) => {
    try {
      console.log('🤖 Creating recipe from AI:', recipe);
      
      // Build a complete recipe object
      const userId = getCurrentUserId();
      
      // Prepare ingredients in the right format
      const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.map(ingredient => ({
        name: ingredient.name || "",
        quantity: ingredient.quantity || "",
        position: 1
      })) : [];
      
      // Normalize tags to lowercase
      const normalizedTags = Array.isArray(recipe.tags) 
        ? recipe.tags.map(tag => tag.toLowerCase()) 
        : [];
      
      // Save the AI extraction image URL for later use
      const initialImageUrl = recipe.imageUrl || null;
      if (initialImageUrl) {
        console.log("📷 Found image URL from AI extraction:", initialImageUrl);
      }
      
      // Build the payload
      const payload = {
        title: recipe.title || "New Recipe",
        subtitle: recipe.subtitle || "",
        description: recipe.description || "",
        author: recipe.author || "",
        source: recipe.source || "",
        owner_id: userId,
        visibility: "private",
        tags: normalizedTags,
        yield: recipe.yield || "",
        time: recipe.time || {},
        ingredients: ingredients,
        instructions: Array.isArray(recipe.steps) ? recipe.steps : [],
        notes: recipe.notes || "",
      };
      
      console.log("📝 Creating new recipe with payload:", payload);
      
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://momsrecipebox/api'
        }
      });
      
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
      console.log("✅ Successfully created recipe:", data);
      
      // Upload image from URL if provided
      if (initialImageUrl) {
        try {
          console.log("📤 Uploading image from URL:", initialImageUrl);
          
          const imageResponse = await fetch(getApiUrl(`recipes/${data._id}/image`), {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              imageUrl: initialImageUrl,
              recipeName: recipe.title || "Recipe" 
            })
          });
          
          if (!imageResponse.ok) {
            console.error("❌ Failed to upload image from URL:", await imageResponse.text());
          } else {
            console.log("✅ Successfully uploaded image from URL");
            
            // Verify image was saved with proper retry logic
            const maxAttempts = 5;
            let attempt = 0;
            let imageUrlConfirmed = false;
            
            while (attempt < maxAttempts && !imageUrlConfirmed) {
              attempt++;
              console.log(`🔍 Verification attempt ${attempt}/${maxAttempts} for image URL...`);
              
              await new Promise(resolve => setTimeout(resolve, attempt * 1000));
              
              try {
                const refreshResponse = await fetch(getApiUrl(`recipes/${data._id}`), {
                  method: 'GET',
                  headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (refreshResponse.ok) {
                  const refreshedData = await refreshResponse.json();
                  if (refreshedData?.image_url) {
                    console.log("✅ Image URL confirmed:", refreshedData.image_url);
                    imageUrlConfirmed = true;
                  }
                }
              } catch (verifyErr) {
                console.warn(`⚠️ Verification attempt ${attempt} failed:`, verifyErr);
              }
            }
            
            if (!imageUrlConfirmed) {
              console.warn("⚠️ Could not verify image upload, but recipe was created");
            }
          }
        } catch (imageErr) {
          console.error("❌ Error uploading image from URL:", imageErr);
        }
      }
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showToast('Recipe created successfully! 🎉', ToastType.Success);
      
      // Navigate to the newly created recipe
      navigate(`/recipe/${data._id}`);
      
      // Hide AI panel after success
      hideAI();
      
    } catch (err) {
      console.error("❌ Error creating recipe:", err);
      showToast(`Failed to create recipe: ${err instanceof Error ? err.message : String(err)}`, ToastType.Error);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Mobile backdrop - click to close */}
      <div 
        className="global-ai-backdrop"
        onClick={hideAI}
      />
      
      {/* Floating AI Assistant Panel */}
      <div className="global-ai-panel">
        {/* Mobile drag handle */}
        <div className="global-ai-handle">
          <div className="handle-bar"></div>
        </div>

        {/* AI Chat Interface */}
        <div className="global-ai-content">
          <RecipeAIChat 
            isVisible={isVisible} 
            onApplyRecipe={handleApplyRecipe}
            currentRecipe={currentRecipe}
            mode={recipeMode || 'new'}
            onClose={hideAI}
          />
        </div>
      </div>
    </>
  );
};

import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getApiUrl } from '../../../config/environment.js';

export function useImageUpload(recipeId: string, onComplete: (url: string) => void) {
  const { getAccessTokenSilently } = useAuth0();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUploadTime, setLastUploadTime] = useState<number | null>(null);

  const upload = async (file: File) => {
    setUploading(true); 
    setError(null);
    
    try {
      // Check file size before uploading (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_SIZE) {
        throw new Error(`File is too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB`);
      }
      
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const idx = result.indexOf(',');
          resolve(idx >= 0 ? result.substring(idx + 1) : result);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      
      // Get authentication token
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://momsrecipebox/api'
        }
      });

      // Upload the image
      const putImgResp = await fetch(getApiUrl(`recipes/${recipeId}/image`), { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }, 
        body: JSON.stringify({ imageBase64: base64, contentType: file.type }) 
      });
      
      if (!putImgResp.ok) {
        const errorData = await putImgResp.json().catch(() => ({}));
        throw new Error(errorData.error || `Image API error ${putImgResp.status}`);
      }
      
      // Successfully uploaded the image
      console.log('Image uploaded successfully');
      
      // Create a proper URL for the image that will work with our API
      const imageApiUrl = getApiUrl(`recipes/${recipeId}/image`);
      
      // Update the recipe with the image URL
      const putRecipeResp = await fetch(getApiUrl(`recipes/${recipeId}`), { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }, 
        body: JSON.stringify({ image_url: imageApiUrl }) 
      });
      
      if (!putRecipeResp.ok) {
        const errorData = await putRecipeResp.json().catch(() => ({}));
        throw new Error(errorData.error || `Recipe update error ${putRecipeResp.status}`);
      }
      
      console.log('Recipe updated with new image URL:', imageApiUrl);
      
      // Record the upload time
      const now = Date.now();
      setLastUploadTime(now);
      
      // Return the API URL for the image
      onComplete(`${imageApiUrl}`);
    } catch (e: unknown) { 
      console.error('Error uploading image:', e);
      setError(e instanceof Error ? e.message : String(e)); 
    } finally { 
      setUploading(false); 
    }
  };

  return { 
    uploading, 
    error, 
    lastUploadTime,
    upload, 
    clearError: () => setError(null) 
  };
}

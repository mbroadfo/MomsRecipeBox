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
      
      // Get the response which includes the S3 URL
      const responseData = await putImgResp.json();
      console.log('Image uploaded successfully', responseData);
      
      // Record the upload time
      const now = Date.now();
      setLastUploadTime(now);
      
      // Return the S3 URL from the backend response with cache-busting timestamp
      const s3Url = responseData.imageUrl || `/api/recipes/${recipeId}/image`;
      onComplete(`${s3Url}?t=${now}`);
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

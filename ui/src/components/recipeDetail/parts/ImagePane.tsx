import React, { useRef, useState, useEffect } from 'react';
import defaultImage from '../../../assets/default.png';

interface Props {
  url?: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  lastUploadTime?: number | null;
  editing?: boolean;
}
export const ImagePane: React.FC<Props> = ({ url, uploading, onUpload, lastUploadTime, editing = false }) => {
  const inputRef = useRef<HTMLInputElement|null>(null);
  const [effectiveUrl, setEffectiveUrl] = useState<string | undefined>(url);
  const [urlKey, setUrlKey] = useState(Date.now().toString());

  // Add logging for debugging
  useEffect(() => {
    // Only log when there's an unexpected URL format or issue
    if (url && !url.startsWith('http') && !url.startsWith('/api/recipes/')) {
      console.log('ImagePane: Unexpected URL format:', url);
    }
  }, [url]);

  // Convert URL to direct S3 URL for better performance and reliability
  useEffect(() => {
    if (!url) {
      setEffectiveUrl(undefined);
      return;
    }

    // For S3 or other external URLs (http/https), use them exactly as provided
    if (url.startsWith('http://') || url.startsWith('https://')) {
      
      // If it's already an S3 URL but missing region, fix it
      if (url.includes('mrb-recipe-images-dev.s3.amazonaws.com')) {
        // Replace the generic amazonaws.com URL with the region-specific one
        let fixedUrl = url.replace(
          'mrb-recipe-images-dev.s3.amazonaws.com',
          'mrb-recipe-images-dev.s3.us-west-2.amazonaws.com'
        );
        
        // Add cache-busting parameter if we have a recent upload time
        if (lastUploadTime) {
          fixedUrl += `?t=${lastUploadTime}`;
        }
        
        setEffectiveUrl(fixedUrl);
        return;
      }
      
      // For other external URLs, add cache-busting if we have upload time
      let finalUrl = url;
      if (lastUploadTime) {
        finalUrl += `?t=${lastUploadTime}`;
      }
      setEffectiveUrl(finalUrl);
      return;
    }
    
    // Convert to direct S3 URL (same logic as RecipeCard)
    const convertToS3Url = (imageUrl: string): string => {
      // If it's already an S3 URL, use it as-is
      if (imageUrl.includes('s3.amazonaws.com')) {
        return imageUrl;
      }
      
      let recipeId = '';
      
      // Extract recipe ID from various URL formats
      if (imageUrl.includes('/api/recipes/')) {
        // Format: /api/recipes/{id}/image
        const match = imageUrl.match(/\/api\/recipes\/([^/]+)\/image/);
        if (match) {
          recipeId = match[1];
        }
      } else if (imageUrl.includes('/')) {
        // Format: some/path/{id}.{ext}
        const parts = imageUrl.split('/');
        const filename = parts[parts.length - 1];
        const fileParts = filename.split('.');
        if (fileParts.length >= 1) {
          recipeId = fileParts[0];
        }
      } else {
        // Format: {id}.{ext} or just {id}
        const fileParts = imageUrl.split('.');
        recipeId = fileParts[0];
      }
      
      if (!recipeId) {
        console.warn('Could not extract recipe ID from URL:', imageUrl);
        return imageUrl; // Return original if we can't parse it
      }
      
      // Backend always converts all images to JPEG, so extension is always .jpg
      const baseUrl = 'https://mrb-recipe-images-dev.s3.us-west-2.amazonaws.com';
      const s3Url = `${baseUrl}/${recipeId}.jpg`;
      return s3Url;
    };
    
    const s3Url = convertToS3Url(url);
    setEffectiveUrl(s3Url);
  }, [url, lastUploadTime]);
  
  // Reset urlKey when url changes to force re-render
  useEffect(() => {
    if (url) {
      setUrlKey(Date.now().toString());
    }
  }, [url]);
  
  // Handle image load errors - no extension guessing needed since backend always converts to JPEG
  const handleImageError = () => {
    // If image fails to load, just use default
    setEffectiveUrl(undefined);
  };
  
  // Update when upload completes
  useEffect(() => {
    if (lastUploadTime) {
      setUrlKey(Date.now().toString());
    }
  }, [lastUploadTime]);

  return (
    <div className="recipe-image-wrapper">
      <input 
        ref={inputRef} 
        type="file" 
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" 
        style={{ display:'none' }} 
        onChange={e => { 
          const f = e.target.files?.[0]; 
          if (f) onUpload(f); 
          e.target.value = ''; 
        }} 
      />
      {editing && (
        <button 
          type="button" 
          className="image-upload-trigger" 
          onClick={() => inputRef.current?.click()} 
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Change Image'}
        </button>
      )}
      {effectiveUrl ? (
        <img 
          src={effectiveUrl} 
          alt="recipe" 
          onError={handleImageError} 
          key={`img-${urlKey}`} // Force re-render when URL changes
        />
      ) : (
        <img src={defaultImage} alt="recipe" />
      )}
    </div>
  );
};

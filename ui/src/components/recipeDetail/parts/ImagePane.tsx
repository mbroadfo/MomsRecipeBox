import React, { useRef, useState, useEffect } from 'react';
import defaultImage from '../../../assets/default.png';

interface Props {
  url?: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  lastUploadTime?: number | null;
}
export const ImagePane: React.FC<Props> = ({ url, uploading, onUpload, lastUploadTime }) => {
  const inputRef = useRef<HTMLInputElement|null>(null);
  const [effectiveUrl, setEffectiveUrl] = useState<string | undefined>(url);
  const [cacheBuster, setCacheBuster] = useState(() => Date.now());
  
  // Process the url to ensure it's a proper API path
  useEffect(() => {
    if (!url) {
      setEffectiveUrl(undefined);
      return;
    }
    
    // If the URL is already a full URL (starts with http/https), use it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      setEffectiveUrl(`${url}?t=${cacheBuster}`);
      return;
    }
    
    // If the URL is just a filename (without path), add the API prefix
    if (!url.includes('/')) {
      // Extract the ID part to use as the API path
      const idMatch = url.match(/^([^.]+)/);
      if (idMatch && idMatch[1]) {
        setEffectiveUrl(`/api/recipes/${idMatch[1]}/image?t=${cacheBuster}`);
        return;
      }
    }
    
    // Default case - use as is but log a warning
    console.warn('Image URL format not recognized:', url);
    setEffectiveUrl(`${url}?t=${cacheBuster}`);
  }, [url, cacheBuster]);
  
  // Handle image load errors
  const handleImageError = () => {
    console.warn('Image failed to load:', effectiveUrl);
    setEffectiveUrl(undefined); // Fall back to default image
  };
  
  // Update the cache buster when upload completes or lastUploadTime changes
  useEffect(() => {
    if (lastUploadTime) {
      // If we have a new upload time, update the cache buster to force a reload
      setCacheBuster(lastUploadTime);
    } else if (!uploading) {
      // Also handle the case when upload finishes
      setCacheBuster(Date.now());
    }
  }, [uploading, lastUploadTime]);
  
  return (
    <div className="recipe-image-wrapper">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if (f) onUpload(f); e.target.value=''; }} />
      <button type="button" className="image-upload-trigger" onClick={()=>inputRef.current?.click()} disabled={uploading}>{uploading? 'Uploading...' : 'Change Image'}</button>
      {effectiveUrl ? (
        <img 
          src={effectiveUrl} 
          alt="recipe" 
          onError={handleImageError} 
          key={`img-${cacheBuster}`} // Adding key to force remount
        />
      ) : (
        <img src={defaultImage} alt="recipe" />
      )}
    </div>
  );
};

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
  const [urlKey, setUrlKey] = useState(Date.now().toString());

  // Add logging for debugging
  useEffect(() => {
    console.log('ImagePane received URL prop:', url);
  }, [url]);

  // Process the url to ensure it's a proper API path
  useEffect(() => {
    if (!url) {
      console.log('No URL provided, using default image');
      setEffectiveUrl(undefined);
      return;
    }

    // For S3 or other external URLs (http/https), use them exactly as provided
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('Using external URL as-is:', url);
      
      // For S3 URLs, set up CORS headers if needed
      if (url.includes('s3.amazonaws.com')) {
        console.log('Detected S3 URL:', url);
      }
      
      setEffectiveUrl(url);
      return;
    }
    
    // If the URL is just a filename (without path), add the API prefix
    if (!url.includes('/')) {
      // Extract the ID part to use as the API path
      const idMatch = url.match(/^([^.]+)/);
      if (idMatch && idMatch[1]) {
        const apiUrl = `/api/recipes/${idMatch[1]}/image?t=${cacheBuster}`;
        console.log('Converting filename to API URL:', apiUrl);
        setEffectiveUrl(apiUrl);
        return;
      }
    }
    
    // For local API URLs, add cache busting
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}t=${cacheBuster}`;
    console.log('Using local API URL with cache busting:', finalUrl);
    setEffectiveUrl(finalUrl);
  }, [url, cacheBuster]);
  
  // Reset urlKey when url changes to force re-render
  useEffect(() => {
    if (url) {
      setUrlKey(Date.now().toString());
    }
  }, [url]);
  
  // Track retry attempts to avoid infinite loops
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Handle image load errors with exponential backoff retry
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn('Image failed to load:', effectiveUrl);
    console.warn('Error details:', e);
    
    if (retryCount < maxRetries) {
      // Calculate backoff delay - 1s, 2s, 4s for progressive retries
      const backoffDelay = Math.pow(2, retryCount) * 1000;
      
      console.log(`Retry ${retryCount + 1}/${maxRetries} in ${backoffDelay}ms...`);
      setRetryCount(prev => prev + 1);
      
      // Set a timeout with exponential backoff
      setTimeout(() => {
        if (effectiveUrl?.includes('s3.amazonaws.com')) {
          console.log('Retrying S3 URL with cache-busting...');
          const retryUrl = `${effectiveUrl.split('?')[0]}?retry=${Date.now()}`;
          setEffectiveUrl(retryUrl);
          return;
        } else {
          // If not an S3 URL, try adding/updating cache buster
          const newCacheBuster = Date.now();
          setCacheBuster(newCacheBuster);
          console.log(`Retrying with new cache buster: ${newCacheBuster}`);
        }
      }, backoffDelay);
    } else {
      console.warn(`Max retries (${maxRetries}) reached, falling back to default image`);
      setEffectiveUrl(undefined); // Fall back to default image
    }
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
  
  // Reset urlKey when url changes to force complete re-render
  useEffect(() => {
    if (url && url !== effectiveUrl) {
      console.log('URL changed, updating urlKey to force re-render:', url);
      setUrlKey(Date.now().toString());
    }
  }, [url, effectiveUrl]);

  // Force re-render periodically after initial mount when we have a URL
  useEffect(() => {
    if (url && !uploading) {
      console.log('Setting up auto-refresh for image');
      const timer = setTimeout(() => {
        console.log('Auto-refreshing image');
        setCacheBuster(Date.now());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [url, uploading]);

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
      <button 
        type="button" 
        className="image-upload-trigger" 
        onClick={() => inputRef.current?.click()} 
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Change Image'}
      </button>
      {effectiveUrl ? (
        <img 
          src={effectiveUrl} 
          alt="recipe" 
          onError={handleImageError} 
          key={`img-${urlKey}-${cacheBuster}`} // Using both URL and cache buster for key
        />
      ) : (
        <img src={defaultImage} alt="recipe" />
      )}
    </div>
  );
};

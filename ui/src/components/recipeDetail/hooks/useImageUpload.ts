import { useState } from 'react';

export function useImageUpload(recipeId: string, onComplete: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getImageBase = (current?: string) => {
    if (!current) return '';
    try {
      const url = new URL(current);
      const parts = url.pathname.split('/');
      parts.pop();
      return `${url.origin}${parts.join('/')}/`;
    } catch { return ''; }
  };

  const upload = async (file: File, currentUrl?: string) => {
    setUploading(true); setError(null);
    try {
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
      const putImgResp = await fetch(`/api/recipes/${recipeId}/image`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64, contentType: file.type }) });
      if (!putImgResp.ok) throw new Error(`Image API error ${putImgResp.status}`);
      const imgData = await putImgResp.json();
      const key = imgData.key;
      const base = getImageBase(currentUrl);
      const newUrl = base ? `${base}${key}` : (currentUrl?.replace(/[^/]+$/, key) || key);
      const putRecipeResp = await fetch(`/api/recipes/${recipeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: newUrl }) });
      if (!putRecipeResp.ok) throw new Error(`Recipe update error ${putRecipeResp.status}`);
      onComplete(newUrl);
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  };

  return { uploading, error, upload, clearError: () => setError(null) };
}

import React, { useRef } from 'react';

interface Props {
  url?: string;
  uploading: boolean;
  onUpload: (file: File) => void;
}
export const ImagePane: React.FC<Props> = ({ url, uploading, onUpload }) => {
  const inputRef = useRef<HTMLInputElement|null>(null);
  return (
    <div className="recipe-image-wrapper">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if (f) onUpload(f); e.target.value=''; }} />
      <button type="button" className="image-upload-trigger" onClick={()=>inputRef.current?.click()} disabled={uploading}>{uploading? 'Uploading...' : 'Change Image'}</button>
      {url ? <img src={url} alt="recipe" /> : <img src={'/fallback-image.png'} alt="recipe" />}
    </div>
  );
};

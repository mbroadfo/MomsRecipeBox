// File: ui/src/components/RecipeDetail.tsx
import React, { useEffect, useState, useRef } from 'react';
import './RecipeDetail.css';

interface RecipeDetailProps {
  recipeId: string;
  onBack: () => void;
}

interface RecipeData {
  _id?: string;
  title: string;
  subtitle?: string;
  author?: string;
  source?: string;
  tags?: string[];
  yield?: string;
  time?: { total?: string; prep?: string; cook?: string };
  ingredients?: { name: string; quantity?: string }[];
  instructions?: string[];
  notes?: string;
  image_url?: string;
  favorites?: number | any[];
  likes?: number | any[];
  comments: any[];
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipeId, onBack }) => {
  const [recipe, setRecipe] = useState<RecipeData | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSmallImage, setIsSmallImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/recipes/${recipeId}`)
      .then((res) => res.json())
      .then((data) => { if (isMounted) setRecipe(data); })
      .catch((err) => console.error('Error loading recipe detail:', err));
    return () => { isMounted = false; };
  }, [recipeId]);

  if (!recipe) return <p style={{ padding: '2rem' }}>Loading...</p>;

  const likeCount = Array.isArray((recipe as any).favorites)
    ? (recipe as any).favorites.length
    : Array.isArray(recipe.likes)
      ? recipe.likes.length
      : typeof recipe.favorites === 'number'
        ? recipe.favorites
        : typeof (recipe as any).likes === 'number'
          ? (recipe as any).likes
          : 0;

  const commentCount = Array.isArray(recipe.comments) ? recipe.comments.length : 0;

  const handleStarClick = (value: number) => setRating(value === rating ? 0 : value);

  const Star = ({ index }: { index: number }) => {
    const filled = (hoverRating || rating) >= index;
    return (
      <button
        type="button"
        aria-label={`Rate ${index} star${index > 1 ? 's' : ''}`}
        onMouseEnter={() => setHoverRating(index)}
        onMouseLeave={() => setHoverRating(0)}
        onClick={() => handleStarClick(index)}
      >
        <svg
          viewBox="0 0 24 24"
          fill={filled ? 'url(#grad)' : 'none'}
          stroke={filled ? 'url(#grad)' : '#94a3b8'}
          strokeWidth={filled ? 0 : 2}
        >
          <defs>
            <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      </button>
    );
  };

  // Derive image bucket base URL from current image_url when available
  const getImageBase = () => {
    if (!recipe?.image_url) return '';
    try {
      const url = new URL(recipe.image_url);
      // Strip last path segment
      const parts = url.pathname.split('/');
      parts.pop();
      return `${url.origin}${parts.join('/')}/`;
    } catch {
      return '';
    }
  };

  const handleSelectNewImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      await uploadImage(file);
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed');
    } finally {
      e.target.value = '';
    }
  };

  const uploadImage = async (file: File) => {
    if (!recipe) return;
    setUploadingImage(true);
    try {
      // Read file as base64 (strip data URL prefix)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
            // result is like data:image/png;base64,AAAA
          const commaIdx = result.indexOf(',');
          resolve(commaIdx >= 0 ? result.substring(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Step 1: Upload image to S3 via API
      const putImgResp = await fetch(`/api/recipes/${recipeId}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, contentType: file.type })
      });
      if (!putImgResp.ok) {
        const txt = await putImgResp.text();
        throw new Error(`Image API error ${putImgResp.status}: ${txt}`);
      }
      const imgData = await putImgResp.json();
      const key = imgData.key; // e.g. <id>.png
      // Construct URL (assumes same bucket as existing images)
      const base = getImageBase();
      const newUrl = base ? `${base}${key}` : recipe.image_url?.replace(/[^/]+$/, key) || key;

      // Step 2: Persist image_url to recipe (PUT recipe)
      const putRecipeResp = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: newUrl })
      });
      if (!putRecipeResp.ok) {
        const txt = await putRecipeResp.text();
        throw new Error(`Recipe update error ${putRecipeResp.status}: ${txt}`);
      }

      // Update local state
      setRecipe(r => r ? { ...r, image_url: newUrl } : r);
      setIsSmallImage(false); // re-evaluate size after new load
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="recipe-page">
      <div className="recipe-left">
        <button className="back-button" onClick={onBack}>&larr; Back</button>

        <h1 className="recipe-title">{recipe.title}</h1>

        <div className="counter-row">
          <span className="counter" title="Likes">
            <svg viewBox="0 0 24 24" fill="#e11d48" stroke="#e11d48" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.4 4.4 3 7.5 3c1.75 0 3.42 1 4.5 2.09C13.08 4 14.75 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.78-3.4 6.86-8.56 11.54L12 21.35z" /></svg>
            {likeCount}
          </span>
          <span className="counter" title="Comments">
            <svg viewBox="0 0 24 24" fill="#2563eb" stroke="#2563eb" strokeWidth="0"><path d="M4 4h16a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H8.6a1 1 0 0 0-.7.3L5 21v-3.5H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>
            {commentCount}
          </span>
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="badge-row">
            {recipe.tags.map((tag, i) => (
              <span key={i} className="badge">{tag}</span>
            ))}
          </div>
        )}

        <div className="meta-row">
          {recipe.source && <span><strong>Source:</strong> {recipe.source}</span>}
          {recipe.author && <span><strong>Author:</strong> {recipe.author}</span>}
        </div>

        {recipe.subtitle && <div className="subtitle">{recipe.subtitle}</div>}

        <div className="stat-grid">
          {recipe.yield && (
            <div className="stat-card">
              <h4>Yield</h4>
              <p>{recipe.yield}</p>
            </div>
          )}
          {(recipe.time?.total || recipe.time?.prep || recipe.time?.cook) && (
            <div className="stat-card">
              <h4>Time</h4>
              <p>{recipe.time?.total || `${recipe.time?.prep || ''} ${recipe.time?.cook || ''}`.trim()}</p>
            </div>
          )}
        </div>

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="section-block">
            <h2>Ingredients</h2>
            <ul className="ingredients-list">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx}>{[ing.quantity, ing.name].filter(Boolean).join(' ')}</li>
              ))}
            </ul>
          </div>
        )}

        {recipe.instructions && recipe.instructions.length > 0 && (
          <div className="section-block">
            <h2>Instructions</h2>
            <ol className="ol-steps">
              {recipe.instructions.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {recipe.notes && (
          <div className="section-block">
            <h2>Notes</h2>
            <div className="note-box">{recipe.notes}</div>
          </div>
        )}

        <div className="section-block">
          <h2>My Rating</h2>
          <div className="rating-stars" role="radiogroup" aria-label="Rate this recipe">
            {[1,2,3,4,5].map((i) => <Star index={i} key={i} />)}
            <span className="rating-value">{rating > 0 ? `${rating}/5` : 'Not rated'}</span>
          </div>
        </div>

        <div className="section-block">
          <h2>Comments</h2>
          <ul className="comment-list">
            {Array.isArray(recipe.comments) && recipe.comments.length > 0 ? (
              recipe.comments.map((c: any, idx: number) => (
                <li key={idx} className="comment-item">
                  <header>{c.author || 'Anonymous'} {c.date && <span style={{ opacity: 0.55 }}>{c.date}</span>}</header>
                  <div>{c.text || c.content}</div>
                </li>
              ))
            ) : (
              <li className="comment-empty">No comments yet.</li>
            )}
          </ul>
        </div>

        {uploadError && <div style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1.25rem' }}>{uploadError}</div>}
      </div>

      <div className="recipe-right">
        <div className={`recipe-image-wrapper ${isSmallImage ? 'small-image' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="image-upload-trigger"
            onClick={handleSelectNewImage}
            disabled={uploadingImage}
            aria-label="Upload new recipe image"
          >
            {uploadingImage ? 'Uploading...' : 'Change Image'}
          </button>
          {recipe.image_url ? (
            <img
              src={recipe.image_url + (uploadingImage ? '' : '')}
              alt={recipe.title}
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth < 500 || naturalHeight < 500) setIsSmallImage(true);
              }}
            />
          ) : (
            <img src={'/fallback-image.png'} alt={recipe.title} />
          )}
        </div>
      </div>
    </div>
  );
};

// File: ui/src/components/RecipeDetail.tsx
import React, { useEffect, useState, useRef } from 'react';
import './RecipeDetail.css';

interface RecipeDetailProps { recipeId: string; onBack: () => void; }
interface RecipeData { _id?: string; title: string; subtitle?: string; author?: string; source?: string; tags?: string[]; yield?: string; time?: { total?: string; prep?: string; cook?: string }; ingredients?: { name: string; quantity?: string }[]; instructions?: string[]; notes?: string; image_url?: string; favorites?: number | any[]; likes?: number | any[]; comments: any[]; description?: string; }

// Moved outside component to keep hook order stable
interface WorkingRecipe { title: string; subtitle?: string; author?: string; source?: string; yield?: string; time?: { total?: string; prep?: string; cook?: string }; notes?: string; ingredients: { quantity?: string; name: string }[]; instructions: string[]; tags: string[]; description?: string; }
const toWorking = (r: RecipeData | null): WorkingRecipe => ({
  title: r?.title || '',
  subtitle: r?.subtitle || '',
  author: r?.author || '',
  source: r?.source || '',
  yield: r?.yield || '',
  time: r?.time || {},
  notes: r?.notes || '',
  ingredients: Array.isArray(r?.ingredients) ? r!.ingredients.map(i => ({ quantity: i.quantity || '', name: i.name || '' })) : [],
  instructions: Array.isArray(r?.instructions) ? [...(r!.instructions)] : [],
  tags: Array.isArray(r?.tags) ? [...(r!.tags)] : [],
  description: r?.description || ''
});

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipeId, onBack }) => {
  // --- All hooks declared in fixed order (do not reorder below) ---
  const [recipe, setRecipe] = useState<RecipeData | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSmallImage, setIsSmallImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<WorkingRecipe>(() => toWorking(null));
  const tagInputRef = useRef<HTMLInputElement | null>(null);
  // ----------------------------------------------------------------

  // Fetch recipe
  useEffect(() => {
    let alive = true;
    fetch(`/api/recipes/${recipeId}`)
      .then(r => r.json())
      .then(data => { if (alive) { setRecipe(data); } })
      .catch(err => console.error(err));
    return () => { alive = false; };
  }, [recipeId]);

  // Sync working copy when recipe changes (only when not editing)
  useEffect(() => {
    if (!editMode) setWorking(toWorking(recipe));
  }, [recipe, editMode]);

  if (!recipe) return <p style={{ padding: '2rem' }}>Loading...</p>;

  const likeCount = Array.isArray((recipe as any).favorites) ? (recipe as any).favorites.length : Array.isArray(recipe.likes) ? recipe.likes.length : typeof recipe.favorites === 'number' ? recipe.favorites : typeof (recipe as any).likes === 'number' ? (recipe as any).likes : 0;
  const commentCount = Array.isArray(recipe.comments) ? recipe.comments.length : 0;

  const handleStarClick = (value: number) => setRating(value === rating ? 0 : value);
  const Star = ({ index }: { index: number }) => {
    const filled = (hoverRating || rating) >= index;
    return (
      <button type="button" aria-label={`Rate ${index} star${index > 1 ? 's' : ''}`} onMouseEnter={() => setHoverRating(index)} onMouseLeave={() => setHoverRating(0)} onClick={() => handleStarClick(index)}>
        <svg viewBox="0 0 24 24" fill={filled ? 'url(#grad)' : 'none'} stroke={filled ? 'url(#grad)' : '#94a3b8'} strokeWidth={filled ? 0 : 2}>
          <defs>
            <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="50%" stopColor="#f97316" /><stop offset="100%" stopColor="#dc2626" /></linearGradient>
          </defs>
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      </button>
    );
  };

  const startEdit = () => setEditMode(true);
  const cancelEdit = () => { setEditMode(false); setWorking(toWorking(recipe)); };
  const updateWorking = (patch: Partial<WorkingRecipe>) => setWorking(w => ({ ...w, ...patch }));
  const updateIngredient = (idx: number, field: 'quantity' | 'name', value: string) => setWorking(w => ({ ...w, ingredients: w.ingredients.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing) }));
  const addIngredient = () => setWorking(w => ({ ...w, ingredients: [...w.ingredients, { quantity: '', name: '' }] }));
  const removeIngredient = (idx: number) => setWorking(w => ({ ...w, ingredients: w.ingredients.filter((_, i) => i !== idx) }));
  const updateInstruction = (idx: number, value: string) => setWorking(w => ({ ...w, instructions: w.instructions.map((s, i) => i === idx ? value : s) }));
  const addInstruction = () => setWorking(w => ({ ...w, instructions: [...w.instructions, ''] }));
  const removeInstruction = (idx: number) => setWorking(w => ({ ...w, instructions: w.instructions.filter((_, i) => i !== idx) }));
  const addTag = (tag: string) => setWorking(w => ({ ...w, tags: [...w.tags, tag] }));
  const removeTag = (tag: string) => setWorking(w => ({ ...w, tags: w.tags.filter(t => t !== tag) }));

  const saveRecipe = async () => {
    setSaving(true);
    try {
      const payload: any = { title: working.title, subtitle: working.subtitle, author: working.author, source: working.source, yield: working.yield, time: working.time, notes: working.notes, ingredients: working.ingredients.filter(i => i.name.trim() !== ''), instructions: working.instructions.filter(s => s.trim() !== ''), tags: working.tags, description: working.description };
      const resp = await fetch(`/api/recipes/${recipeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error(`Save failed (${resp.status})`);
      const refreshed = await fetch(`/api/recipes/${recipeId}`).then(r => r.json());
      setRecipe(refreshed); setEditMode(false);
    } catch (err) { alert((err as any).message || 'Failed to save recipe'); } finally { setSaving(false); }
  };

  const handleTagKey: React.KeyboardEventHandler<HTMLInputElement> = (e) => { if (e.key === 'Enter') { e.preventDefault(); const val = tagInputRef.current?.value.trim(); if (val && !working.tags.includes(val)) { addTag(val); tagInputRef.current!.value = ''; } } };

  const getImageBase = () => { if (!recipe?.image_url) return ''; try { const url = new URL(recipe.image_url); const parts = url.pathname.split('/'); parts.pop(); return `${url.origin}${parts.join('/')}/`; } catch { return ''; } };
  const handleSelectNewImage = () => fileInputRef.current?.click();
  const uploadImage = async (file: File) => { setUploadingImage(true); setUploadError(null); try { const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const result = reader.result as string; const idx = result.indexOf(','); resolve(idx >= 0 ? result.substring(idx + 1) : result); }; reader.onerror = () => reject(new Error('Failed to read file')); reader.readAsDataURL(file); }); const putImgResp = await fetch(`/api/recipes/${recipeId}/image`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64, contentType: file.type }) }); if (!putImgResp.ok) throw new Error(`Image API error ${putImgResp.status}`); const imgData = await putImgResp.json(); const key = imgData.key; const base = getImageBase(); const newUrl = base ? `${base}${key}` : recipe.image_url?.replace(/[^/]+$/, key) || key; const putRecipeResp = await fetch(`/api/recipes/${recipeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: newUrl }) }); if (!putRecipeResp.ok) throw new Error(`Recipe update error ${putRecipeResp.status}`); setRecipe(r => r ? { ...r, image_url: newUrl } : r); setIsSmallImage(false); } catch (err: any) { setUploadError(err.message); } finally { setUploadingImage(false); } };
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = e => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.target.value = ''; };

  return (
    <div className="recipe-page">
      <div className="recipe-left">
        <button className="back-button" onClick={onBack}>&larr; Back</button>
        {/* Title + edit controls */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          {editMode ? (
            <input value={working.title} onChange={e => updateWorking({ title: e.target.value })} style={{ fontSize: '2.4rem', fontWeight: 800, flex: '1 1 600px', border: 'none', background: 'transparent', outline: 'none' }} aria-label="Title" />
          ) : (
            <h1 className="recipe-title" style={{ marginBottom: 0 }}>{recipe.title}</h1>
          )}
          <div style={{ display: 'flex', gap: '.75rem' }}>
            {!editMode && <button onClick={startEdit} style={{ background: '#2563eb', color: '#fff', fontSize: '.75rem', fontWeight: 600 }}>Edit</button>}
            {editMode && <button onClick={saveRecipe} disabled={saving} style={{ background: '#047857', color: '#fff', fontSize: '.75rem', fontWeight: 600 }}>{saving ? 'Saving...' : 'Save'}</button>}
            {editMode && <button onClick={cancelEdit} disabled={saving} style={{ background: '#334155', color: '#fff', fontSize: '.75rem', fontWeight: 600 }}>Cancel</button>}
          </div>
        </div>

        {/* Counters */}
        <div className="counter-row">
          <span className="counter" title="Likes"><svg viewBox="0 0 24 24" fill="#e11d48" stroke="#e11d48" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.4 4.4 3 7.5 3c1.75 0 3.42 1 4.5 2.09C13.08 4 14.75 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.78-3.4 6.86-8.56 11.54L12 21.35z" /></svg>{likeCount}</span>
          <span className="counter" title="Comments"><svg viewBox="0 0 24 24" fill="#2563eb" stroke="#2563eb" strokeWidth="0"><path d="M4 4h16a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H8.6a1 1 0 0 0-.7.3L5 21v-3.5H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>{commentCount}</span>
        </div>

        {/* Tags */}
        {editMode ? (
          <div className="badge-row" style={{ gap: '.4rem' }}>
            {working.tags.map(t => (
              <span key={t} className="badge" style={{ position: 'relative', paddingRight: '1.4rem' }}>{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => removeTag(t)} style={{ position: 'absolute', right: '.35rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 700 }}>×</button></span>
            ))}
            <input ref={tagInputRef} onKeyDown={handleTagKey} placeholder="Add tag" style={{ border: '1px dashed #94a3b8', padding: '.4rem .65rem', borderRadius: '999px', fontSize: '.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }} />
          </div>
        ) : (recipe.tags && recipe.tags.length > 0 && (<div className="badge-row">{recipe.tags.map((tag, i) => (<span key={i} className="badge">{tag}</span>))}</div>))}

        {/* Source / Author */}
        <div className="meta-row">
          {editMode ? (<>
            <label style={{ fontSize: '.75rem', fontWeight: 600 }}>Source<input value={working.source} onChange={e => updateWorking({ source: e.target.value })} style={{ display: 'block', fontSize: '.85rem', padding: '.25rem .5rem', border: '1px solid #cbd5e1', borderRadius: '.4rem', marginTop: '.3rem' }} /></label>
            <label style={{ fontSize: '.75rem', fontWeight: 600 }}>Author<input value={working.author} onChange={e => updateWorking({ author: e.target.value })} style={{ display: 'block', fontSize: '.85rem', padding: '.25rem .5rem', border: '1px solid #cbd5e1', borderRadius: '.4rem', marginTop: '.3rem' }} /></label>
          </>) : (<>
            {recipe.source && <span><strong>Source:</strong> {recipe.source}</span>}
            {recipe.author && <span><strong>Author:</strong> {recipe.author}</span>}
          </>)}
        </div>

        {/* Subtitle */}
        {editMode ? (
          <textarea value={working.subtitle} onChange={e => updateWorking({ subtitle: e.target.value })} placeholder="Subtitle" style={{ width: '100%', fontSize: '1.15rem', fontWeight: 500, color: '#475569', border: '1px solid #e2e8f0', borderRadius: '.75rem', padding: '.75rem 1rem', resize: 'vertical', minHeight: '56px' }} />
        ) : (recipe.subtitle && <div className="subtitle">{recipe.subtitle}</div>)}

        {/* Yield / Time */}
        <div className="stat-grid">
          {editMode ? (
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}><h4>Yield</h4><input value={working.yield} onChange={e => updateWorking({ yield: e.target.value })} style={{ border: '1px solid #cbd5e1', borderRadius: '.5rem', padding: '.4rem .55rem', fontSize: '.8rem' }} /></div>
          ) : (recipe.yield && (<div className="stat-card"><h4>Yield</h4><p>{recipe.yield}</p></div>))}
          {editMode ? (
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}><h4>Time</h4><input placeholder="Total" value={working.time?.total || ''} onChange={e => updateWorking({ time: { ...working.time, total: e.target.value } })} style={{ border: '1px solid #cbd5e1', borderRadius: '.5rem', padding: '.35rem .55rem', fontSize: '.7rem', marginBottom: '.25rem' }} /><div style={{ display: 'flex', gap: '.4rem' }}><input placeholder="Prep" value={working.time?.prep || ''} onChange={e => updateWorking({ time: { ...working.time, prep: e.target.value } })} style={{ border: '1px solid #cbd5e1', borderRadius: '.5rem', padding: '.35rem .55rem', fontSize: '.7rem', flex: 1 }} /><input placeholder="Cook" value={working.time?.cook || ''} onChange={e => updateWorking({ time: { ...working.time, cook: e.target.value } })} style={{ border: '1px solid #cbd5e1', borderRadius: '.5rem', padding: '.35rem .55rem', fontSize: '.7rem', flex: 1 }} /></div></div>
          ) : ((recipe.time?.total || recipe.time?.prep || recipe.time?.cook) && (<div className="stat-card"><h4>Time</h4><p>{recipe.time?.total || `${recipe.time?.prep || ''} ${recipe.time?.cook || ''}`.trim()}</p></div>))}
        </div>

        {/* Ingredients */}
        <div className="section-block">
          <h2>Ingredients</h2>
          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {working.ingredients.map((ing, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '.6rem' }}>
                  <input value={ing.quantity} onChange={e => updateIngredient(idx, 'quantity', e.target.value)} placeholder="Qty" style={{ width: '120px', border: '1px solid #cbd5e1', borderRadius: '.5rem', padding: '.45rem .6rem', fontSize: '.8rem' }} />
                  <input value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)} placeholder="Ingredient" style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '.5rem', padding: '.45rem .6rem', fontSize: '.8rem' }} />
                  <button type="button" onClick={() => removeIngredient(idx)} style={{ background: '#dc2626', color: '#fff', fontSize: '.65rem', fontWeight: 600 }}>Del</button>
                </div>
              ))}
              <button type="button" onClick={addIngredient} style={{ background: '#2563eb', color: '#fff', fontSize: '.7rem', fontWeight: 600 }}>+ Ingredient</button>
            </div>
          ) : (
            <ul className="ingredients-list">{recipe.ingredients?.map((ing, idx) => (<li key={idx}>{[ing.quantity, ing.name].filter(Boolean).join(' ')}</li>))}</ul>
          )}
        </div>

        {/* Instructions */}
        <div className="section-block">
          <h2>Instructions</h2>
          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {working.instructions.map((step, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <textarea value={step} onChange={e => updateInstruction(idx, e.target.value)} style={{ width: '100%', minHeight: '88px', border: '1px solid #cbd5e1', borderRadius: '.7rem', padding: '.65rem .85rem', fontSize: '.8rem', lineHeight: 1.4 }} />
                  <button type="button" onClick={() => removeInstruction(idx)} style={{ position: 'absolute', top: '.4rem', right: '.4rem', background: '#dc2626', color: '#fff', fontSize: '.65rem', fontWeight: 600 }}>Del</button>
                </div>
              ))}
              <button type="button" onClick={addInstruction} style={{ background: '#2563eb', color: '#fff', fontSize: '.7rem', fontWeight: 600 }}>+ Step</button>
            </div>
          ) : (recipe.instructions && recipe.instructions.length > 0 && (<ol className="ol-steps">{recipe.instructions.map((step, idx) => (<li key={idx}>{step}</li>))}</ol>))}
        </div>

        {/* Notes */}
        <div className="section-block">
          <h2>Notes</h2>
          {editMode ? (
            <textarea value={working.notes} onChange={e => updateWorking({ notes: e.target.value })} style={{ width: '100%', minHeight: '120px', border: '1px solid #cbd5e1', borderRadius: '.9rem', padding: '.85rem 1rem', fontSize: '.8rem', lineHeight: 1.5 }} />
          ) : (recipe.notes && <div className="note-box">{recipe.notes}</div>)}
        </div>

        {/* ...existing rating and comments blocks unaffected except hidden in editMode */}
        {!editMode && (
          <div className="section-block">
            <h2>My Rating</h2>
            <div className="rating-stars" role="radiogroup" aria-label="Rate this recipe">{[1,2,3,4,5].map((i) => <Star index={i} key={i} />)}<span className="rating-value">{rating > 0 ? `${rating}/5` : 'Not rated'}</span></div>
          </div>
        )}

        {!editMode && (
          <div className="section-block">
            <h2>Comments</h2>
            <ul className="comment-list">{Array.isArray(recipe.comments) && recipe.comments.length > 0 ? (recipe.comments.map((c: any, idx: number) => (<li key={idx} className="comment-item"><header>{c.author || 'Anonymous'} {c.date && <span style={{ opacity: 0.55 }}>{c.date}</span>}</header><div>{c.text || c.content}</div></li>))) : (<li className="comment-empty">No comments yet.</li>)}</ul>
          </div>
        )}

        {uploadError && <div style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '1.25rem' }}>{uploadError}</div>}
      </div>

      <div className="recipe-right">
        <div className={`recipe-image-wrapper ${isSmallImage ? 'small-image' : ''}`}>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
          <button type="button" className="image-upload-trigger" onClick={handleSelectNewImage} disabled={uploadingImage} aria-label="Upload new recipe image">{uploadingImage ? 'Uploading...' : 'Change Image'}</button>
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={recipe.title} onLoad={(e) => { const { naturalWidth, naturalHeight } = e.currentTarget; if (naturalWidth < 500 || naturalHeight < 500) setIsSmallImage(true); }} />
          ) : (
            <img src={'/fallback-image.png'} alt={recipe.title} />
          )}
        </div>
      </div>
    </div>
  );
};

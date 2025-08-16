import React, { useState } from 'react';
import { useRecipe } from './hooks/useRecipe';
import { useWorkingRecipe, buildSavePayload } from './hooks/useWorkingRecipe';
import { useImageUpload } from './hooks/useImageUpload';
import { Header } from './parts/Header';
import { Tags } from './parts/Tags';
import { Subtitle } from './parts/Subtitle';
import { Meta } from './parts/Meta';
import { YieldTime } from './parts/YieldTime';
import { IngredientsView } from './parts/IngredientsView';
import { IngredientsEditor } from './parts/IngredientsEditor';
import { InstructionsView } from './parts/InstructionsView';
import { Notes } from './parts/Notes';
import { Comments } from './parts/Comments';
import { ImagePane } from './parts/ImagePane';
import { StepsEditor } from './parts/StepsEditor';
import '../RecipeDetail.css';

interface Props { recipeId: string; onBack: () => void; }
export const RecipeDetailContainer: React.FC<Props> = ({ recipeId, onBack }) => {
  const { recipe, loading, error, refresh } = useRecipe(recipeId);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const { working, patch, addTag, removeTag, updateIngredient, addIngredient, removeIngredient, moveIngredientItem } = useWorkingRecipe(recipe, editMode);
  const { uploading, error: uploadError, upload } = useImageUpload(recipeId, (url) => { patch({ image_url: url }); });

  const [liked, setLiked] = useState(() => {
    const raw: any = recipe;
    return !!raw?.liked; // backend could supply liked later when auth added
  });

  const toggleLike = async () => {
    // optimistic UI update
    setLiked((l: boolean) => !l);
    try {
      const userId = (window as any).currentUser?.id || (window as any).currentUserId || 'demo-user';
      const resp = await fetch(`/api/recipes/${recipeId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      if (!resp.ok) throw new Error('Like toggle failed');
      const data = await resp.json();
      if (typeof data.liked === 'boolean') setLiked(data.liked);
      // could expose data.likes for counters if needed
    } catch (e) {
      // rollback optimistic change on failure
      setLiked((l: boolean) => !l);
      console.error(e);
    }
  };

  const startEdit = () => setEditMode(true);
  const cancelEdit = () => { setEditMode(false); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = buildSavePayload(working);
      const resp = await fetch(`/api/recipes/${recipeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!resp.ok) throw new Error(`Save failed (${resp.status})`);
      await refresh();
      setEditMode(false);
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>;
  if (error || !recipe) return <p style={{ padding: '2rem' }}>Error loading recipe.</p>;

  return (
    <div className="recipe-page">
      <div className="recipe-left">{/* flex column; header separated from scroll area */}
        <Header
          title={working.title}
          editing={editMode}
          saving={saving}
          onTitleChange={v => patch({ title: v })}
          onEdit={startEdit}
          onSave={save}
          onCancel={cancelEdit}
          onBack={onBack}
          liked={liked}
          onToggleLike={toggleLike}
        />
        <div className="recipe-left-scroll">{/* new scroll container */}
          <Subtitle value={working.subtitle} editing={editMode} onChange={v => patch({ subtitle: v })} />
          <Meta source={working.source as any} author={working.author} editing={editMode} onChange={patch} />
          <Tags tags={working.tags} editing={editMode} add={addTag} remove={removeTag} />
          <YieldTime yieldValue={working.yield} time={working.time} editing={editMode} onChange={patch} />
          {editMode ? (
            <IngredientsEditor
              groups={working.ingredients}
              update={updateIngredient}
              addItem={addIngredient}
              removeItem={removeIngredient}
              moveItem={moveIngredientItem}
            />
          ) : (
            <IngredientsView groups={working.ingredients} />
          )}
          {editMode ? (
            <StepsEditor
              steps={working.steps}
              update={(i,v)=>patch({ steps: working.steps.map((s,si)=>si===i?v:s) })}
              add={()=>patch({ steps:[...working.steps,''] })}
              remove={(i)=>patch({ steps: working.steps.filter((_,si)=>si!==i) })}
              move={(from,to)=>patch({ steps: (()=>{ const arr=[...working.steps]; const [m]=arr.splice(from,1); arr.splice(to,0,m); return arr; })() })}
            />
          ) : (
            <InstructionsView steps={working.steps} />
          )}
          <Notes value={working.notes} editing={editMode} onChange={v => patch({ notes: v })} />
          {Array.isArray((recipe as any).comments) && <Comments comments={(recipe as any).comments} />}
          {uploadError && <div style={{ color: '#dc2626', fontSize: '.75rem' }}>{uploadError}</div>}
        </div>
      </div>
      <div className="recipe-right">
        <ImagePane url={working.image_url} uploading={uploading} onUpload={f => upload(f, working.image_url)} />
      </div>
    </div>
  );
};

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
import { Rating } from './parts/Rating';
import { Comments } from './parts/Comments';
import { ImagePane } from './parts/ImagePane';
import { GroupedInstructionsEditor } from './parts/GroupedInstructionsEditor';
import '../RecipeDetail.css';

interface Props { recipeId: string; onBack: () => void; }
export const RecipeDetailContainer: React.FC<Props> = ({ recipeId, onBack }) => {
  const { recipe, loading, error, refresh } = useRecipe(recipeId);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const { working, patch, addTag, removeTag, updateIngredient, addIngredient, removeIngredient, addGroup, setGroupName, removeGroup } = useWorkingRecipe(recipe, editMode);
  const { uploading, error: uploadError, upload } = useImageUpload(recipeId, (url) => { patch({ image_url: url }); });
  // UI-only grouped instructions state (not persisted as groups; flattened into steps on save)
  const [instGroups, setInstGroups] = useState<{ id: string; title: string; steps: string[] }[] | null>(null);

  // Initialize groups when entering edit mode
  React.useEffect(() => {
    if (editMode && !instGroups) {
      setInstGroups([{ id: 'g1', title: '', steps: [...working.steps] }]);
    }
    if (!editMode) {
      setInstGroups(null); // reset so future edits reflect latest saved steps
    }
  }, [editMode, instGroups, working.steps]);

  const syncSteps = (groups: { id: string; title: string; steps: string[] }[]) => {
    patch({ steps: groups.flatMap(g => g.steps) });
  };

  const updateGroupTitle = (gid: string, title: string) => setInstGroups(g => {
    if (!g) return g; const next = g.map(gr => gr.id === gid ? { ...gr, title } : gr); return next; });
  const addInstructionGroup = () => setInstGroups(g => {
    const next = [...(g||[]), { id: 'g' + (Date.now()+Math.random()).toString(36), title: '', steps: [] }]; return next; });
  const removeInstructionGroup = (gid: string) => setInstGroups(g => {
      if (!g) return g; if (g.length === 1) return g; const idx = g.findIndex(x=>x.id===gid); if (idx===-1) return g; const targetSteps = g[idx].steps; const remaining = g.filter(x=>x.id!==gid); // move steps to previous group
      if (targetSteps.length) { const attachIdx = Math.max(0, idx-1); remaining[attachIdx] = { ...remaining[attachIdx], steps: [...remaining[attachIdx].steps, ...targetSteps] }; }
      syncSteps(remaining); return [...remaining]; });

  const updateInstructionStep = (gid: string, sIdx: number, val: string) => setInstGroups(g => { if (!g) return g; const next = g.map(gr => gr.id===gid ? { ...gr, steps: gr.steps.map((s,i)=> i===sIdx? val : s) } : gr); syncSteps(next); return next; });
  const addInstructionStep = (gid: string) => setInstGroups(g => { if (!g) return g; const next = g.map(gr => gr.id===gid ? { ...gr, steps: [...gr.steps, ''] } : gr); syncSteps(next); return next; });
  const removeInstructionStep = (gid: string, sIdx: number) => setInstGroups(g => { if (!g) return g; const next = g.map(gr => gr.id===gid ? { ...gr, steps: gr.steps.filter((_,i)=>i!==sIdx) } : gr); syncSteps(next); return next; });
  const moveInstructionStep = (gid: string, sIdx: number, dir: -1 | 1) => setInstGroups(g => { if (!g) return g; const next = g.map(gr => { if (gr.id!==gid) return gr; const steps=[...gr.steps]; const ni = sIdx+dir; if (ni<0||ni>=steps.length) return gr; const tmp=steps[sIdx]; steps[sIdx]=steps[ni]; steps[ni]=tmp; return { ...gr, steps }; }); syncSteps(next); return next; });
  const moveStepToGroup = (fromId: string, sIdx: number, toId: string) => setInstGroups(g => { if (!g) return g; if (fromId===toId) return g; let moved=''; const next = g.map(gr => { if (gr.id===fromId) { moved = gr.steps[sIdx]; return { ...gr, steps: gr.steps.filter((_,i)=>i!==sIdx) }; } return gr; }).map(gr => gr.id===toId ? { ...gr, steps: [...gr.steps, moved] } : gr); syncSteps(next); return next; });
  const moveGroup = (gid: string, dir: -1 | 1) => setInstGroups(g => { if (!g) return g; const idx = g.findIndex(gr=>gr.id===gid); if (idx===-1) return g; const ni = idx+dir; if (ni<0||ni>=g.length) return g; const arr=[...g]; const tmp=arr[idx]; arr[idx]=arr[ni]; arr[ni]=tmp; return arr; });

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
      <div className="recipe-left">
        <Header
          title={working.title}
          editing={editMode}
          saving={saving}
            onTitleChange={v => patch({ title: v })}
          onEdit={startEdit}
          onSave={save}
          onCancel={cancelEdit}
          onBack={onBack}
        />
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
            addGroup={addGroup}
            setGroupName={setGroupName}
            removeGroup={removeGroup}
          />
        ) : (
          <IngredientsView groups={working.ingredients} />
        )}
        {editMode ? (
          instGroups ? <GroupedInstructionsEditor
            groups={instGroups}
            updateStep={updateInstructionStep}
            addStep={addInstructionStep}
            removeStep={removeInstructionStep}
            moveStep={moveInstructionStep}
            moveStepToGroup={moveStepToGroup}
            updateGroupTitle={updateGroupTitle}
            addGroup={addInstructionGroup}
            removeGroup={removeInstructionGroup}
            moveGroup={moveGroup}
          /> : null
        ) : (
          <InstructionsView steps={working.steps} />
        )}
        <Notes value={working.notes} editing={editMode} onChange={v => patch({ notes: v })} />
        {editMode && <div style={{ marginTop:'1.25rem' }}><button type="button" onClick={addInstructionGroup} style={{ background:'#334155', color:'#fff', fontSize:'.7rem', fontWeight:600 }}>+ Add Section (Instruction Group)</button></div>}
        <Rating />
        {Array.isArray((recipe as any).comments) && <Comments comments={(recipe as any).comments} />}
        {uploadError && <div style={{ color: '#dc2626', fontSize: '.75rem' }}>{uploadError}</div>}
      </div>
      <div className="recipe-right">
        <ImagePane url={working.image_url} uploading={uploading} onUpload={f => upload(f, working.image_url)} />
      </div>
    </div>
  );
};

import { useEffect, useState } from 'react';
import type { RawRecipe } from './useRecipe';

// Canonical normalized structures
export interface IngredientItem { name: string; quantity?: string; }
export interface IngredientGroup { group?: string; items: IngredientItem[]; }
export interface CanonicalSection { type: string; content: string; position?: number; }

export interface WorkingRecipe {
  title: string;
  subtitle?: string;
  author?: string;
  source?: string;
  description?: string;
  tags: string[];
  yield?: string;
  time: { total?: string; prep?: string; cook?: string; [k: string]: any };
  ingredients: IngredientGroup[]; // at least one group
  steps: string[]; // flattened instructions
  notes?: string;
  extraSections: CanonicalSection[]; // any non-Instructions sections
  image_url?: string;
  original: RawRecipe | null; // keep reference for reverse mapping
}

const asArray = <T,>(v: any): T[] => Array.isArray(v) ? v : [];

function normalizeIngredients(raw: any): IngredientGroup[] {
  if (!raw) return [{ items: [] }];
  if (Array.isArray(raw)) {
    return [{ items: raw.map((i: any) => ({ name: i.name || i, quantity: i.quantity })) }];
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([group, arr]: any) => ({ group, items: asArray<any>(arr).map((i: any) => (typeof i === 'string' ? { name: i } : { name: i.name || '', quantity: i.quantity })) }));
  }
  return [{ items: [] }];
}

function normalizeSteps(r: RawRecipe): { steps: string[]; from: 'instructions' | 'steps' | 'sections'; } {
  if (Array.isArray(r.instructions)) return { steps: r.instructions.slice(), from: 'instructions' };
  if (Array.isArray(r.steps)) return { steps: r.steps.slice(), from: 'steps' };
  if (Array.isArray(r.sections)) {
    const inst = r.sections.filter(s => (s.section_type || s.type) === 'Instructions').map(s => s.content);
    if (inst.length) return { steps: inst, from: 'sections' };
  }
  return { steps: [], from: 'instructions' };
}

function extractExtraSections(r: RawRecipe): CanonicalSection[] {
  if (!Array.isArray(r.sections)) return [];
  return r.sections
    .filter(s => (s.section_type || s.type) && (s.section_type || s.type) !== 'Instructions')
    .map(s => ({ type: (s.section_type || s.type) || 'Unknown', content: s.content, position: s.position }));
}

export function toWorking(r: RawRecipe | null): WorkingRecipe {
  if (!r) {
    return {
      title: '', subtitle: '', author: '', source: '', description: '', tags: [], yield: '', time: {}, ingredients: [{ items: [] }], steps: [], notes: '', extraSections: [], image_url: undefined, original: null
    };
  }
  const { steps, from } = normalizeSteps(r);
  const working: WorkingRecipe = {
    title: r.title || '',
    subtitle: r.subtitle || '',
    author: r.author || (typeof r.source === 'string' ? '' : r.author) || '',
    source: typeof r.source === 'string' ? r.source : (r.source && r.source.publication ? r.source.publication : ''),
    description: r.description || '',
    tags: asArray<string>(r.tags),
    yield: r.yield || r.servings || '',
    time: r.time || r.timing || {},
    ingredients: normalizeIngredients(r.ingredients),
    steps,
    notes: r.notes || '',
    extraSections: extractExtraSections(r),
    image_url: r.image_url,
    original: r
  };
  // store origin of steps in hidden property for reverse mapping
  (working as any)._stepsOrigin = from;
  return working;
}

export function useWorkingRecipe(raw: RawRecipe | null, locked: boolean) {
  const [working, setWorking] = useState<WorkingRecipe>(() => toWorking(raw));
  useEffect(() => { if (!locked) setWorking(toWorking(raw)); }, [raw, locked]);

  // mutation helpers
  const patch = (p: Partial<WorkingRecipe>) => setWorking(w => ({ ...w, ...p }));
  const setTagList = (tags: string[]) => patch({ tags });
  const addTag = (t: string) => setTagList([...working.tags, t]);
  const removeTag = (t: string) => setTagList(working.tags.filter(x => x !== t));

  const updateIngredient = (groupIdx: number, itemIdx: number, field: 'name' | 'quantity', value: string) => {
    setWorking(w => ({
      ...w,
      ingredients: w.ingredients.map((g, gi) => gi === groupIdx ? { ...g, items: g.items.map((it, ii) => ii === itemIdx ? { ...it, [field]: value } : it) } : g)
    }));
  };
  const addIngredient = (groupIdx: number) => setWorking(w => ({ ...w, ingredients: w.ingredients.map((g, gi) => gi === groupIdx ? { ...g, items: [...g.items, { name: '', quantity: '' }] } : g) }));
  const removeIngredient = (groupIdx: number, itemIdx: number) => setWorking(w => ({ ...w, ingredients: w.ingredients.map((g, gi) => gi === groupIdx ? { ...g, items: g.items.filter((_, ii) => ii !== itemIdx) } : g) }));
  const addGroup = () => setWorking(w => ({ ...w, ingredients: [...w.ingredients, { group: '', items: [] }] }));
  const setGroupName = (groupIdx: number, name: string) => setWorking(w => ({ ...w, ingredients: w.ingredients.map((g, gi) => gi === groupIdx ? { ...g, group: name } : g) }));
  const removeGroup = (groupIdx: number) => setWorking(w => ({ ...w, ingredients: w.ingredients.filter((_, gi) => gi !== groupIdx) }));

  const updateStep = (idx: number, value: string) => setWorking(w => ({ ...w, steps: w.steps.map((s, i) => i === idx ? value : s) }));
  const addStep = () => setWorking(w => ({ ...w, steps: [...w.steps, ''] }));
  const removeStep = (idx: number) => setWorking(w => ({ ...w, steps: w.steps.filter((_, i) => i !== idx) }));

  // extra sections
  const updateSection = (idx: number, content: string) => setWorking(w => ({ ...w, extraSections: w.extraSections.map((s, i) => i === idx ? { ...s, content } : s) }));
  const addSection = (type: string) => setWorking(w => ({ ...w, extraSections: [...w.extraSections, { type, content: '' }] }));
  const removeSection = (idx: number) => setWorking(w => ({ ...w, extraSections: w.extraSections.filter((_, i) => i !== idx) }));

  return {
    working,
    patch,
    addTag, removeTag,
    updateIngredient, addIngredient, removeIngredient, addGroup, setGroupName, removeGroup,
    updateStep, addStep, removeStep,
    updateSection, addSection, removeSection,
    setWorking
  };
}

// Reverse mapping for save
export function buildSavePayload(w: WorkingRecipe) {
  const origin = (w as any)._stepsOrigin || 'instructions';
  const ingredients = (() => {
    const multi = w.ingredients.filter(g => g.group && g.group.trim() !== '').length > 0 || w.ingredients.length > 1;
    if (!multi) {
      return w.ingredients[0].items.filter(i => i.name.trim());
    }
    const obj: Record<string, any[]> = {};
    w.ingredients.forEach(g => {
      const key = g.group && g.group.trim() ? g.group.trim() : 'Ingredients';
      obj[key] = g.items.filter(i => i.name.trim()).map(i => ({ name: i.name.trim(), quantity: i.quantity?.trim() }));
    });
    return obj;
  })();

  const base: any = {
    title: w.title,
    subtitle: w.subtitle,
    author: w.author,
    source: w.source,
    description: w.description,
    tags: w.tags,
    yield: w.yield,
    time: w.time,
    notes: w.notes,
    image_url: w.image_url,
    ingredients
  };

  if (origin === 'sections') {
    // rebuild sections with Instructions + extras
    base.sections = [
      ...w.steps.filter(s => s.trim()).map((content, i) => ({ section_type: 'Instructions', content, position: i + 1 })),
      ...w.extraSections.map((s, i) => ({ section_type: s.type, content: s.content, position: w.steps.length + i + 1 }))
    ];
  } else if (origin === 'steps') {
    base.steps = w.steps.filter(s => s.trim());
  } else {
    base.instructions = w.steps.filter(s => s.trim());
  }

  if (w.extraSections.length && origin !== 'sections') {
    // add extra sections separately (won't lose them if originally none)
    base.sections = [
      ...w.steps.filter(s => s.trim()).map((content, i) => ({ section_type: 'Instructions', content, position: i + 1 })),
      ...w.extraSections.map((s, i) => ({ section_type: s.type, content: s.content, position: w.steps.length + i + 1 }))
    ];
  }

  return base;
}

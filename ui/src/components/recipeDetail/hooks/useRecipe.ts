import { useEffect, useState, useCallback } from 'react';

export interface RawRecipe {
  _id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  author?: string;
  source?: string | { [k: string]: any };
  visibility?: string;
  status?: string;
  image_url?: string;
  tags?: string[];
  yield?: string;
  time?: any; // flexible
  ingredients?: any; // array | grouped object
  instructions?: string[];
  steps?: string[]; // alternate name
  sections?: { section_type?: string; type?: string; content: string; position?: number }[];
  notes?: string;
  [k: string]: any;
}

export function useRecipe(id: string) {
  const [recipe, setRecipe] = useState<RawRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Always use Admin as the user ID
      const userId = 'Admin';
      const data = await fetch(`/api/recipes/${id}?user_id=${encodeURIComponent(userId)}`).then(r => {
        if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
        return r.json();
      });
      setRecipe(data);
    } catch (e: any) {
      setError(e);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { recipe, loading, error, refresh, setRecipe };
}

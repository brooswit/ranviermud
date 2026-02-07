import { useState, useEffect, useCallback } from 'react';
import { getValueAtPath, setValueAtPath, deepEqual, copyDeep } from '../utils/draftEditor';

export interface UseDraftEditorOptions<T> {
  isNew?: boolean;
  onSave: (data: T) => Promise<void>;
  /** When this key changes (e.g. resource id), draft/saved reset from initialData */
  resetKey?: string;
}

export type FieldDiffState = 'unchanged' | 'changed' | 'new';

export interface UseDraftEditorReturn<T> {
  draft: T;
  saved: T | null;
  setDraft: React.Dispatch<React.SetStateAction<T>>;
  updateDraft: (path: string, value: any) => void;
  isFieldChanged: (path: string) => boolean;
  /** 'new' = in draft but not saved (green), 'changed' = different from saved (yellow), 'unchanged' */
  getFieldDiffState: (path: string) => FieldDiffState;
  revertField: (path: string) => void;
  handleSave: (data: T) => Promise<void>;
  hasChanges: boolean;
}

export function useDraftEditor<T extends object>(
  initialData: T,
  options: UseDraftEditorOptions<T>
): UseDraftEditorReturn<T> {
  const { isNew = false, onSave, resetKey } = options;
  const [saved, setSaved] = useState<T | null>(isNew ? null : copyDeep(initialData));
  const [draft, setDraft] = useState<T>(() => copyDeep(initialData));

  useEffect(() => {
    const next = copyDeep(initialData);
    setDraft(next);
    setSaved(isNew ? null : next);
  }, [resetKey ?? JSON.stringify(initialData), isNew]);

  const updateDraft = useCallback((path: string, value: any) => {
    setDraft((prev) => setValueAtPath(prev, path, value) as T);
  }, []);

  const isFieldChanged = useCallback(
    (path: string): boolean => {
      if (!saved) return false;
      const a = getValueAtPath(saved, path);
      const b = getValueAtPath(draft, path);
      return !deepEqual(a, b);
    },
    [saved, draft]
  );

  const getFieldDiffState = useCallback(
    (path: string): FieldDiffState => {
      if (!saved) return 'unchanged';
      const savedVal = getValueAtPath(saved, path);
      const draftVal = getValueAtPath(draft, path);
      if (savedVal === undefined && draftVal !== undefined) return 'new';
      if (!deepEqual(savedVal, draftVal)) return 'changed';
      return 'unchanged';
    },
    [saved, draft]
  );

  const revertField = useCallback(
    (path: string) => {
      if (!saved) return;
      const value = getValueAtPath(saved, path);
      setDraft((prev) => setValueAtPath(prev, path, value) as T);
    },
    [saved]
  );

  const handleSave = useCallback(
    async (data: T) => {
      await onSave(data);
      setSaved(copyDeep(data));
    },
    [onSave]
  );

  const hasChanges = saved != null && !deepEqual(saved, draft);

  return {
    draft,
    saved,
    setDraft,
    updateDraft,
    isFieldChanged,
    getFieldDiffState,
    revertField,
    handleSave,
    hasChanges
  };
}

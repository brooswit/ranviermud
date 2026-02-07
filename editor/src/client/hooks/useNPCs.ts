import { useState, useEffect, useCallback } from 'react';
import { npcsApi } from '../services/api';
import type { NPC } from '../types/area';

export function useNPCs(bundleName: string | null, areaName: string | null) {
  const [npcs, setNPCs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNPCs = useCallback(async () => {
    if (!bundleName || !areaName) {
      setNPCs([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await npcsApi.getAll(bundleName, areaName);
      setNPCs(data.npcs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load NPCs';
      setError(errorMessage);
      console.error('Error loading NPCs:', err);
    } finally {
      setLoading(false);
    }
  }, [bundleName, areaName]);

  const saveNPC = useCallback(async (npc: NPC) => {
    if (!bundleName || !areaName) return false;
    try {
      await npcsApi.save(bundleName, areaName, npc);
      await loadNPCs();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save NPC';
      setError(errorMessage);
      throw err;
    }
  }, [bundleName, areaName, loadNPCs]);

  useEffect(() => {
    loadNPCs();
  }, [loadNPCs]);

  return {
    npcs,
    loading,
    error,
    loadNPCs,
    saveNPC
  };
}

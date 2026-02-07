import { useState, useEffect, useCallback } from 'react';
import { areasApi, npcsApi } from '../services/api';
import type { NPC } from '../types/area';

export interface AreaNPCOption {
  value: string;
  label: string;
  area: string;
  npcId: string;
}

export function useAllAreaNPCs(bundleName: string | null) {
  const [options, setOptions] = useState<AreaNPCOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bundleName) {
      setOptions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { areas } = await areasApi.getAll(bundleName);
      const npcResults = await Promise.all(
        areas.map(async (area) => {
          try {
            const { npcs } = await npcsApi.getAll(bundleName, area);
            return { area, npcs };
          } catch {
            return { area, npcs: [] as NPC[] };
          }
        })
      );

      const opts: AreaNPCOption[] = [];
      for (const { area, npcs } of npcResults) {
        for (const npc of npcs) {
          const npcId = npc.id || (npc as any).name || '';
          if (!npcId) continue;
          const value = `${area}:${npcId}`;
          const name = npc.name || npcId;
          opts.push({
            value,
            label: `${area} / ${name}`,
            area,
            npcId
          });
        }
      }
      setOptions(opts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load areas and NPCs';
      setError(errorMessage);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [bundleName]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    options,
    loading,
    error,
    reload: load
  };
}

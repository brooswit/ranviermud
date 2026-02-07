import { useState, useEffect, useCallback } from 'react';
import { areasApi, questsApi } from '../services/api';

export interface AreaQuestOption {
  value: string;
  label: string;
  area: string;
  questId: string;
}

export function useAllAreaQuests(bundleName: string | null) {
  const [options, setOptions] = useState<AreaQuestOption[]>([]);
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
      const questResults = await Promise.all(
        areas.map(async (area) => {
          try {
            const { quests } = await questsApi.getAll(bundleName, area);
            return { area, quests };
          } catch {
            return { area, quests: [] as any[] };
          }
        })
      );

      const opts: AreaQuestOption[] = [];
      for (const { area, quests } of questResults) {
        for (const quest of quests) {
          const questId = quest.id || (quest as any).name || '';
          if (!questId) continue;
          const value = `${area}:${questId}`;
          const name = quest.title || quest.name || questId;
          opts.push({
            value,
            label: `${area} / ${name}`,
            area,
            questId
          });
        }
      }
      setOptions(opts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load areas and quests';
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

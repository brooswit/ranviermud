import { useState, useEffect, useCallback } from 'react';
import { areasApi, itemsApi } from '../services/api';
import type { Item } from '../types/area';

export interface AreaItemOption {
  value: string;
  label: string;
  area: string;
  itemId: string;
}

export function useAllAreaItems(bundleName: string | null) {
  const [options, setOptions] = useState<AreaItemOption[]>([]);
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
      const itemResults = await Promise.all(
        areas.map(async (area) => {
          try {
            const { items } = await itemsApi.getAll(bundleName, area);
            return { area, items };
          } catch {
            return { area, items: [] as Item[] };
          }
        })
      );

      const opts: AreaItemOption[] = [];
      for (const { area, items } of itemResults) {
        for (const item of items) {
          const itemId = item.id || (item as any).name || '';
          if (!itemId) continue;
          const value = `${area}:${itemId}`;
          const name = item.name || itemId;
          opts.push({
            value,
            label: `${area} / ${name}`,
            area,
            itemId
          });
        }
      }
      setOptions(opts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load areas and items';
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

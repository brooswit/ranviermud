import { useState, useEffect, useCallback } from 'react';
import { areasApi, lootPoolsApi } from '../services/api';

export interface LootPoolOption {
  value: string;
  label: string;
  area: string;
  poolId: string;
}

/**
 * Loads all areas in a bundle and their loot pool IDs.
 * Returns options as area:poolId for use in pool reference fields (e.g. NPC pools).
 */
export function useAllAreaLootPools(bundleName: string | null) {
  const [options, setOptions] = useState<LootPoolOption[]>([]);
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
      const results = await Promise.all(
        areas.map(async (area) => {
          try {
            const { lootPools } = await lootPoolsApi.getAll(bundleName, area);
            return { area, lootPools: Array.isArray(lootPools) ? lootPools : [] };
          } catch {
            return { area, lootPools: [] as { id?: string; name?: string }[] };
          }
        })
      );

      const opts: LootPoolOption[] = [];
      for (const { area, lootPools } of results) {
        for (const lp of lootPools) {
          const poolId = lp.id || (lp as { name?: string }).name || '';
          if (!poolId) continue;
          const value = `${area}:${poolId}`;
          opts.push({
            value,
            label: `${area} / ${poolId}`,
            area,
            poolId
          });
        }
      }
      setOptions(opts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load loot pools';
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

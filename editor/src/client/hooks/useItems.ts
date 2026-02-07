import { useState, useEffect, useCallback } from 'react';
import { itemsApi } from '../services/api';
import type { Item } from '../types/area';

export function useItems(bundleName: string | null, areaName: string | null) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!bundleName || !areaName) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await itemsApi.getAll(bundleName, areaName);
      setItems(data.items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load items';
      setError(errorMessage);
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  }, [bundleName, areaName]);

  const saveItem = useCallback(async (item: Item) => {
    if (!bundleName || !areaName) return false;
    try {
      await itemsApi.save(bundleName, areaName, item);
      await loadItems();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save item';
      setError(errorMessage);
      throw err;
    }
  }, [bundleName, areaName, loadItems]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    loadItems,
    saveItem
  };
}

import { useState, useEffect, useCallback } from 'react';
import { areasApi } from '../services/api';

export function useAreas(bundleName: string | null) {
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAreas = useCallback(async () => {
    if (!bundleName) {
      setAreas([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await areasApi.getAll(bundleName);
      setAreas(data.areas);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load areas';
      setError(errorMessage);
      console.error('Error loading areas:', err);
    } finally {
      setLoading(false);
    }
  }, [bundleName]);

  const createArea = useCallback(async (name: string) => {
    if (!bundleName) return false;
    try {
      await areasApi.create(bundleName, name);
      await loadAreas();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create area';
      setError(errorMessage);
      throw err;
    }
  }, [bundleName, loadAreas]);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  return {
    areas,
    loading,
    error,
    loadAreas,
    createArea
  };
}

import { useState, useEffect, useCallback } from 'react';
import { bundlesApi } from '../services/api';
import type { Bundle } from '../types/bundle';

export function useBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBundles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bundlesApi.getAll();
      setBundles(data.bundles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bundles';
      setError(errorMessage);
      console.error('Error loading bundles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBundle = useCallback(async (name: string) => {
    try {
      await bundlesApi.create(name);
      await loadBundles();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create bundle';
      setError(errorMessage);
      throw err;
    }
  }, [loadBundles]);

  const toggleBundle = useCallback(async (bundleName: string) => {
    try {
      await bundlesApi.toggle(bundleName);
      await loadBundles();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle bundle';
      setError(errorMessage);
      throw err;
    }
  }, [loadBundles]);

  useEffect(() => {
    loadBundles();
  }, [loadBundles]);

  return {
    bundles,
    loading,
    error,
    loadBundles,
    createBundle,
    toggleBundle
  };
}

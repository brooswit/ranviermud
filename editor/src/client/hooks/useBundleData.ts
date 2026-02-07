import { useState, useEffect, useCallback } from 'react';
import { bundlesApi } from '../services/api';
import type { BundleData } from '../types/bundle';

export function useBundleData(bundleName: string | null) {
  const [bundleData, setBundleData] = useState<BundleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBundle = useCallback(async () => {
    if (!bundleName) {
      setBundleData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await bundlesApi.get(bundleName);
      setBundleData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bundle';
      setError(errorMessage);
      console.error('Error loading bundle:', err);
    } finally {
      setLoading(false);
    }
  }, [bundleName]);

  useEffect(() => {
    loadBundle();
  }, [loadBundle]);

  return {
    bundleData,
    loading,
    error,
    reload: loadBundle
  };
}

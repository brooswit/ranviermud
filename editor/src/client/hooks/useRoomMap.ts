import { useState, useEffect, useCallback } from 'react';
import { mapApi } from '../services/api';
import type { MapData } from '../types/area';

export function useRoomMap(bundleName: string | null, areaName: string | null) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMap = useCallback(async () => {
    if (!bundleName || !areaName) {
      setMapData(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await mapApi.get(bundleName, areaName);
      setMapData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load map';
      setError(errorMessage);
      console.error('Error loading map:', err);
    } finally {
      setLoading(false);
    }
  }, [bundleName, areaName]);

  useEffect(() => {
    if (bundleName && areaName) {
      loadMap();
    }
  }, [bundleName, areaName, loadMap]);

  return {
    mapData,
    loading,
    error,
    reload: loadMap
  };
}

import { useState, useEffect, useCallback } from 'react';
import { areasApi, roomsApi } from '../services/api';
import type { Room } from '../types/area';

export interface AreaRoomOption {
  value: string;
  label: string;
  area: string;
  roomId: string;
}

export function useAllAreaRooms(bundleName: string | null) {
  const [options, setOptions] = useState<AreaRoomOption[]>([]);
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
      const roomResults = await Promise.all(
        areas.map(async (area) => {
          try {
            const { rooms } = await roomsApi.getAll(bundleName, area);
            return { area, rooms };
          } catch {
            return { area, rooms: [] as Room[] };
          }
        })
      );

      const opts: AreaRoomOption[] = [];
      for (const { area, rooms } of roomResults) {
        for (const room of rooms) {
          const roomId = room.id || (room as any).title || '';
          if (!roomId) continue;
          const value = `${area}:${roomId}`;
          const title = room.title || roomId;
          opts.push({
            value,
            label: `${area} / ${title}`,
            area,
            roomId
          });
        }
      }
      setOptions(opts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load areas and rooms';
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

import { useState, useEffect, useCallback } from 'react';
import { roomsApi } from '../services/api';
import type { Room } from '../types/area';

export function useRooms(bundleName: string | null, areaName: string | null) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    if (!bundleName || !areaName) {
      setRooms([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await roomsApi.getAll(bundleName, areaName);
      setRooms(data.rooms);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load rooms';
      setError(errorMessage);
      console.error('Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  }, [bundleName, areaName]);

  const saveRoom = useCallback(async (room: Room) => {
    if (!bundleName || !areaName) return false;
    try {
      await roomsApi.save(bundleName, areaName, room);
      await loadRooms();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save room';
      setError(errorMessage);
      throw err;
    }
  }, [bundleName, areaName, loadRooms]);

  const deleteRoom = useCallback(async (roomId: string) => {
    if (!bundleName || !areaName) return false;
    try {
      await roomsApi.delete(bundleName, areaName, roomId);
      await loadRooms();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete room';
      setError(errorMessage);
      throw err;
    }
  }, [bundleName, areaName, loadRooms]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  return {
    rooms,
    loading,
    error,
    loadRooms,
    saveRoom,
    deleteRoom
  };
}

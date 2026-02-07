import { useState, useCallback } from 'react';
import { aiApi } from '../services/api';

export function useAIConfigEdit() {
  const [modifiedConfig, setModifiedConfig] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitEdit = useCallback(async (config: object, prompt: string, resourceType?: string) => {
    if (!prompt || !prompt.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setModifiedConfig(null);

    try {
      const response = await aiApi.modifyConfig({ config, prompt, resourceType });
      if (response.error) {
        setError(response.error);
        setModifiedConfig(null);
      } else {
        setModifiedConfig(response.config);
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setModifiedConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResponse = useCallback(() => {
    setModifiedConfig(null);
    setError(null);
  }, []);

  return {
    modifiedConfig,
    loading,
    error,
    submitEdit,
    clearResponse
  };
}

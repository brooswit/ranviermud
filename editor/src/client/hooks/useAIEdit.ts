import { useState, useCallback } from 'react';
import { aiApi } from '../services/api';

export function useAIEdit() {
  const [modifiedCode, setModifiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitEdit = useCallback(async (code: string, prompt: string) => {
    if (!code || !code.trim()) {
      setError('No code to modify. Please add some code first.');
      return;
    }

    if (!prompt || !prompt.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setModifiedCode(null);

    try {
      const response = await aiApi.modify({ code, prompt });
      if (response.error) {
        setError(response.error);
        setModifiedCode(null);
      } else {
        setModifiedCode(response.code);
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setModifiedCode(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResponse = useCallback(() => {
    setModifiedCode(null);
    setError(null);
  }, []);

  return {
    modifiedCode,
    loading,
    error,
    submitEdit,
    clearResponse
  };
}

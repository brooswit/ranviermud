import { useState, useCallback } from 'react';
import { aiApi } from '../services/api';

export function useAISummary() {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState<string>('');

  const fetchSummary = useCallback(async (code: string) => {
    if (!code || !code.trim()) {
      setSummary('');
      setCurrentCode('');
      return;
    }

    // If code hasn't changed, don't fetch again
    if (code === currentCode) {
      return;
    }

    setCurrentCode(code);
    setLoading(true);
    setError(null);
    setSummary('Generating summary...');

    try {
      const response = await aiApi.summarize(code);
      if (response.error) {
        setError(response.error);
        setSummary('');
      } else {
        setSummary(response.summary || 'Unable to generate summary.');
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setSummary('');
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear summary when component unmounts or code changes externally
  const clearSummary = useCallback(() => {
    setSummary('');
    setCurrentCode('');
    setError(null);
  }, []);

  return {
    summary,
    loading,
    error,
    fetchSummary,
    clearSummary
  };
}

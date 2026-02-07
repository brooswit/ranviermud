import { useState, useEffect, useCallback } from 'react';

export interface UseCodeEditorOptions {
  language?: 'javascript' | 'yaml' | 'json';
  readOnly?: boolean;
  onSummaryFetch?: (content: string) => void;
}

export function useCodeEditor(initialValue: string = '', options: UseCodeEditorOptions = {}) {
  const [value, setValue] = useState(initialValue);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    if (options.onSummaryFetch) {
      // Debounce summary fetch
      const timeout = setTimeout(() => {
        if (newValue.trim()) {
          options.onSummaryFetch?.(newValue);
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [options]);

  return {
    value,
    setValue: handleChange,
    isReady,
    setIsReady
  };
}

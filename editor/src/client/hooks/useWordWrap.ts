import { useState, useEffect } from 'react';

const WORD_WRAP_KEY = 'codeEditor.wordWrap';

export function useWordWrap() {
  const [wordWrap, setWordWrap] = useState<boolean>(() => {
    const saved = localStorage.getItem(WORD_WRAP_KEY);
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem(WORD_WRAP_KEY, String(wordWrap));
  }, [wordWrap]);

  return [wordWrap, setWordWrap] as const;
}

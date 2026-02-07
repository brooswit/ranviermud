import React, { useEffect, useRef } from 'react';
import { useAISummary } from '../../hooks/useAISummary';

interface AISummaryProps {
  code: string;
  /** When false (code block collapsed), summary uses a larger minHeight */
  codeExpanded?: boolean;
}

export default function AISummary({ code, codeExpanded = true }: AISummaryProps) {
  const { summary, loading, error, fetchSummary, clearSummary } = useAISummary();
  const prevCodeRef = useRef<string>('');

  useEffect(() => {
    // If code changed, clear the old summary immediately
    if (code !== prevCodeRef.current) {
      if (prevCodeRef.current) {
        clearSummary();
      }
      prevCodeRef.current = code;
    }

    // Clear summary immediately when code changes
    if (!code || !code.trim()) {
      return;
    }
    
    // Debounce the fetch
    const timeout = setTimeout(() => {
      fetchSummary(code);
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [code, fetchSummary, clearSummary]);

  return (
    <div className="form-group">
      <label>AI Summary</label>
      <textarea
        id="ai-summary"
        readOnly
        value={loading ? 'Generating summary...' : error || summary}
        placeholder={loading ? 'Generating summary...' : 'AI summary will appear here...'}
        style={{
          width: '100%',
          minHeight: codeExpanded ? '120px' : '360px',
          padding: '0.5rem',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          color: error ? 'var(--danger)' : 'var(--text-secondary)',
          fontSize: '0.9rem',
          resize: 'vertical',
          lineHeight: '1.5',
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
}

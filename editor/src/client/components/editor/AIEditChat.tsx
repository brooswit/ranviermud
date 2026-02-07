import React, { useState } from 'react';
import { useAIEdit } from '../../hooks/useAIEdit';

interface AIEditChatProps {
  code: string;
  onApply: (modifiedCode: string) => void;
}

export default function AIEditChat({ code, onApply }: AIEditChatProps) {
  const [prompt, setPrompt] = useState('');
  const { modifiedCode, loading, error, submitEdit, clearResponse } = useAIEdit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    await submitEdit(code, prompt);
    setPrompt('');
  };

  const handleApply = () => {
    if (modifiedCode) {
      onApply(modifiedCode);
      clearResponse();
    }
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask AI to modify the code..."
          style={{
            flex: 1,
            padding: '0.5rem',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem'
          }}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn"
          disabled={loading || !prompt.trim()}
          style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>

      {(modifiedCode || error) && (
        <div
          id="ai-edit-response"
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: error ? 'var(--bg-tertiary)' : 'var(--bg-tertiary)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: '4px'
          }}
        >
          {error ? (
            <>
              <p style={{ margin: '0 0 0.5rem 0', color: 'var(--danger)', fontWeight: 'bold' }}>Error:</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{error}</p>
              <button className="btn" onClick={clearResponse} style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                Dismiss
              </button>
            </>
          ) : modifiedCode ? (
            <>
              <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)', fontWeight: 'bold' }}>AI Modified Code:</p>
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  marginBottom: '0.75rem',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {modifiedCode}
                </pre>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={clearResponse} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                  Dismiss
                </button>
                <button className="btn btn-primary" onClick={handleApply} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                  Apply Changes
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAIConfigEdit } from '../../hooks/useAIConfigEdit';

interface AIConfigEditProps {
  config: object;
  resourceType?: string;
  onApply: (modifiedConfig: object) => void;
}

export default function AIConfigEdit({ config, resourceType, onApply }: AIConfigEditProps) {
  const [prompt, setPrompt] = useState('');
  const [successMessage, setSuccessMessage] = useState(false);
  const { modifiedConfig, loading, error, submitEdit, clearResponse } = useAIConfigEdit();

  // When AI returns modified config, apply it directly to the form so user can save normally
  useEffect(() => {
    if (modifiedConfig && typeof modifiedConfig === 'object') {
      onApply(modifiedConfig as object);
      clearResponse();
      setSuccessMessage(true);
      const t = setTimeout(() => setSuccessMessage(false), 3000);
      return () => clearTimeout(t);
    }
  }, [modifiedConfig, onApply, clearResponse]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;
    await submitEdit(config, prompt, resourceType);
    setPrompt('');
  };

  return (
    <div
      className="ai-config-edit"
      style={{
        marginTop: '1.5rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--border)'
      }}
    >
      <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>AI Edit Config</h3>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
          placeholder="Describe changes to the config..."
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
          type="button"
          className="btn btn-secondary"
          disabled={loading || !prompt.trim()}
          onClick={() => handleSubmit()}
          style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
        >
          {loading ? 'Sending...' : 'AI Edit'}
        </button>
      </div>

      {successMessage && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--success, #2e7d32)' }}>
          Config updated. Review above and click Save when ready.
        </p>
      )}

      {error && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--danger)',
            borderRadius: '4px'
          }}
        >
          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--danger)', fontWeight: 'bold' }}>Error:</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{error}</p>
          <button type="button" className="btn" onClick={clearResponse} style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import CodeEditor from './CodeEditor';
import AISummary from '../editor/AISummary';
import AIEditChat from '../editor/AIEditChat';
import { useWordWrap } from '../../hooks/useWordWrap';

interface CodeBlockWithAIProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'yaml' | 'json';
  label?: string;
  height?: string;
  readOnly?: boolean;
}

export default function CodeBlockWithAI({
  value,
  onChange,
  language = 'javascript',
  label = 'JavaScript Code',
  height = '500px',
  readOnly = false
}: CodeBlockWithAIProps) {
  const [wordWrap, setWordWrap] = useWordWrap();
  const [codeExpanded, setCodeExpanded] = useState(false);

  function handleAIApply(modifiedCode: string) {
    onChange(modifiedCode);
  }

  return (
    <>
      <AISummary code={value} codeExpanded={codeExpanded} />
      <AIEditChat code={value} onApply={handleAIApply} />

      <div className="form-group" style={{ marginTop: '1rem' }}>
        <button
          type="button"
          onClick={() => setCodeExpanded((e) => !e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.5rem 0',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            textAlign: 'left'
          }}
          aria-expanded={codeExpanded}
        >
          <span style={{ userSelect: 'none' }}>{codeExpanded ? '▼' : '▶'}</span>
          <span>{label}</span>
        </button>
        {codeExpanded && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={wordWrap}
                  onChange={(e) => setWordWrap(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Word Wrap
              </label>
            </div>
            <CodeEditor
              value={value}
              onChange={onChange}
              language={language}
              height={height}
              readOnly={readOnly}
              wordWrap={wordWrap}
            />
          </div>
        )}
      </div>
    </>
  );
}

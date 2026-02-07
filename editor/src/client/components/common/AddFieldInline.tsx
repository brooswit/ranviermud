import React, { useState } from 'react';

interface AddFieldInlineProps {
  onAdd: (key: string) => void;
  existingKeys?: string[];
  buttonLabel?: string;
  placeholder?: string;
  /** Optional class for the wrapper when expanded (e.g. form-group) */
  className?: string;
}

/**
 * Inline "Add Field" UI: button that expands to an input + Add + Cancel.
 * No browser prompt() — stays in-app.
 */
export default function AddFieldInline({
  onAdd,
  existingKeys = [],
  buttonLabel = '+ Add Field',
  placeholder = 'New field name',
  className = ''
}: AddFieldInlineProps) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const key = value.trim();
    setError(null);
    if (!key) return;
    const normalized = key.toLowerCase();
    if (existingKeys.some((k) => k.toLowerCase() === normalized)) {
      setError('Field already exists');
      return;
    }
    onAdd(key);
    setValue('');
    setExpanded(false);
  }

  function handleCancel() {
    setValue('');
    setError(null);
    setExpanded(false);
  }

  if (!expanded) {
    return (
      <button
        type="button"
        className="btn btn-small"
        onClick={() => setExpanded(true)}
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
          }
          if (e.key === 'Escape') handleCancel();
        }}
        autoFocus
        style={{ flex: '1 1 8rem', minWidth: '8rem' }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'add-field-error' : undefined}
      />
      <button type="button" className="btn btn-small btn-primary" onClick={handleAdd}>
        Add
      </button>
      <button type="button" className="btn btn-small" onClick={handleCancel}>
        Cancel
      </button>
      {error && (
        <span id="add-field-error" style={{ color: 'var(--danger)', fontSize: '0.9rem' }} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import CodeBlockWithAI from '../common/CodeBlockWithAI';
import FieldWithRevert from '../common/FieldWithRevert';
import type { Command } from '../../types/resource';
import { useDraftEditor } from '../../hooks/useDraftEditor';

interface CommandEditorProps {
  bundleName: string;
  commandData: Command;
  isNew?: boolean;
  onSave: (commandData: Command) => Promise<void>;
  onCancel: () => void;
}

export default function CommandEditor({ bundleName, commandData: initialCommandData, isNew = false, onSave, onCancel }: CommandEditorProps) {
  const { draft, updateDraft, isFieldChanged, revertField, handleSave } = useDraftEditor(initialCommandData, {
    isNew,
    onSave,
    resetKey: initialCommandData.name
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await handleSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-container">
      <h2>Edit Command: {draft.name}</h2>
      <form onSubmit={handleSubmit}>
        <FieldWithRevert changed={isFieldChanged('name')} onRevert={() => revertField('name')}>
          <div className="form-group">
            <label>Command Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => updateDraft('name', e.target.value)}
              readOnly={!isNew}
              required
            />
          </div>
        </FieldWithRevert>

        <FieldWithRevert changed={isFieldChanged('content')} onRevert={() => revertField('content')}>
          <CodeBlockWithAI
            value={draft.content || ''}
            onChange={(code) => updateDraft('content', code)}
            language="javascript"
            label="JavaScript Code"
            height="500px"
          />
        </FieldWithRevert>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

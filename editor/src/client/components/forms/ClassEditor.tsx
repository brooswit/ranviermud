import React, { useState } from 'react';
import CodeBlockWithAI from '../common/CodeBlockWithAI';
import FieldWithRevert from '../common/FieldWithRevert';
import type { Class } from '../../types/resource';
import { useDraftEditor } from '../../hooks/useDraftEditor';

interface ClassEditorProps {
  bundleName: string;
  classData: Class;
  isNew?: boolean;
  onSave: (classData: Class) => Promise<void>;
  onCancel: () => void;
}

export default function ClassEditor({ bundleName, classData: initialClassData, isNew = false, onSave, onCancel }: ClassEditorProps) {
  const { draft, updateDraft, isFieldChanged, revertField, handleSave } = useDraftEditor(initialClassData, {
    isNew,
    onSave,
    resetKey: initialClassData.id
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
      <h2>Edit Class: {draft.id}</h2>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="id" value={draft.id} />

        <FieldWithRevert changed={isFieldChanged('id')} onRevert={() => revertField('id')}>
          <div className="form-group">
            <label>Class Name</label>
            <input
              type="text"
              value={draft.id}
              onChange={(e) => updateDraft('id', e.target.value)}
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

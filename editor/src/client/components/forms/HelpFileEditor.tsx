import React, { useState } from 'react';
import CodeBlockWithAI from '../common/CodeBlockWithAI';
import FieldWithRevert from '../common/FieldWithRevert';
import type { HelpFile } from '../../types/resource';
import { useDraftEditor } from '../../hooks/useDraftEditor';

interface HelpFileEditorProps {
  bundleName: string;
  helpData: HelpFile;
  isNew?: boolean;
  onSave: (helpData: HelpFile) => Promise<void>;
  onCancel: () => void;
}

function contentToString(c: string | object | undefined): string {
  if (c == null) return '';
  if (typeof c === 'object') return JSON.stringify(c, null, 2);
  return String(c);
}

function parseContent(s: string): string | object {
  const t = s.trim();
  if (!t) return '';
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

export default function HelpFileEditor({ bundleName, helpData: initialHelpData, isNew = false, onSave, onCancel }: HelpFileEditorProps) {
  const { draft, updateDraft, isFieldChanged, revertField, handleSave } = useDraftEditor(initialHelpData, {
    isNew,
    onSave,
    resetKey: initialHelpData.name
  });
  const [saving, setSaving] = useState(false);
  const yamlContent = contentToString(draft.content);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const parsed = parseContent(yamlContent);
      await handleSave({ ...draft, content: parsed });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-container">
      <h2>Edit Help File: {draft.name}</h2>
      <form onSubmit={handleSubmit}>
        <FieldWithRevert changed={isFieldChanged('name')} onRevert={() => revertField('name')}>
          <div className="form-group">
            <label>File Name</label>
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
            value={yamlContent}
            onChange={(s) => updateDraft('content', parseContent(s))}
            language="yaml"
            label="YAML Content"
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

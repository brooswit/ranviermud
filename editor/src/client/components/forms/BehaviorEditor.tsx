import React, { useState } from 'react';
import CodeBlockWithAI from '../common/CodeBlockWithAI';
import FieldDiffView from '../common/FieldDiffView';
import type { Behavior } from '../../types/resource';
import { useDraftEditor } from '../../hooks/useDraftEditor';

interface BehaviorEditorProps {
  bundleName: string;
  behaviorData: Behavior;
  isNew?: boolean;
  onSave: (behaviorData: Behavior) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

export default function BehaviorEditor({ bundleName, behaviorData: initialBehaviorData, isNew = false, onSave, onCancel, onDelete }: BehaviorEditorProps) {
  const { draft, saved, updateDraft, isFieldChanged, revertField, handleSave, hasChanges } = useDraftEditor(initialBehaviorData, {
    isNew,
    onSave,
    resetKey: `${initialBehaviorData.type}:${initialBehaviorData.name}`
  });
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await handleSave(draft);
    } catch (err) {
      // Error already reported by parent
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || !confirm(`Delete behavior "${draft.type}/${draft.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  const contentChanged = saved != null && (saved.content ?? '') !== (draft.content ?? '');
  const exampleConfigChanged = saved != null && (saved.exampleConfig ?? '') !== (draft.exampleConfig ?? '');
  const typeChanged = saved != null && saved.type !== draft.type;
  const nameChanged = saved != null && saved.name !== draft.name;

  return (
    <div className="form-container behavior-editor">
      <div className="form-header">
        <h2>Behavior: {draft.type}/{draft.name}</h2>
        <p className="form-description">Listener functions (e.g. updateTick, init) and optional example config for attaching this behavior to NPCs in area YAML.</p>
      </div>

      {hasChanges && (
        <div className="changes-panel">
          <div className="changes-panel-header">
            <span>Changes</span>
            <span className="badge">unsaved</span>
          </div>
          <div className="changes-panel-list">
            {contentChanged && (
              <FieldDiffView
                label="JavaScript (listeners)"
                savedValue={saved!.content ?? ''}
                draftValue={draft.content ?? ''}
                onRevert={() => revertField('content')}
                collapseThreshold={25}
              />
            )}
            {exampleConfigChanged && (
              <FieldDiffView
                label="Example config (YAML)"
                savedValue={saved!.exampleConfig ?? ''}
                draftValue={draft.exampleConfig ?? ''}
                onRevert={() => revertField('exampleConfig')}
                collapseThreshold={15}
              />
            )}
            {typeChanged && (
              <div className="field-diff-view">
                <div className="field-diff-header">
                  <span className="field-diff-label">Type</span>
                  <button type="button" className="btn btn-small btn-secondary" onClick={() => revertField('type')}>Revert</button>
                </div>
                <div className="field-diff-body">
                  <pre className="field-diff-content">
                    <span className="diff-remove">- {saved!.type}</span>
                    <span className="diff-add">+ {draft.type}</span>
                  </pre>
                </div>
              </div>
            )}
            {nameChanged && (
              <div className="field-diff-view">
                <div className="field-diff-header">
                  <span className="field-diff-label">Name</span>
                  <button type="button" className="btn btn-small btn-secondary" onClick={() => revertField('name')}>Revert</button>
                </div>
                <div className="field-diff-body">
                  <pre className="field-diff-content">
                    <span className="diff-remove">- {saved!.name}</span>
                    <span className="diff-add">+ {draft.name}</span>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Type</label>
            <input
              type="text"
              value={draft.type}
              onChange={(e) => updateDraft('type', e.target.value)}
              readOnly={!isNew}
              required
            />
          </div>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => updateDraft('name', e.target.value)}
              readOnly={!isNew}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Example config (YAML)</label>
          <textarea
            value={draft.exampleConfig ?? ''}
            onChange={(e) => updateDraft('exampleConfig', e.target.value)}
            placeholder="Optional. Example YAML to paste into NPC behaviors in area files, e.g.:&#10;delay: 5&#10;towards:&#10;  players: true"
            rows={6}
            className="mono"
            spellCheck={false}
          />
          <span className="form-hint">Stored as <code>{draft.name}.example.yml</code>. Use when configuring this behavior on NPCs.</span>
        </div>

        <CodeBlockWithAI
          value={draft.content ?? ''}
          onChange={(code) => updateDraft('content', code)}
          language="javascript"
          label="JavaScript (listeners)"
          height="420px"
        />

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          {onDelete && (
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting} style={{ marginLeft: 'auto' }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

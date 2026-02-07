import React, { useState, useEffect } from 'react';
import AIConfigEdit from '../editor/AIConfigEdit';
import type { NPC } from '../../types/area';
import CodeBlockWithAI from '../common/CodeBlockWithAI';
import AreaRoomSelector from '../common/AreaRoomSelector';
import { NPCListSelector } from '../common/NPCSelector';
import { QuestListSelector } from '../common/QuestSelector';
import { ItemListSelector } from '../common/ItemSelector';
import PoolsEditor from '../common/PoolsEditor';
import FieldWithRevert from '../common/FieldWithRevert';
import { behaviorsApi, bundlesApi, npcScriptsApi, npcsApi } from '../../services/api';
import { useDraftEditor } from '../../hooks/useDraftEditor';
import { setValueAtPath, getValueAtPath } from '../../utils/draftEditor';

interface NPCEditorProps {
  bundleName: string;
  areaName: string;
  npc: NPC;
  isNew?: boolean;
  onSave: (npc: NPC) => Promise<void>;
  onCancel: () => void;
}

// Field definitions for dropdowns
const FIELD_OPTIONS: Record<string, string[]> = {
  'level': [], // Number field, no dropdown needed
};

const ADD_FIELD_TOP_LEVEL_OPTIONS = ['name', 'description', 'level', 'script', 'metadata', 'attributes', 'items', 'quests', 'npcs'];
const ADD_FIELD_NESTED_OPTIONS = ['interval', 'restrictTo', 'chance', 'cooldown', 'delay', 'duration', 'target', 'areaRestricted', 'currencies', 'pools'];
const ADD_FIELD_CUSTOM_VALUE = '__custom__';

interface RenderFieldOptions {
  bundleName?: string;
  removedFromList?: Record<string, Set<string>>;
  onMarkRemoved?: (path: string, ref: string) => void;
  onRevertRemoval?: (path: string, ref: string) => void;
  /** Used to compute "added" list items (in draft but not in saved) for granular Revert */
  savedValueAtPath?: (path: string) => any;
  /** For granular revert of nested leaf fields (e.g. attributes.health) */
  isFieldChanged?: (path: string) => boolean;
  /** 'new' = green (added), 'changed' = yellow */
  getFieldDiffState?: (path: string) => 'unchanged' | 'changed' | 'new';
  onRevertField?: (path: string) => void;
  /** For behaviors object: available NPC behavior names to add (no prompt) */
  availableBehaviors?: string[];
  behaviorAddSelectValue?: string;
  onBehaviorAddSelectChange?: (value: string) => void;
  /** Inline "Add Field" (no dialog): path we're adding to, dropdown + custom draft, and callbacks */
  addFieldPath?: string | null;
  addFieldDropdownValue?: string;
  setAddFieldDropdownValue?: (v: string) => void;
  addFieldDraft?: string;
  setAddFieldDraft?: (v: string) => void;
  onStartAddField?: (path: string) => void;
  onCommitAddField?: (path: string, key: string) => void;
  onCancelAddField?: () => void;
}

function renderField(
  key: string,
  value: any,
  path: string = '',
  onChange: (path: string, newValue: any) => void,
  options?: RenderFieldOptions
): React.ReactNode {
  const fullPath = path ? `${path}.${key}` : key;

  // Area/room list (e.g. restrictTo) → RoomListSelector (same row pattern as NPC/Item/Quest lists)
  if (
    key === 'restrictTo' &&
    Array.isArray(value) &&
    value.every((x: unknown) => typeof x === 'string') &&
    options?.bundleName
  ) {
    const savedArr = options.savedValueAtPath?.(fullPath);
    const savedSet = Array.isArray(savedArr) ? new Set(savedArr as string[]) : new Set<string>();
    const addedRefs = new Set((value as string[]).filter((ref) => !savedSet.has(ref)));
    return (
      <div key={fullPath} className="form-group form-group-indent">
        <AreaRoomSelector
          bundleName={options.bundleName}
          label="Restrict to rooms"
          value={value as string[]}
          onChange={(next) => onChange(fullPath, next)}
          markedForRemoval={options.removedFromList?.[fullPath]}
          onMarkRemoved={options.onMarkRemoved ? (ref) => options.onMarkRemoved!(fullPath, ref) : undefined}
          onRevertRemoval={options.onRevertRemoval ? (ref) => options.onRevertRemoval!(fullPath, ref) : undefined}
          markedAsAdded={addedRefs.size > 0 ? addedRefs : undefined}
          onRevertAddition={addedRefs.size > 0 ? (ref) => onChange(fullPath, (value as string[]).filter((r) => r !== ref)) : undefined}
          savedValue={Array.isArray(savedArr) ? (savedArr as string[]) : undefined}
        />
      </div>
    );
  }

  // Pools array (string | { [poolRef]: weight }) → use common PoolsEditor
  if (
    key === 'pools' &&
    Array.isArray(value) &&
    options?.bundleName &&
    value.every(
      (x: unknown) =>
        typeof x === 'string' ||
        (typeof x === 'object' && x !== null && !Array.isArray(x) && Object.keys(x as object).length <= 1)
    )
  ) {
    return (
      <div key={fullPath} className="form-group">
        <PoolsEditor
          bundleName={options.bundleName}
          label="Pools"
          value={value as (string | Record<string, number>)[]}
          onChange={(next) => onChange(fullPath, next)}
        />
      </div>
    );
  }

  // NPC refs array (e.g. behaviors.ranvier-aggro.config.npcs) → NPCListSelector (− and + Add)
  if (
    key === 'npcs' &&
    Array.isArray(value) &&
    value.every((x: unknown) => typeof x === 'string') &&
    options?.bundleName
  ) {
    return (
      <div key={fullPath} className="form-group">
        <NPCListSelector
          bundleName={options.bundleName}
          label="NPCs"
          value={value as string[]}
          onChange={(next) => onChange(fullPath, next)}
          markedForRemoval={options.removedFromList?.[fullPath]}
          onMarkRemoved={options.onMarkRemoved ? (ref) => options.onMarkRemoved!(fullPath, ref) : undefined}
          onRevertRemoval={options.onRevertRemoval ? (ref) => options.onRevertRemoval!(fullPath, ref) : undefined}
        />
      </div>
    );
  }

  // Quest refs array (e.g. npc.quests) → QuestListSelector (− and + Add)
  if (
    key === 'quests' &&
    Array.isArray(value) &&
    value.every((x: unknown) => typeof x === 'string') &&
    options?.bundleName
  ) {
    const savedArr = options.savedValueAtPath?.(fullPath);
    const savedQuests = Array.isArray(savedArr) ? (savedArr as string[]) : undefined;
    return (
      <div key={fullPath} className="form-group">
        <QuestListSelector
          bundleName={options.bundleName}
          label="Quests"
          value={value as string[]}
          onChange={(next) => onChange(fullPath, next)}
          markedForRemoval={options.removedFromList?.[fullPath]}
          onMarkRemoved={options.onMarkRemoved ? (ref) => options.onMarkRemoved!(fullPath, ref) : undefined}
          onRevertRemoval={options.onRevertRemoval ? (ref) => options.onRevertRemoval!(fullPath, ref) : undefined}
          savedValue={savedQuests}
        />
      </div>
    );
  }

  // Item refs array (e.g. npc.items) → ItemListSelector (− and + Add)
  if (
    key === 'items' &&
    Array.isArray(value) &&
    value.every((x: unknown) => typeof x === 'string') &&
    options?.bundleName
  ) {
    const savedArr = options.savedValueAtPath?.(fullPath);
    const savedItems = Array.isArray(savedArr) ? (savedArr as string[]) : undefined;
    return (
      <div key={fullPath} className="form-group">
        <ItemListSelector
          bundleName={options.bundleName}
          label="Items"
          value={value as string[]}
          onChange={(next) => onChange(fullPath, next)}
          markedForRemoval={options.removedFromList?.[fullPath]}
          onMarkRemoved={options.onMarkRemoved ? (ref) => options.onMarkRemoved!(fullPath, ref) : undefined}
          onRevertRemoval={options.onRevertRemoval ? (ref) => options.onRevertRemoval!(fullPath, ref) : undefined}
          savedValue={savedItems}
        />
      </div>
    );
  }

  // Check if this field should be a dropdown
  const dropdownOptions = FIELD_OPTIONS[fullPath] || FIELD_OPTIONS[key];
  
  if (value === null || value === undefined) {
    // NPC list when field is not set yet → NPCListSelector
    if (key === 'npcs' && options?.bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <NPCListSelector
            bundleName={options.bundleName}
            label="NPCs"
            value={[]}
            onChange={(next) => onChange(fullPath, next)}
          />
        </div>
      );
    }
    // Quest list when field is not set yet → QuestListSelector
    if (key === 'quests' && options?.bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <QuestListSelector
            bundleName={options.bundleName}
            label="Quests"
            value={[]}
            onChange={(next) => onChange(fullPath, next)}
          />
        </div>
      );
    }
    // Item list when field is not set yet → ItemListSelector
    if (key === 'items' && options?.bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <ItemListSelector
            bundleName={options.bundleName}
            label="Items"
            value={[]}
            onChange={(next) => onChange(fullPath, next)}
          />
        </div>
      );
    }
    // Room list (e.g. restrictTo) when field is not set yet → RoomListSelector
    if (key === 'restrictTo' && options?.bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <AreaRoomSelector
            bundleName={options.bundleName}
            label="Restrict to rooms"
            value={[]}
            onChange={(next) => onChange(fullPath, next)}
          />
        </div>
      );
    }
    if (dropdownOptions && dropdownOptions.length > 0) {
      return (
        <div key={fullPath} className="form-group form-group-inline">
          <label>{key}</label>
          <select
            value=""
            onChange={(e) => onChange(fullPath, e.target.value || undefined)}
          >
            <option value="">(empty)</option>
            {dropdownOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }
    return (
      <div key={fullPath} className="form-group form-group-inline">
        <label>{key}</label>
        <input
          type="text"
          value=""
          placeholder="(empty)"
          onChange={(e) => onChange(fullPath, e.target.value || undefined)}
        />
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div key={fullPath} className="form-group">
        <label>{key}</label>
        <textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(fullPath, parsed);
            } catch {
              // Invalid JSON, ignore
            }
          }}
          rows={Math.min(value.length + 2, 10)}
        />
        <small>JSON array</small>
      </div>
    );
  }

  if (typeof value === 'object') {
    const isBehaviors = fullPath === 'behaviors';
    return (
      <div key={fullPath} className="form-group nested-object">
        <label>{key}</label>
        <div className="nested-fields">
          {Object.entries(value).map(([subKey, subValue]) => {
            const childFullPath = fullPath ? `${fullPath}.${subKey}` : subKey;
            const isChildNestedObject = typeof subValue === 'object' && subValue !== null && !Array.isArray(subValue);
            const isChildListField = ['items', 'quests', 'npcs', 'restrictTo'].includes(subKey);
            const content = renderField(subKey, subValue, fullPath, onChange, options);
            const fieldNode = isChildNestedObject || isChildListField ? (
              <React.Fragment key={subKey}>{content}</React.Fragment>
            ) : (
              <FieldWithRevert key={subKey} changed={options?.isFieldChanged?.(childFullPath) ?? false} onRevert={() => options?.onRevertField?.(childFullPath)}>
                {content}
              </FieldWithRevert>
            );
            if (isBehaviors) {
              return (
                <div key={subKey} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>{fieldNode}</div>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => {
                      const next = { ...value };
                      delete next[subKey];
                      onChange(fullPath, next);
                    }}
                    title="Remove behavior"
                  >
                    Remove
                  </button>
                </div>
              );
            }
            return fieldNode;
          })}
          {fullPath === 'behaviors' && options?.availableBehaviors ? (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <label style={{ marginBottom: 0 }}>Add behavior:</label>
              <select
                value={options.behaviorAddSelectValue ?? ''}
                onChange={(e) => {
                  const name = e.target.value;
                  if (name) {
                    onChange(fullPath, { ...value, [name]: true });
                    options.onBehaviorAddSelectChange?.('');
                  }
                }}
                style={{ maxWidth: '20rem' }}
              >
                <option value="">— choose one —</option>
                {(options.availableBehaviors ?? [])
                  .filter((name) => !Object.prototype.hasOwnProperty.call(value || {}, name))
                  .sort()
                  .map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
              </select>
              {(options.availableBehaviors ?? []).filter((name) => !Object.prototype.hasOwnProperty.call(value || {}, name)).length === 0 && (
                <span className="text-muted" style={{ fontSize: '0.9rem' }}>All behaviors added</span>
              )}
            </div>
          ) : (
            options?.addFieldPath === fullPath ? (
              <div className="form-group form-group-inline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <select
                  value={options.addFieldDropdownValue ?? ''}
                  onChange={(e) => options.setAddFieldDropdownValue?.(e.target.value)}
                  style={{ flex: '1 1 10rem', minWidth: '10rem' }}
                >
                  <option value="">— choose one —</option>
                  {ADD_FIELD_NESTED_OPTIONS.filter((opt) => !Object.prototype.hasOwnProperty.call(value || {}, opt)).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value={ADD_FIELD_CUSTOM_VALUE}>Custom…</option>
                </select>
                {(options.addFieldDropdownValue === ADD_FIELD_CUSTOM_VALUE) && (
                  <input
                    type="text"
                    placeholder="Field name"
                    value={options.addFieldDraft ?? ''}
                    onChange={(e) => options.setAddFieldDraft?.(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const key = (options.addFieldDraft ?? '').trim();
                        if (key) options.onCommitAddField?.(fullPath, key);
                      }
                      if (e.key === 'Escape') options.onCancelAddField?.();
                    }}
                    autoFocus
                    style={{ flex: '1 1 8rem', minWidth: '8rem' }}
                  />
                )}
                <button
                  type="button"
                  className="btn btn-small btn-primary"
                  onClick={() => {
                    const sel = options.addFieldDropdownValue ?? '';
                    const key = sel === ADD_FIELD_CUSTOM_VALUE ? (options.addFieldDraft ?? '').trim() : sel;
                    if (key) options.onCommitAddField?.(fullPath, key);
                  }}
                >
                  Add
                </button>
                <button type="button" className="btn btn-small" onClick={() => options.onCancelAddField?.()}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-small"
                onClick={() => options.onStartAddField?.(fullPath)}
              >
                + Add Field
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div key={fullPath} className="form-group">
        <label>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(fullPath, e.target.checked)}
          />
          {key}
        </label>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div key={fullPath} className="form-group form-group-inline">
        <label>{key}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(fullPath, parseFloat(e.target.value) || 0)}
        />
      </div>
    );
  }

  // String or other primitive
  // Check if this should be a dropdown
  if (dropdownOptions && dropdownOptions.length > 0 && typeof value === 'string') {
    return (
      <div key={fullPath} className="form-group form-group-inline">
        <label>{key}</label>
        <select
          value={value}
          onChange={(e) => onChange(fullPath, e.target.value)}
        >
          <option value="">(empty)</option>
          {dropdownOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  const isLongText = typeof value === 'string' && value.length > 100;
  return (
    <div key={fullPath} className={`form-group ${isLongText ? '' : 'form-group-inline'}`}>
      <label>{key}</label>
      {isLongText ? (
        <textarea
          value={value}
          onChange={(e) => onChange(fullPath, e.target.value)}
          rows={Math.ceil(value.length / 80)}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(fullPath, e.target.value)}
        />
      )}
    </div>
  );
}

// NPC editor still needs mutable-style nested updates for complex structures; reuse setValueAtPath
function updateNestedValue(obj: any, path: string, value: any): any {
  return setValueAtPath(obj, path, value);
}

export default function NPCEditor({ bundleName, areaName, npc: initialNPC, isNew = false, onSave, onCancel }: NPCEditorProps) {
  const { draft: npc, setDraft: setNPC, saved, updateDraft, isFieldChanged, getFieldDiffState, revertField, handleSave } = useDraftEditor(initialNPC, {
    isNew,
    onSave,
    resetKey: initialNPC.id
  });
  const [removedFromList, setRemovedFromList] = useState<Record<string, Set<string>>>({});
  const [scriptContent, setScriptContent] = useState<string>('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [availableBehaviors, setAvailableBehaviors] = useState<string[]>([]);
  const [behaviorAddSelectValue, setBehaviorAddSelectValue] = useState('');
  const [addFieldPath, setAddFieldPath] = useState<string | null>(null);
  const [addFieldDropdownValue, setAddFieldDropdownValue] = useState('');
  const [addFieldDraft, setAddFieldDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    bundlesApi.getAll()
      .then(({ bundles }) => Promise.all((bundles ?? []).map((b) => behaviorsApi.getAll(b.name).catch(() => ({ behaviors: [] })))))
      .then((results) => {
        if (cancelled) return;
        const names = new Set<string>();
        for (const data of results) {
          for (const b of data.behaviors ?? []) {
            if (b.type === 'npc') names.add(b.name);
          }
        }
        setAvailableBehaviors(Array.from(names).sort());
      })
      .catch(() => { if (!cancelled) setAvailableBehaviors([]); });
    return () => { cancelled = true; };
  }, []);

  const onMarkRemoved = (path: string, ref: string) => {
    setRemovedFromList((prev) => {
      const next = new Set(prev[path] || []);
      next.add(ref);
      return { ...prev, [path]: next };
    });
  };
  const onRevertRemoval = (path: string, ref: string) => {
    setRemovedFromList((prev) => {
      const set = prev[path];
      if (!set || !set.has(ref)) return prev;
      const next = new Set(set);
      next.delete(ref);
      return { ...prev, [path]: next };
    });
  };
  const handleRevertField = (path: string) => {
    revertField(path);
    setRemovedFromList((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  useEffect(() => {
    loadScript();
  }, [npc.script, bundleName, areaName]);

  async function loadScript() {
    if (!npc.script) {
      setScriptContent('');
      setScriptError(null);
      return;
    }

    setScriptLoading(true);
    setScriptError(null);
    try {
      const data = await npcScriptsApi.get(bundleName, areaName, npc.script);
      setScriptContent(data.script.content);
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'Failed to load script');
      setScriptContent('');
    } finally {
      setScriptLoading(false);
    }
  }

  async function handleAddScript() {
    const scriptName = prompt('Enter script name (without .js extension):');
    if (!scriptName || !scriptName.trim()) return;

    const trimmedName = scriptName.trim();
    const newNPC = { ...npc, script: trimmedName };
    setNPC(newNPC);

    // Create empty script file
    try {
      await npcScriptsApi.save(bundleName, areaName, trimmedName, {
        type: 'npcs',
        name: trimmedName,
        content: `'use strict';\n\nmodule.exports = {\n  listeners: {\n    // Add event listeners here\n  }\n};`
      });
      await loadScript();
    } catch (err) {
      alert('Failed to create script: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  async function handleRemoveScript() {
    if (!npc.script) return;

    if (!confirm(`Are you sure you want to remove the script "${npc.script}"? This will delete the script file.`)) {
      return;
    }

    try {
      await npcScriptsApi.delete(bundleName, areaName, npc.script);
      const newNPC = { ...npc };
      delete newNPC.script;
      setNPC(newNPC);
      setScriptContent('');
      setScriptError(null);
    } catch (err) {
      alert('Failed to delete script: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  function handleFieldChange(path: string, newValue: any) {
    updateDraft(path, newValue);
  }

  function handleStartAddField(path: string) {
    setAddFieldPath(path);
    setAddFieldDropdownValue('');
    setAddFieldDraft('');
  }
  function handleCommitAddField(path: string, key: string) {
    if (!key) return;
    if (path === '') {
      if (!npc.hasOwnProperty(key)) setNPC({ ...npc, [key]: '' });
    } else {
      const current = getValueAtPath(npc, path);
      const obj = typeof current === 'object' && current !== null && !Array.isArray(current) ? current : {};
      handleFieldChange(path, { ...obj, [key]: '' });
    }
    setAddFieldPath(null);
    setAddFieldDropdownValue('');
    setAddFieldDraft('');
  }
  function handleCancelAddField() {
    setAddFieldPath(null);
    setAddFieldDropdownValue('');
    setAddFieldDraft('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Save the script if it exists and has content
    if (npc.script && scriptContent) {
      try {
        await npcScriptsApi.save(bundleName, areaName, npc.script, {
          type: 'npcs',
          name: npc.script,
          content: scriptContent
        });
      } catch (err) {
        alert('Failed to save script: ' + (err instanceof Error ? err.message : 'Unknown error'));
        return; // Don't save NPC if script save fails
      }
    }
    
    // Build effective NPC with list removals applied
    let effectiveNPC = npc;
    for (const [path, removedSet] of Object.entries(removedFromList)) {
      if (removedSet.size === 0) continue;
      const arr = getValueAtPath(effectiveNPC, path);
      if (Array.isArray(arr)) {
        const filtered = arr.filter((ref: string) => !removedSet.has(ref));
        effectiveNPC = setValueAtPath(effectiveNPC, path, filtered) as NPC;
      }
    }
    await handleSave(effectiveNPC);
    setRemovedFromList({});
  }

  // Special handling for keywords array (common case)
  const keywordsValue = Array.isArray(npc.keywords) 
    ? npc.keywords.join(', ') 
    : (typeof npc.keywords === 'string' ? npc.keywords : '');

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete NPC "${npc.name || npc.id}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await npcsApi.delete(bundleName, areaName, npc.id);
      onCancel(); // Navigate back
    } catch (error) {
      alert('Failed to delete NPC: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  return (
    <div className="form-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Edit NPC: {npc.name || npc.id}</h2>
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        {/* Always show id first: label and value on same row */}
        <FieldWithRevert changed={isFieldChanged('id')} onRevert={() => handleRevertField('id')} inline>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            <label style={{ minWidth: '4rem', marginBottom: 0 }}>id</label>
            <input
              type="text"
              value={npc.id}
              onChange={(e) => updateDraft('id', e.target.value)}
              required
              style={{ flex: 1, minWidth: '10rem' }}
            />
          </div>
        </FieldWithRevert>

        {/* Special handling for keywords */}
        <FieldWithRevert diffState={getFieldDiffState('keywords')} onRevert={() => revertField('keywords')}>
          <div className="form-group">
            <label>Keywords (comma-separated)</label>
            <input
              type="text"
              value={keywordsValue}
              onChange={(e) => {
                const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                updateDraft('keywords', keywords.length > 0 ? keywords : undefined);
              }}
            />
          </div>
        </FieldWithRevert>

        {/* Dynamically render all other fields. Only wrap in FieldWithRevert for leaf fields; no top-level revert for nested objects (e.g. behaviors) or list fields (revert is per list item). */}
        {Object.entries(npc)
          .filter(([key]) => key !== 'id' && key !== 'keywords')
          .map(([key, value]) => {
            const isNestedObject = typeof value === 'object' && value !== null && !Array.isArray(value);
            const isListField = ['items', 'quests', 'npcs', 'restrictTo'].includes(key);
            const useGranularOnly = isNestedObject || isListField;
            const fieldContent = renderField(key, value, '', handleFieldChange, { bundleName, removedFromList, onMarkRemoved, onRevertRemoval, savedValueAtPath: (path) => getValueAtPath(saved ?? {}, path), isFieldChanged, onRevertField: handleRevertField, availableBehaviors, behaviorAddSelectValue, onBehaviorAddSelectChange: setBehaviorAddSelectValue, addFieldPath, addFieldDropdownValue, setAddFieldDropdownValue, addFieldDraft, setAddFieldDraft, onStartAddField: handleStartAddField, onCommitAddField: handleCommitAddField, onCancelAddField: handleCancelAddField });
            if (useGranularOnly) return <React.Fragment key={key}>{fieldContent}</React.Fragment>;
            return (
              <FieldWithRevert key={key} diffState={getFieldDiffState(key)} onRevert={() => handleRevertField(key)}>
                {fieldContent}
              </FieldWithRevert>
            );
          })}

        {/* Add new field (inline dropdown, no dialog) */}
        <div className="form-group">
          {addFieldPath === '' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={addFieldDropdownValue}
                onChange={(e) => setAddFieldDropdownValue(e.target.value)}
                style={{ flex: '1 1 10rem', minWidth: '10rem' }}
              >
                <option value="">— choose one —</option>
                {ADD_FIELD_TOP_LEVEL_OPTIONS.filter((opt) => !npc.hasOwnProperty(opt)).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value={ADD_FIELD_CUSTOM_VALUE}>Custom…</option>
              </select>
              {addFieldDropdownValue === ADD_FIELD_CUSTOM_VALUE && (
                <input
                  type="text"
                  placeholder="Field name"
                  value={addFieldDraft}
                  onChange={(e) => setAddFieldDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const key = addFieldDraft.trim();
                      if (key && !npc.hasOwnProperty(key)) handleCommitAddField('', key);
                    }
                    if (e.key === 'Escape') handleCancelAddField();
                  }}
                  autoFocus
                  style={{ flex: '1 1 8rem', minWidth: '8rem' }}
                />
              )}
              <button
                type="button"
                className="btn btn-small btn-primary"
                onClick={() => {
                  const key = addFieldDropdownValue === ADD_FIELD_CUSTOM_VALUE ? addFieldDraft.trim() : addFieldDropdownValue;
                  if (key && !npc.hasOwnProperty(key)) handleCommitAddField('', key);
                }}
              >
                Add
              </button>
              <button type="button" className="btn btn-small" onClick={handleCancelAddField}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => handleStartAddField('')}>
              + Add Field
            </button>
          )}
        </div>

        <AIConfigEdit config={npc} resourceType="npc" onApply={setNPC} />

        {/* Script Section */}
        <div className="script-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>NPC Script</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {npc.script ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRemoveScript}
                >
                  Remove Script
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddScript}
                >
                  + Add Script
                </button>
              )}
            </div>
          </div>

          {npc.script && (
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Script: <code>{npc.script}.js</code>
              </p>
              {scriptLoading ? (
                <div>Loading script...</div>
              ) : scriptError ? (
                <>
                  <div style={{ color: 'var(--danger)', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '4px', marginBottom: '1rem' }}>
                    Error: {scriptError}
                  </div>
                  <CodeBlockWithAI
                    value={scriptContent || ''}
                    onChange={setScriptContent}
                    language="javascript"
                    label="JavaScript Code"
                    height="400px"
                  />
                </>
              ) : (
                <CodeBlockWithAI
                  value={scriptContent}
                  onChange={setScriptContent}
                  language="javascript"
                  label="JavaScript Code"
                  height="400px"
                />
              )}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save NPC</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

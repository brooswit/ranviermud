import React, { useEffect, useState } from 'react';
import { areasApi, itemsApi, questScriptsApi } from '../../services/api';
import CodeBlockWithAI from '../common/CodeBlockWithAI';
import AIConfigEdit from '../editor/AIConfigEdit';
import NPCSelector, { NPCListSelector } from '../common/NPCSelector';
import ItemSelector, { ItemListSelector } from '../common/ItemSelector';
import { QuestListSelector } from '../common/QuestSelector';
import FieldWithRevert from '../common/FieldWithRevert';
import { useDraftEditor } from '../../hooks/useDraftEditor';

interface QuestEditorProps {
  bundleName: string;
  areaName: string;
  quest: any;
  onSave: (quest: any) => Promise<void>;
  onCancel: () => void;
}

interface RenderFieldOptions {
  isFieldChanged?: (path: string) => boolean;
  revertField?: (path: string) => void;
  addFieldPath?: string | null;
  addFieldDraft?: string;
  setAddFieldDraft?: (v: string) => void;
  onStartAddField?: (path: string) => void;
  onCommitAddField?: (path: string, key: string) => void;
  onCancelAddField?: () => void;
}

function renderField(
  key: string,
  value: any,
  path: string,
  onChange: (path: string, newValue: any) => void,
  bundleName?: string,
  allAreas?: string[],
  itemsByArea?: Record<string, any[]>,
  options?: RenderFieldOptions
): React.ReactNode {
  const fullPath = path ? `${path}.${key}` : key;

  if (value === null || value === undefined) {
    if (key === 'npc' && bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <NPCSelector
            bundleName={bundleName}
            label="NPC"
            value=""
            onChange={(v) => onChange(fullPath, v)}
          />
        </div>
      );
    }
    if (key === 'npcs' && bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <NPCListSelector
            bundleName={bundleName}
            label="NPCs"
            value={[]}
            onChange={(next) => onChange(fullPath, next)}
          />
        </div>
      );
    }
    if (key === 'item' && bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <ItemSelector
            bundleName={bundleName}
            label="Item"
            value=""
            onChange={(v) => onChange(fullPath, v)}
          />
        </div>
      );
    }
    if (key === 'items' && bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <ItemListSelector
            bundleName={bundleName}
            label="Items"
            value={[]}
            onChange={(next) => onChange(fullPath, next)}
          />
        </div>
      );
    }
    if (key === 'requires' && bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <QuestListSelector
            bundleName={bundleName}
            label="Requires (quests)"
            value={[]}
            onChange={(next) => onChange(fullPath, next)}
          />
        </div>
      );
    }
    return (
      <div key={fullPath} className="form-group">
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

  if (typeof value === 'string' && key === 'npc' && bundleName) {
    return (
      <div key={fullPath} className="form-group">
        <NPCSelector
          bundleName={bundleName}
          label="NPC"
          value={value}
          onChange={(v) => onChange(fullPath, v)}
        />
      </div>
    );
  }

  if (typeof value === 'string' && key === 'item' && bundleName) {
    return (
      <div key={fullPath} className="form-group">
        <ItemSelector
          bundleName={bundleName}
          label="Item"
          value={value}
          onChange={(v) => onChange(fullPath, v)}
        />
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (key === 'npcs' && value.every((v: any) => typeof v === 'string') && bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <NPCListSelector
            bundleName={bundleName}
            label="NPCs"
            value={value as string[]}
            onChange={(next) => onChange(fullPath, next)}
          />
        </div>
      );
    }
    if (key === 'items' && value.every((v: any) => typeof v === 'string') && bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <ItemListSelector
            bundleName={bundleName}
            label="Items"
            value={value as string[]}
            onChange={(next) => onChange(fullPath, next)}
          />
        </div>
      );
    }
    if (key === 'requires' && value.every((v: any) => typeof v === 'string') && bundleName) {
      return (
        <div key={fullPath} className="form-group">
          <QuestListSelector
            bundleName={bundleName}
            label="Requires (quests)"
            value={value as string[]}
            onChange={(next) => onChange(fullPath, next)}
          />
        </div>
      );
    }
    // Check if this is an array of objects (like goals/rewards)
    const isArrayOfObjects = value.length > 0 && value.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));
    
    if (isArrayOfObjects) {
      return (
        <div key={fullPath} className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label>{key}</label>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                const newEntry = { type: '', config: {} };
                onChange(fullPath, [...value, newEntry]);
              }}
            >
              + Add Entry
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {value.map((entry: any, index: number) => (
              <div
                key={index}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '1rem',
                  background: 'var(--bg-secondary)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Entry {index + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => {
                      const newArray = value.filter((_: any, i: number) => i !== index);
                      onChange(fullPath, newArray.length > 0 ? newArray : undefined);
                    }}
                  >
                    Remove
                  </button>
                </div>
                <div className="nested-fields">
                  {Object.entries(entry).map(([entryKey, entryValue]) => {
                    const entryPath = `${fullPath}[${index}]`;
                    const childFullPath = `${entryPath}.${entryKey}`;
                    const content = renderField(entryKey, entryValue, entryPath, onChange, bundleName, allAreas, itemsByArea, options);
                    const isNestedObject = typeof entryValue === 'object' && entryValue !== null && !Array.isArray(entryValue);
                    if (options?.isFieldChanged && options?.revertField && !isNestedObject) {
                      return (
                        <FieldWithRevert key={entryKey} changed={options.isFieldChanged(childFullPath)} onRevert={() => options.revertField!(childFullPath)}>
                          {content}
                        </FieldWithRevert>
                      );
                    }
                    return <React.Fragment key={entryKey}>{content}</React.Fragment>;
                  })}
                  {options?.addFieldPath === entryPath ? (
                    <div className="form-group form-group-inline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="New field name"
                        value={options.addFieldDraft ?? ''}
                        onChange={(e) => options.setAddFieldDraft?.(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const key = (options.addFieldDraft ?? '').trim();
                            if (key) options.onCommitAddField?.(entryPath, key);
                          }
                          if (e.key === 'Escape') options.onCancelAddField?.();
                        }}
                        autoFocus
                        style={{ flex: '1 1 8rem', minWidth: '8rem' }}
                      />
                      <button type="button" className="btn btn-small btn-primary" onClick={() => { const key = (options.addFieldDraft ?? '').trim(); if (key) options.onCommitAddField?.(entryPath, key); }}>
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
                      onClick={() => options?.onStartAddField?.(entryPath)}
                    >
                      + Add Field
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // For primitive arrays, show as list
    const isPrimitiveArray = value.length === 0 || value.every(item => typeof item !== 'object' || item === null);
    if (isPrimitiveArray) {
      return (
        <div key={fullPath} className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label>{key}</label>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                onChange(fullPath, [...value, '']);
              }}
            >
              + Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {value.map((item: any, index: number) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={String(item)}
                  onChange={(e) => {
                    const newArray = [...value];
                    newArray[index] = e.target.value;
                    onChange(fullPath, newArray);
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => {
                    const newArray = value.filter((_: any, i: number) => i !== index);
                    onChange(fullPath, newArray.length > 0 ? newArray : undefined);
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Fallback to JSON for complex arrays
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
              // ignore invalid JSON while typing
            }
          }}
          rows={Math.min(value.length + 2, 14)}
        />
        <small>JSON array (advanced)</small>
      </div>
    );
  }

  if (typeof value === 'object') {
    return (
      <div key={fullPath} className="form-group nested-object">
        <label>{key}</label>
        <div className="nested-fields">
          {Object.entries(value).map(([subKey, subValue]) => {
            const childFullPath = fullPath ? `${fullPath}.${subKey}` : subKey;
            const content = renderField(subKey, subValue, fullPath, onChange, bundleName, allAreas, itemsByArea, options);
            const isChildNestedObject = typeof subValue === 'object' && subValue !== null && !Array.isArray(subValue);
            if (options?.isFieldChanged && options?.revertField && !isChildNestedObject) {
              return (
                <FieldWithRevert key={subKey} changed={options.isFieldChanged(childFullPath)} onRevert={() => options.revertField!(childFullPath)}>
                  {content}
                </FieldWithRevert>
              );
            }
            return <React.Fragment key={subKey}>{content}</React.Fragment>;
          })}
          {options?.addFieldPath === fullPath ? (
            <div className="form-group form-group-inline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <input
                type="text"
                placeholder="New field name"
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
              <button type="button" className="btn btn-small btn-primary" onClick={() => { const key = (options.addFieldDraft ?? '').trim(); if (key) options.onCommitAddField?.(fullPath, key); }}>
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
              onClick={() => options?.onStartAddField?.(fullPath)}
            >
              + Add Field
            </button>
          )}
        </div>
      </div>
    );
  }

  // "exists" as dropdown (true/false) for goal config and similar
  if (key === 'exists' && (typeof value === 'string' || typeof value === 'boolean')) {
    const strVal = value === true || value === 'true' ? 'true' : value === false || value === 'false' ? 'false' : '';
    return (
      <div key={fullPath} className="form-group">
        <label>{key}</label>
        <select
          value={strVal}
          onChange={(e) => {
            const v = e.target.value;
            onChange(fullPath, v === 'true' ? true : v === 'false' ? false : undefined);
          }}
        >
          <option value="">(empty)</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div key={fullPath} className="form-group">
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
      <div key={fullPath} className="form-group">
        <label>{key}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(fullPath, parseFloat(e.target.value) || 0)}
        />
      </div>
    );
  }

  const isLongText = typeof value === 'string' && value.length > 100;
  return (
    <div key={fullPath} className="form-group">
      <label>{key}</label>
      {isLongText ? (
        <textarea
          value={value}
          onChange={(e) => onChange(fullPath, e.target.value)}
          rows={Math.min(Math.ceil(value.length / 80) + 1, 18)}
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

/** Parse path segment: "goals[0]" -> { key: "goals", index: 0 }, "config" -> { key: "config", index: null } */
function parsePathSegment(segment: string): { key: string; index: number | null } {
  const match = segment.match(/^(\w+)\[(\d+)\]$/);
  if (match) return { key: match[1], index: parseInt(match[2], 10) };
  return { key: segment, index: null };
}

function getValueAtPath(obj: any, path: string): any {
  if (!path) return obj;
  const segments = path.split('.');
  let current: any = obj;
  for (const seg of segments) {
    if (current == null) return undefined;
    const { key, index } = parsePathSegment(seg);
    current = current[key];
    if (index !== null && current != null) current = current[index];
  }
  return current;
}

function updateNestedValue(obj: any, path: string, value: any): any {
  const segments = path.split('.');
  const newObj = JSON.parse(JSON.stringify(obj));
  let current = newObj;

  for (let i = 0; i < segments.length - 1; i++) {
    const { key, index } = parsePathSegment(segments[i]);
    const nextIndex = parsePathSegment(segments[i + 1]);
    const isNextArray = nextIndex.index !== null;
    if (index !== null) {
      if (!Array.isArray(current[key])) current[key] = [];
      current = current[key];
      current = current[index];
    } else {
      if (!(key in current)) current[key] = isNextArray ? [] : {};
      if (typeof current[key] !== 'object' || current[key] === null) current[key] = isNextArray ? [] : {};
      const copy = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
      current[key] = copy;
      current = copy;
    }
  }

  const last = parsePathSegment(segments[segments.length - 1]);
  // Only remove the key when value is undefined; treat '' as "clear but keep field" so selectors don't disappear
  if (value === undefined) {
    if (last.index !== null) {
      current.splice(last.index, 1);
    } else {
      const { [last.key]: _removed, ...rest } = current;
      if (segments.length === 1) return rest;
      for (const k of Object.keys(current)) delete current[k];
      Object.assign(current, rest);
    }
    return newObj;
  }

  if (last.index !== null) {
    if (!Array.isArray(current)) current = [];
    current[last.index] = value;
  } else {
    current[last.key] = value;
  }
  return newObj;
}

export default function QuestEditor({ bundleName, areaName, quest: initialQuest, onSave, onCancel }: QuestEditorProps) {
  const { draft: quest, setDraft: setQuest, updateDraft, isFieldChanged, revertField, handleSave } = useDraftEditor(initialQuest, {
    onSave,
    resetKey: initialQuest?.id ?? ''
  });
  const [allAreas, setAllAreas] = useState<string[]>([]);
  const [itemsByArea, setItemsByArea] = useState<Record<string, any[]>>({});
  const [scriptContent, setScriptContent] = useState<string>('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    loadAreasAndItems();
  }, [bundleName]);

  async function loadAreasAndItems() {
    if (!bundleName) return;

    try {
      // Load all areas in the bundle
      const areasRes = await areasApi.getAll(bundleName);
      setAllAreas(areasRes.areas);

      // Load items for each area
      const itemsMap: Record<string, any[]> = {};
      for (const area of areasRes.areas) {
        try {
          const itemsRes = await itemsApi.getAll(bundleName, area);
          itemsMap[area] = itemsRes.items;
        } catch {
          itemsMap[area] = [];
        }
      }
      setItemsByArea(itemsMap);
    } catch (error) {
      console.error('Error loading areas and items:', error);
    }
  }

  function handleFieldChange(path: string, newValue: any) {
    setQuest((prev: any) => updateNestedValue(prev, path, newValue));
  }

  function handleStartAddField(path: string) {
    setAddFieldPath(path);
    setAddFieldDraft('');
  }
  function handleCommitAddField(path: string, key: string) {
    if (!key) return;
    const current = path === '' ? quest : getValueAtPath(quest, path);
    const obj = typeof current === 'object' && current !== null && !Array.isArray(current) ? current : {};
    if (path === '') {
      if (!Object.prototype.hasOwnProperty.call(quest, key)) setQuest({ ...quest, [key]: '' });
    } else {
      handleFieldChange(path, { ...obj, [key]: '' });
    }
    setAddFieldPath(null);
    setAddFieldDraft('');
  }
  function handleCancelAddField() {
    setAddFieldPath(null);
    setAddFieldDraft('');
  }

  async function loadScript() {
    if (!quest.script) {
      setScriptContent('');
      setScriptError(null);
      return;
    }

    setScriptLoading(true);
    setScriptError(null);
    try {
      const data = await questScriptsApi.get(bundleName, areaName, quest.script);
      setScriptContent(data.script.content);
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'Failed to load script');
      setScriptContent('');
    } finally {
      setScriptLoading(false);
    }
  }

  useEffect(() => {
    loadScript();
  }, [quest.script, bundleName, areaName]);

  async function handleAddScript() {
    const scriptName = prompt('Enter script name (without .js extension):');
    if (!scriptName || !scriptName.trim()) return;

    const trimmedName = scriptName.trim();
    const newQuest = { ...quest, script: trimmedName };
    setQuest(newQuest);

    // Create empty script file
    try {
      await questScriptsApi.save(bundleName, areaName, trimmedName, {
        type: 'quests',
        name: trimmedName,
        content: `'use strict';\n\nmodule.exports = {\n  listeners: {\n    // Add event listeners here\n  }\n};`
      });
      await loadScript();
    } catch (err) {
      alert('Failed to create script: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  async function handleRemoveScript() {
    if (!quest.script) return;

    if (!confirm(`Are you sure you want to remove the script "${quest.script}"? This will delete the script file.`)) {
      return;
    }

    try {
      await questScriptsApi.delete(bundleName, areaName, quest.script);
      const newQuest = { ...quest };
      delete newQuest.script;
      setQuest(newQuest);
      setScriptContent('');
      setScriptError(null);
    } catch (err) {
      alert('Failed to delete script: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Save the script if it exists and has content
    if (quest.script && scriptContent) {
      try {
        await questScriptsApi.save(bundleName, areaName, quest.script, {
          type: 'quests',
          name: quest.script,
          content: scriptContent
        });
      } catch (err) {
        alert('Failed to save script: ' + (err instanceof Error ? err.message : 'Unknown error'));
        return; // Don't save quest if script save fails
      }
    }
    
    await handleSave(quest);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Always show id first: label and value on same row */}
      <FieldWithRevert changed={isFieldChanged('id')} onRevert={() => revertField('id')} inline>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <label style={{ minWidth: '4rem', marginBottom: 0 }}>id</label>
          <input
            type="text"
            value={quest.id || ''}
            onChange={(e) => updateDraft('id', e.target.value)}
            required
            style={{ flex: 1, minWidth: '10rem' }}
          />
        </div>
      </FieldWithRevert>

      {/* Render remaining fields dynamically. Nested objects and arrays (e.g. goals) get granular revert per child field. */}
      {Object.entries(quest)
        .filter(([key]) => key !== 'id')
        .map(([key, value]) => {
          const isNestedObject = typeof value === 'object' && value !== null && !Array.isArray(value);
          const isArrayField = Array.isArray(value);
          const useGranularOnly = isNestedObject || isArrayField;
          const fieldContent = renderField(key, value, '', handleFieldChange, bundleName, allAreas, itemsByArea, { isFieldChanged, revertField });
          if (useGranularOnly) return <React.Fragment key={key}>{fieldContent}</React.Fragment>;
          return (
            <FieldWithRevert key={key} changed={isFieldChanged(key)} onRevert={() => revertField(key)}>
              {fieldContent}
            </FieldWithRevert>
          );
        })}

      <div className="form-group">
        {addFieldPath === '' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="New field name"
              value={addFieldDraft}
              onChange={(e) => setAddFieldDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const key = addFieldDraft.trim();
                  if (key && !Object.prototype.hasOwnProperty.call(quest, key)) handleCommitAddField('', key);
                }
                if (e.key === 'Escape') handleCancelAddField();
              }}
              autoFocus
              style={{ flex: '1 1 8rem', minWidth: '8rem' }}
            />
            <button type="button" className="btn btn-small btn-primary" onClick={() => { const key = addFieldDraft.trim(); if (key && !Object.prototype.hasOwnProperty.call(quest, key)) handleCommitAddField('', key); }}>
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

      <AIConfigEdit config={quest} resourceType="quest" onApply={setQuest} />

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Save Quest</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}


import React, { useState, useEffect } from 'react';
import type { Item } from '../../types/area';
import CodeBlockWithAI from '../common/CodeBlockWithAI';
import AIConfigEdit from '../editor/AIConfigEdit';
import NPCSelector, { NPCListSelector } from '../common/NPCSelector';
import ItemSelector, { ItemListSelector } from '../common/ItemSelector';
import FieldWithRevert from '../common/FieldWithRevert';
import AddFieldInline from '../common/AddFieldInline';
import { itemScriptsApi, itemsApi, areasApi } from '../../services/api';
import { useDraftEditor } from '../../hooks/useDraftEditor';
import { setValueAtPath } from '../../utils/draftEditor';

interface ItemEditorProps {
  bundleName: string;
  areaName: string;
  item: Item;
  isNew?: boolean;
  onSave: (item: Item) => Promise<void>;
  onCancel: () => void;
}

// Field definitions for dropdowns
const FIELD_OPTIONS: Record<string, string[]> = {
  'type': ['WEAPON', 'ARMOR', 'POTION', 'CONTAINER', 'OBJECT', 'KEY', 'FOOD', 'SCROLL'],
  'metadata.slot': ['wield', 'chest', 'shield', 'head', 'neck', 'shoulders', 'arms', 'waist', 'legs', 'feet', 'finger', 'trinket'],
  'quality': ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary'],
  'metadata.quality': ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary'],
  'metadata.sellable.currency': ['gold', 'silver', 'copper', 'platinum'],
  'metadata.usable.options.stat': ['health', 'energy', 'mana', 'strength', 'agility', 'intellect', 'stamina', 'armor', 'critical'],
  'metadata.usable.state.stat': ['health', 'energy', 'mana', 'strength', 'agility', 'intellect', 'stamina', 'armor', 'critical'],
  'exists': ['true', 'false'],
};

interface RenderFieldOptions {
  isFieldChanged?: (path: string) => boolean;
  revertField?: (path: string) => void;
}

function renderField(
  key: string,
  value: any,
  path: string = '',
  onChange: (path: string, newValue: any) => void,
  bundleName?: string,
  allAreas?: string[],
  itemsByArea?: Record<string, any[]>,
  options?: RenderFieldOptions
): React.ReactNode {
  const fullPath = path ? `${path}.${key}` : key;

  // Check if this field should be a dropdown
  const dropdownOptions = FIELD_OPTIONS[fullPath] || FIELD_OPTIONS[key];
  
  if (value === null || value === undefined) {
    if (dropdownOptions) {
      return (
        <div key={fullPath} className="form-group">
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
    // Single NPC ref (e.g. item.npc) → NPCSelector (no − / +)
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
    // NPC refs array → NPCListSelector (− and + Add)
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
    // Single item ref → ItemSelector (no − / +)
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
    // Item refs array → ItemListSelector (− and + Add)
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

  // Single NPC ref (e.g. item.npc) when value is set
  if (key === 'npc' && typeof value === 'string' && bundleName) {
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

  // Single item ref when value is set
  if (key === 'item' && typeof value === 'string' && bundleName) {
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
    const isPrimitiveArray = value.every((v) => v === null || ['string', 'number', 'boolean'].includes(typeof v));
    const isObjectArray = value.every((v) => v && typeof v === 'object' && !Array.isArray(v));

    // NPC refs array → NPCListSelector (− and + Add)
    if (key === 'npcs' && value.every((v) => typeof v === 'string') && bundleName) {
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
    // Item refs array → ItemListSelector (− and + Add)
    if (key === 'items' && value.every((v) => typeof v === 'string') && bundleName) {
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

    return (
      <div key={fullPath} className="form-group">
        <label>{key}</label>
        {isPrimitiveArray ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {value.map((item, idx) => (
              <div key={`${fullPath}.${idx}`} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type={typeof item === 'number' ? 'number' : 'text'}
                  value={item ?? ''}
                  onChange={(e) => {
                    const next = [...value];
                    const raw = e.target.value;
                    if (typeof item === 'number') {
                      next[idx] = raw === '' ? 0 : parseFloat(raw);
                    } else if (typeof item === 'boolean') {
                      // Represent boolean as "true/false" in text input if it appears in an array
                      next[idx] = raw.toLowerCase() === 'true';
                    } else {
                      next[idx] = raw;
                    }
                    onChange(fullPath, next);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => {
                    const next = value.filter((_: any, i: number) => i !== idx);
                    onChange(fullPath, next);
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-small btn-secondary"
                onClick={() => {
                  const next = [...value, ''];
                  onChange(fullPath, next);
                }}
              >
                + Add
              </button>
            </div>
            <small>List</small>
          </div>
        ) : isObjectArray ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {value.map((obj, idx) => (
              <div key={`${fullPath}.${idx}`} className="form-group nested-object" style={{ marginBottom: 0 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>#{idx + 1}</span>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => {
                      const next = value.filter((_: any, i: number) => i !== idx);
                      onChange(fullPath, next);
                    }}
                  >
                    Remove
                  </button>
                </label>
                <div className="nested-fields">
                  {Object.entries(obj).map(([subKey, subValue]) =>
                    renderField(subKey, subValue, '', (subPath, newVal) => {
                      // subPath here is just subKey (since we pass path '')
                      const updatedObj = updateNestedValue(obj, subPath, newVal);
                      const next = [...value];
                      next[idx] = updatedObj;
                      onChange(fullPath, next);
                    }, bundleName, allAreas, itemsByArea)
                  )}
                  <AddFieldInline
                    key={`${fullPath}.${idx}.add`}
                    onAdd={(newKey) => {
                      const updatedObj = { ...obj, [newKey]: '' };
                      const next = [...value];
                      next[idx] = updatedObj;
                      onChange(fullPath, next);
                    }}
                    existingKeys={Object.keys(obj)}
                    buttonLabel="+ Add Field"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-small btn-secondary"
              onClick={() => {
                const next = [...value, {}];
                onChange(fullPath, next);
              }}
            >
              + Add Entry
            </button>
            <small>List of objects</small>
          </div>
        ) : (
          <>
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
            <small>JSON array (advanced)</small>
          </>
        )}
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
            // Only wrap leaf fields in FieldWithRevert so the section (e.g. "decay") isn't marked changed when only a child (e.g. "duration") changed
            const isNestedObject = typeof subValue === 'object' && subValue !== null && !Array.isArray(subValue);
            if (options?.isFieldChanged && options?.revertField && !isNestedObject) {
              return (
                <FieldWithRevert key={subKey} changed={options.isFieldChanged(childFullPath)} onRevert={() => options.revertField!(childFullPath)}>
                  {content}
                </FieldWithRevert>
              );
            }
            return <React.Fragment key={subKey}>{content}</React.Fragment>;
          })}
          <AddFieldInline
            key={`${fullPath}.add`}
            onAdd={(newKey) => {
              const newObj = { ...value, [newKey]: '' };
              onChange(fullPath, newObj);
            }}
            existingKeys={Object.keys(value)}
            buttonLabel="+ Add Field"
          />
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

  // String or other primitive
  // Check if this should be a dropdown
  if (dropdownOptions && typeof value === 'string') {
    return (
      <div key={fullPath} className="form-group">
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
    <div key={fullPath} className="form-group">
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

function updateNestedValue(obj: any, path: string, value: any): any {
  return setValueAtPath(obj, path, value);
}

export default function ItemEditor({ bundleName, areaName, item: initialItem, isNew = false, onSave, onCancel }: ItemEditorProps) {
  const { draft: item, setDraft: setItem, updateDraft, isFieldChanged, revertField, handleSave } = useDraftEditor(initialItem, {
    isNew,
    onSave,
    resetKey: initialItem.id
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
      const areasRes = await areasApi.getAll(bundleName);
      setAllAreas(areasRes.areas);

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

  useEffect(() => {
    loadScript();
  }, [item.script, bundleName, areaName]);

  async function loadScript() {
    if (!item.script) {
      setScriptContent('');
      setScriptError(null);
      return;
    }

    setScriptLoading(true);
    setScriptError(null);
    try {
      const data = await itemScriptsApi.get(bundleName, areaName, item.script);
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
    const newItem = { ...item, script: trimmedName };
    setItem(newItem);

    // Create empty script file
    try {
      await itemScriptsApi.save(bundleName, areaName, trimmedName, {
        type: 'items',
        name: trimmedName,
        content: `'use strict';\n\nmodule.exports = {\n  listeners: {\n    // Add event listeners here\n  }\n};`
      });
      await loadScript();
    } catch (err) {
      alert('Failed to create script: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  async function handleRemoveScript() {
    if (!item.script) return;

    if (!confirm(`Are you sure you want to remove the script "${item.script}"? This will delete the script file.`)) {
      return;
    }

    try {
      await itemScriptsApi.delete(bundleName, areaName, item.script);
      const newItem = { ...item };
      delete newItem.script;
      setItem(newItem);
      setScriptContent('');
      setScriptError(null);
    } catch (err) {
      alert('Failed to delete script: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }


  function handleFieldChange(path: string, newValue: any) {
    updateDraft(path, newValue);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Save the script if it exists and has content
    if (item.script && scriptContent) {
      try {
        await itemScriptsApi.save(bundleName, areaName, item.script, {
          type: 'items',
          name: item.script,
          content: scriptContent
        });
      } catch (err) {
        alert('Failed to save script: ' + (err instanceof Error ? err.message : 'Unknown error'));
        return; // Don't save item if script save fails
      }
    }
    
    await handleSave(item);
  }

  // Special handling for keywords array (common case)
  const keywordsValue = Array.isArray(item.keywords) 
    ? item.keywords.join(', ') 
    : (typeof item.keywords === 'string' ? item.keywords : '');

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete Item "${item.name || item.id}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await itemsApi.delete(bundleName, areaName, item.id);
      onCancel(); // Navigate back
    } catch (error) {
      alert('Failed to delete item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  return (
    <div className="form-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Edit Item: {item.name || item.id}</h2>
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        {/* Always show id first: label and value on same row */}
        <FieldWithRevert changed={isFieldChanged('id')} onRevert={() => revertField('id')} inline>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            <label style={{ minWidth: '4rem', marginBottom: 0 }}>id</label>
            <input
              type="text"
              value={item.id}
              onChange={(e) => updateDraft('id', e.target.value)}
              required
              style={{ flex: 1, minWidth: '10rem' }}
            />
          </div>
        </FieldWithRevert>

        {/* Special handling for keywords */}
        <FieldWithRevert changed={isFieldChanged('keywords')} onRevert={() => revertField('keywords')}>
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

        {/* Dynamically render all other fields. Nested objects (e.g. metadata) get granular revert per child field, not one Revert for the whole section. */}
        {Object.entries(item)
          .filter(([key]) => key !== 'id' && key !== 'keywords')
          .map(([key, value]) => {
            const isNestedObject = typeof value === 'object' && value !== null && !Array.isArray(value);
            const isListField = ['items', 'quests', 'npcs'].includes(key);
            const useGranularOnly = isNestedObject || isListField;
            const fieldContent = renderField(key, value, '', handleFieldChange, bundleName, allAreas, itemsByArea, { isFieldChanged, revertField });
            if (useGranularOnly) return <React.Fragment key={key}>{fieldContent}</React.Fragment>;
            return (
              <FieldWithRevert key={key} changed={isFieldChanged(key)} onRevert={() => revertField(key)}>
                {fieldContent}
              </FieldWithRevert>
            );
          })}

        {/* Add new field */}
        <div className="form-group">
          <AddFieldInline
            onAdd={(newKey) => {
              if (!Object.prototype.hasOwnProperty.call(item, newKey)) {
                setItem({ ...item, [newKey]: '' });
              }
            }}
            existingKeys={Object.keys(item)}
            buttonLabel="+ Add Field"
          />
        </div>

        <AIConfigEdit config={item} resourceType="item" onApply={setItem} />

        {/* Script Section */}
        <div className="script-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Item Script</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {item.script ? (
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

          {item.script && (
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Script: <code>{item.script}.js</code>
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
          <button type="submit" className="btn btn-primary">Save Item</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

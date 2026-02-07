import React, { useMemo } from 'react';
import { useAllAreaItems, type AreaItemOption } from '../../hooks/useAllAreaItems';
import FieldWithRevert from './FieldWithRevert';

export interface LootPoolEntry {
  itemRef: string;
  weight: number;
}

export interface LootPoolItemsEditorProps {
  bundleName: string;
  value: LootPoolEntry[];
  onChange: (value: LootPoolEntry[]) => void;
  label?: string;
  disabled?: boolean;
  /** When set, each row gets yellow/changed UI and a Revert button (path = itemsPath + index). */
  isFieldChanged?: (path: string) => boolean;
  revertField?: (path: string) => void;
  itemsPath?: string;
}

function ItemWeightRow({
  options,
  areas,
  entry,
  disabled,
  onChange,
  onRemove
}: {
  options: AreaItemOption[];
  areas: string[];
  entry: LootPoolEntry;
  disabled: boolean;
  onChange: (entry: LootPoolEntry) => void;
  onRemove: () => void;
}) {
  const [area] = entry.itemRef.includes(':') ? entry.itemRef.split(/:(.*)/).filter(Boolean) : ['', ''];
  const itemsInArea = useMemo(
    () => (area ? options.filter((o) => o.area === area) : []),
    [options, area]
  );
  const itemValue = itemsInArea.some((o) => o.value === entry.itemRef) ? entry.itemRef : '';

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={area}
        onChange={(e) => {
          const newArea = e.target.value;
          if (!newArea) {
            onChange({ ...entry, itemRef: '' });
            return;
          }
          const items = options.filter((o) => o.area === newArea);
          const first = items[0];
          onChange({ ...entry, itemRef: first ? first.value : '' });
        }}
        disabled={disabled || areas.length === 0}
        style={{ minWidth: '8rem', maxWidth: '14rem' }}
        aria-label="Area"
      >
        <option value="">Select area…</option>
        {areas.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <select
        value={itemValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ ...entry, itemRef: v || '' });
        }}
        disabled={disabled || !area || itemsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="Item"
      >
        <option value="">{!area ? 'Select area first' : 'Select item…'}</option>
        {itemsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.itemId}
          </option>
        ))}
      </select>
      <div className="form-group" style={{ width: '7rem', marginBottom: 0, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <label style={{ marginBottom: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Weight</label>
        <input
          type="number"
          min={1}
          step={1}
          value={entry.weight}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange({ ...entry, weight: Number.isNaN(n) || n < 1 ? 1 : n });
          }}
          disabled={disabled}
          style={{ width: '3.5rem' }}
        />
      </div>
      <button
        type="button"
        className="btn btn-small btn-danger"
        onClick={onRemove}
        aria-label="Remove"
      >
        Remove
      </button>
    </div>
  );
}

/**
 * Edits a list of loot pool entries: item ref (area + item) + weight per row.
 */
export default function LootPoolItemsEditor({
  bundleName,
  value,
  onChange,
  label = 'Items',
  disabled = false,
  isFieldChanged,
  revertField,
  itemsPath = 'items'
}: LootPoolItemsEditorProps) {
  const { options, loading, error } = useAllAreaItems(bundleName);
  const areas = useMemo(
    () => [...new Set(options.map((o) => o.area))].sort(),
    [options]
  );
  const list = Array.isArray(value) ? value : [];

  const setEntry = (index: number, entry: LootPoolEntry) => {
    const next = [...list];
    if (index >= next.length) next.push(entry);
    else next[index] = entry;
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(list.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...list, { itemRef: '', weight: 1 }]);
  };

  const hasRevert = isFieldChanged && revertField;

  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      {error && (
        <small style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>
          {error}
        </small>
      )}
      {loading && (
        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
          Loading items…
        </small>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {list.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border)', marginBottom: '0.25rem' }}>
            <span style={{ minWidth: '8rem', maxWidth: '14rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Area</span>
            <span style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Item</span>
            <span style={{ width: '7rem', flexShrink: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Weight</span>
            <span style={{ width: '4.5rem', flexShrink: 0 }} aria-hidden="true" />
          </div>
        )}
        {list.map((entry, idx) => {
          const rowPath = `${itemsPath}.${idx}`;
          const row = (
            <ItemWeightRow
              key={`${idx}-${entry.itemRef}`}
              options={options}
              areas={areas}
              entry={entry}
              disabled={disabled}
              onChange={(e) => setEntry(idx, e)}
              onRemove={() => remove(idx)}
            />
          );
          if (hasRevert) {
            return (
              <FieldWithRevert key={`${idx}-${entry.itemRef}`} changed={isFieldChanged(rowPath)} onRevert={() => revertField(rowPath)}>
                {row}
              </FieldWithRevert>
            );
          }
          return <React.Fragment key={`${idx}-${entry.itemRef}`}>{row}</React.Fragment>;
        })}
        <button
          type="button"
          className="btn btn-small btn-success"
          onClick={add}
          disabled={disabled || loading || areas.length === 0}
          style={{ alignSelf: 'flex-start' }}
        >
          Add item
        </button>
      </div>
      <small style={{ color: 'var(--text-secondary)' }}>
        Weight is the drop chance relative to other items in this pool.
      </small>
    </div>
  );
}

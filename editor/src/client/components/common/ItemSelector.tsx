import React, { useMemo, useState } from 'react';
import { useAllAreaItems, type AreaItemOption } from '../../hooks/useAllAreaItems';
import DiffListRow, { type DiffListRowState } from './DiffListRow';

export interface ItemSelectorProps {
  bundleName: string;
  /** Single entity ref: "area:itemId" */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export interface ItemListSelectorProps {
  bundleName: string;
  /** Entity refs: "area:itemId"[] */
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  disabled?: boolean;
  /** When set, Remove marks the row as removed (red row + Revert) instead of removing from value; apply removals on save */
  markedForRemoval?: Set<string>;
  onMarkRemoved?: (ref: string) => void;
  onRevertRemoval?: (ref: string) => void;
  /** Saved list for diff: enables changed (yellow) and new (green) row states and per-row Revert */
  savedValue?: string[];
}

type Row = { type: 'set'; ref: string; index: number } | { type: 'blank'; index: number };

/**
 * Single item selector. One row: [Area dropdown] [Item dropdown]. No − or + Add.
 * Use for fields like FetchGoal config.item, etc.
 */
export function ItemSelector({
  bundleName,
  value,
  onChange,
  label = 'Item',
  disabled = false
}: ItemSelectorProps) {
  const { options, loading, error } = useAllAreaItems(bundleName);
  const areas = useMemo(
    () => [...new Set(options.map((o) => o.area))].sort(),
    [options]
  );

  return (
    <div className="form-group item-selector">
      {label && <label>{label}</label>}
      {error && (
        <small style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>
          {error}
        </small>
      )}
      {loading && (
        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
          Loading areas and items…
        </small>
      )}
      <SingleItemRow
        options={options}
        areas={areas}
        entityRef={value || ''}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

/**
 * Item list selector. Each entry: [Area] [Item] [−]. "+ Add" at bottom adds a blank row.
 * Use for item arrays (e.g. container contents, loot lists), etc.
 */
export function ItemListSelector({
  bundleName,
  value,
  onChange,
  label = 'Items',
  disabled = false,
  markedForRemoval,
  onMarkRemoved,
  onRevertRemoval,
  savedValue
}: ItemListSelectorProps) {
  const { options, loading, error } = useAllAreaItems(bundleName);
  const [blankRows, setBlankRows] = useState(0);

  const areas = useMemo(
    () => [...new Set(options.map((o) => o.area))].sort(),
    [options]
  );

  const list = Array.isArray(value) ? value : [];
  const savedList = Array.isArray(savedValue) ? savedValue : [];
  const savedSet = useMemo(() => new Set(savedList), [savedList]);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = list.map((ref, i) => ({ type: 'set', ref, index: i }));
    for (let i = 0; i < blankRows; i++) out.push({ type: 'blank', index: list.length + i });
    return out;
  }, [list, blankRows]);

  const updateEntry = (index: number, entityRef: string) => {
    const next = [...list];
    if (index >= next.length) next.push(entityRef);
    else next[index] = entityRef;
    onChange(next);
  };

  const removeEntry = (index: number) => {
    onChange(list.filter((_, i) => i !== index));
  };

  const removeBlank = () => setBlankRows((n) => Math.max(0, n - 1));

  const addBlank = () => setBlankRows((n) => n + 1);

  const commitBlank = (entityRef: string) => {
    onChange([...list, entityRef]);
    setBlankRows((n) => Math.max(0, n - 1));
  };

  const stagedRemove = Boolean(onMarkRemoved && onRevertRemoval);

  const getRowState = (row: { type: 'set'; ref: string; index: number }): DiffListRowState => {
    if (stagedRemove && markedForRemoval?.has(row.ref)) return 'removed';
    if (row.index < savedList.length && savedList[row.index] !== row.ref) return 'changed';
    if (!savedSet.has(row.ref)) return 'new';
    return 'unchanged';
  };

  const handleRevertRow = (row: { type: 'set'; ref: string; index: number }) => {
    const state = getRowState(row);
    if (state === 'removed' && onRevertRemoval) onRevertRemoval(row.ref);
    else if (state === 'new') removeEntry(row.index);
    else if (state === 'changed' && row.index < savedList.length) {
      const next = [...list];
      next[row.index] = savedList[row.index];
      onChange(next);
    }
  };

  return (
    <div className="form-group item-list-selector">
      {label && <label>{label}</label>}
      {error && (
        <small style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>
          {error}
        </small>
      )}
      {loading && (
        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
          Loading areas and items…
        </small>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rows.map((row) =>
          row.type === 'set' ? (
            <ItemRowWithRemove
              key={`set-${row.index}-${row.ref}`}
              options={options}
              areas={areas}
              entityRef={row.ref}
              disabled={disabled}
              onAreaOrItemChange={(ref) => updateEntry(row.index, ref)}
              onRemove={() => (stagedRemove ? onMarkRemoved?.(row.ref) : removeEntry(row.index))}
              diffState={getRowState(row)}
              onRevert={(stagedRemove || savedList.length > 0) ? () => handleRevertRow(row) : undefined}
            />
          ) : (
            <BlankItemRowWithRemove
              key={`blank-${row.index}`}
              options={options}
              areas={areas}
              disabled={disabled}
              onCommit={commitBlank}
              onRemove={removeBlank}
            />
          )
        )}
        <button
          type="button"
          onClick={addBlank}
          disabled={disabled || loading || areas.length === 0}
          className="btn btn-small btn-success"
          style={{ alignSelf: 'flex-start' }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

/** Single row: [Area] [Item] only. No remove button. */
function SingleItemRow({
  options,
  areas,
  entityRef,
  disabled,
  onChange
}: {
  options: AreaItemOption[];
  areas: string[];
  entityRef: string;
  disabled: boolean;
  onChange: (entityRef: string) => void;
}) {
  const [area] = entityRef.includes(':') ? entityRef.split(/:(.*)/).filter(Boolean) : ['', ''];
  const itemsInArea = useMemo(
    () => (area ? options.filter((o) => o.area === area) : []),
    [options, area]
  );
  const itemValue = itemsInArea.some((o) => o.value === entityRef) ? entityRef : '';

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={area}
        onChange={(e) => {
          const newArea = e.target.value;
          if (!newArea) {
            onChange('');
            return;
          }
          const items = options.filter((o) => o.area === newArea);
          const first = items[0];
          onChange(first ? first.value : '');
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
          onChange(v || '');
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
    </div>
  );
}

/** Row with remove/revert (for list). Uses DiffListRow for consistent diff UI. */
function ItemRowWithRemove({
  options,
  areas,
  entityRef,
  disabled,
  onAreaOrItemChange,
  onRemove,
  diffState,
  onRevert
}: {
  options: AreaItemOption[];
  areas: string[];
  entityRef: string;
  disabled: boolean;
  onAreaOrItemChange: (entityRef: string) => void;
  onRemove: () => void;
  diffState: DiffListRowState;
  onRevert?: () => void;
}) {
  const [area] = entityRef.includes(':') ? entityRef.split(/:(.*)/).filter(Boolean) : ['', ''];
  const itemsInArea = useMemo(
    () => (area ? options.filter((o) => o.area === area) : []),
    [options, area]
  );
  const itemValue = itemsInArea.some((o) => o.value === entityRef) ? entityRef : '';

  return (
    <DiffListRow
      state={diffState}
      onRevert={(diffState === 'removed' || diffState === 'new' || diffState === 'changed') ? onRevert : undefined}
      onRemove={diffState === 'unchanged' ? onRemove : undefined}
      disabled={disabled}
      removeAriaLabel="Remove"
    >
      <select
        value={area}
        onChange={(e) => {
          const newArea = e.target.value;
          if (!newArea) return;
          const items = options.filter((o) => o.area === newArea);
          const first = items[0];
          if (first) onAreaOrItemChange(first.value);
          else onRemove();
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
          if (v) onAreaOrItemChange(v);
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
    </DiffListRow>
  );
}

function BlankItemRowWithRemove({
  options,
  areas,
  disabled,
  onCommit,
  onRemove
}: {
  options: AreaItemOption[];
  areas: string[];
  disabled: boolean;
  onCommit: (entityRef: string) => void;
  onRemove: () => void;
}) {
  const [area, setArea] = useState('');
  const itemsInArea = useMemo(
    () => (area ? options.filter((o) => o.area === area) : []),
    [options, area]
  );

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={area}
        onChange={(e) => setArea(e.target.value)}
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
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v) onCommit(v);
        }}
        disabled={disabled || !area || itemsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="Item"
      >
        <option value="">
          {!area ? 'Select area first' : 'Select item…'}
        </option>
        {itemsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.itemId}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-small btn-danger"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove"
      >
        Remove
      </button>
    </div>
  );
}

export default ItemSelector;

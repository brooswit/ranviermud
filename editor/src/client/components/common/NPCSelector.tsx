import React, { useMemo, useState } from 'react';
import { useAllAreaNPCs, type AreaNPCOption } from '../../hooks/useAllAreaNPCs';
import DiffListRow from './DiffListRow';

export interface NPCSelectorProps {
  bundleName: string;
  /** Single entity ref: "area:npcId" */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export interface NPCListSelectorProps {
  bundleName: string;
  /** Entity refs: "area:npcId"[] */
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  disabled?: boolean;
  markedForRemoval?: Set<string>;
  onMarkRemoved?: (ref: string) => void;
  onRevertRemoval?: (ref: string) => void;
  /** Saved list for diff: enables changed/new row states and per-row Revert */
  savedValue?: string[];
}

type Row = { type: 'set'; ref: string; index: number } | { type: 'blank'; index: number };

/**
 * Single NPC selector. One row: [Area dropdown] [NPC dropdown]. No − or + Add.
 * Use for fields like quest goal config.npc, item.npc, etc.
 */
export function NPCSelector({
  bundleName,
  value,
  onChange,
  label = 'NPC',
  disabled = false
}: NPCSelectorProps) {
  const { options, loading, error } = useAllAreaNPCs(bundleName);
  const areas = useMemo(
    () => [...new Set(options.map((o) => o.area))].sort(),
    [options]
  );

  return (
    <div className="form-group npc-selector">
      {label && <label>{label}</label>}
      {error && (
        <small style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>
          {error}
        </small>
      )}
      {loading && (
        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
          Loading areas and NPCs…
        </small>
      )}
      <SingleNPCRow
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
 * NPC list selector. Each entry: [Area] [NPC] [−]. "+ Add" at bottom adds a blank row.
 * Use for room.npcs, behavior config npcs, quest npcs arrays, etc.
 */
export function NPCListSelector({
  bundleName,
  value,
  onChange,
  label = 'NPCs',
  disabled = false,
  markedForRemoval,
  onMarkRemoved,
  onRevertRemoval,
  savedValue
}: NPCListSelectorProps) {
  const { options, loading, error } = useAllAreaNPCs(bundleName);
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

  const stagedRemove = Boolean(onMarkRemoved && onRevertRemoval);

  const getRowState = (row: { type: 'set'; ref: string; index: number }): DiffListRowState => {
    if (stagedRemove && markedForRemoval?.has(row.ref)) return 'removed';
    // Edit at existing index: same slot, different ref → changed (not "new")
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

  const removeBlank = () => setBlankRows((n) => Math.max(0, n - 1));

  const addBlank = () => setBlankRows((n) => n + 1);

  const commitBlank = (entityRef: string) => {
    onChange([...list, entityRef]);
    setBlankRows((n) => Math.max(0, n - 1));
  };

  return (
    <div className="form-group npc-list-selector">
      {label && <label>{label}</label>}
      {error && (
        <small style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>
          {error}
        </small>
      )}
      {loading && (
        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
          Loading areas and NPCs…
        </small>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rows.map((row) =>
          row.type === 'set' ? (
            <NPCRowWithRemove
              key={`set-${row.index}-${row.ref}`}
              options={options}
              areas={areas}
              entityRef={row.ref}
              disabled={disabled}
              onAreaOrNpcChange={(ref) => updateEntry(row.index, ref)}
              onRemove={() => (stagedRemove ? onMarkRemoved?.(row.ref) : removeEntry(row.index))}
              diffState={getRowState(row)}
              onRevert={(stagedRemove || savedList.length > 0) ? () => handleRevertRow(row) : undefined}
            />
          ) : (
            <BlankNPCRowWithRemove
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

/** Single row: [Area] [NPC] only. No remove button. */
function SingleNPCRow({
  options,
  areas,
  entityRef,
  disabled,
  onChange
}: {
  options: AreaNPCOption[];
  areas: string[];
  entityRef: string;
  disabled: boolean;
  onChange: (entityRef: string) => void;
}) {
  const [area] = entityRef.includes(':') ? entityRef.split(/:(.*)/).filter(Boolean) : ['', ''];
  const npcsInArea = useMemo(
    () => (area ? options.filter((o) => o.area === area) : []),
    [options, area]
  );
  const npcValue = npcsInArea.some((o) => o.value === entityRef) ? entityRef : '';

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
          const npcs = options.filter((o) => o.area === newArea);
          const first = npcs[0];
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
        value={npcValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v || '');
        }}
        disabled={disabled || !area || npcsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="NPC"
      >
        <option value="">{!area ? 'Select area first' : 'Select NPC…'}</option>
        {npcsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.npcId}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Row with remove/revert (for list). Uses DiffListRow for consistent diff UI. */
function NPCRowWithRemove({
  options,
  areas,
  entityRef,
  disabled,
  onAreaOrNpcChange,
  onRemove,
  diffState,
  onRevert
}: {
  options: AreaNPCOption[];
  areas: string[];
  entityRef: string;
  disabled: boolean;
  onAreaOrNpcChange: (entityRef: string) => void;
  onRemove: () => void;
  diffState: DiffListRowState;
  onRevert?: () => void;
}) {
  const [area] = entityRef.includes(':') ? entityRef.split(/:(.*)/).filter(Boolean) : ['', ''];
  const npcsInArea = useMemo(
    () => (area ? options.filter((o) => o.area === area) : []),
    [options, area]
  );
  const npcValue = npcsInArea.some((o) => o.value === entityRef) ? entityRef : '';

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
          const npcs = options.filter((o) => o.area === newArea);
          const first = npcs[0];
          if (first) onAreaOrNpcChange(first.value);
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
        value={npcValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v) onAreaOrNpcChange(v);
        }}
        disabled={disabled || !area || npcsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="NPC"
      >
        <option value="">{!area ? 'Select area first' : 'Select NPC…'}</option>
        {npcsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.npcId}
          </option>
        ))}
      </select>
    </DiffListRow>
  );
}

function BlankNPCRowWithRemove({
  options,
  areas,
  disabled,
  onCommit,
  onRemove
}: {
  options: AreaNPCOption[];
  areas: string[];
  disabled: boolean;
  onCommit: (entityRef: string) => void;
  onRemove: () => void;
}) {
  const [area, setArea] = useState('');
  const npcsInArea = useMemo(
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
        disabled={disabled || !area || npcsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="NPC"
      >
        <option value="">
          {!area ? 'Select area first' : 'Select NPC…'}
        </option>
        {npcsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.npcId}
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

/** Default export for backward compatibility: single NPC selector. */
export default NPCSelector;

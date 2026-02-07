import React, { useMemo, useState } from 'react';
import { useAllAreaRooms, type AreaRoomOption } from '../../hooks/useAllAreaRooms';
import DiffListRow, { type DiffListRowState } from './DiffListRow';

export interface RoomSelectorProps {
  bundleName: string;
  /** Single entity ref: "area:roomId" */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export interface RoomListSelectorProps {
  bundleName: string;
  /** Entity refs: "area:roomId"[] */
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  disabled?: boolean;
  markedForRemoval?: Set<string>;
  onMarkRemoved?: (ref: string) => void;
  onRevertRemoval?: (ref: string) => void;
  /** Refs that are in draft but not in saved (new additions) — show Revert to undo add */
  markedAsAdded?: Set<string>;
  onRevertAddition?: (ref: string) => void;
  /** Saved list for diff: enables changed (yellow) row state when ref at index differs */
  savedValue?: string[];
}

type Row = { type: 'set'; ref: string; index: number } | { type: 'blank'; index: number };

/**
 * Single room selector. One row: [Area dropdown] [Room dropdown]. No − or + Add.
 * Use for exit roomId, NPC room, etc.
 */
export function RoomSelector({
  bundleName,
  value,
  onChange,
  label = 'Room',
  disabled = false
}: RoomSelectorProps) {
  const { options, loading, error } = useAllAreaRooms(bundleName);
  const areas = useMemo(
    () => [...new Set(options.map((o) => o.area))].sort(),
    [options]
  );

  return (
    <div className="form-group room-selector">
      {label && <label>{label}</label>}
      {error && (
        <small style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>
          {error}
        </small>
      )}
      {loading && (
        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
          Loading areas and rooms…
        </small>
      )}
      <SingleRoomRow
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
 * Room list selector. Each entry: [Area] [Room] [−]. "+ Add" at bottom adds a blank row.
 * Use for restrictTo, room arrays, etc. Same pattern as NPC/Item/Quest list selectors.
 */
export function RoomListSelector({
  bundleName,
  value,
  onChange,
  label = 'Rooms',
  disabled = false,
  markedForRemoval,
  onMarkRemoved,
  onRevertRemoval,
  markedAsAdded,
  onRevertAddition,
  savedValue
}: RoomListSelectorProps) {
  const { options, loading, error } = useAllAreaRooms(bundleName);
  const [blankRows, setBlankRows] = useState(0);

  const areas = useMemo(
    () => [...new Set(options.map((o) => o.area))].sort(),
    [options]
  );

  const list = Array.isArray(value) ? value : [];
  const savedList = Array.isArray(savedValue) ? savedValue : [];

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
    if (markedAsAdded?.has(row.ref)) return 'new';
    if (row.index < savedList.length && savedList[row.index] !== row.ref) return 'changed';
    return 'unchanged';
  };

  const handleRevertRow = (row: { type: 'set'; ref: string; index: number }) => {
    const state = getRowState(row);
    if (state === 'removed' && onRevertRemoval) onRevertRemoval(row.ref);
    else if (state === 'new' && onRevertAddition) onRevertAddition(row.ref);
    else if (state === 'changed' && row.index < savedList.length) {
      const next = [...list];
      next[row.index] = savedList[row.index];
      onChange(next);
    }
  };

  return (
    <div className="form-group room-list-selector">
      {label && <label>{label}</label>}
      {error && (
        <small style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>
          {error}
        </small>
      )}
      {loading && (
        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
          Loading areas and rooms…
        </small>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rows.map((row) =>
          row.type === 'set' ? (
            <RoomRowWithRemove
              key={`set-${row.index}-${row.ref}`}
              options={options}
              areas={areas}
              entityRef={row.ref}
              disabled={disabled}
              onAreaOrRoomChange={(ref) => updateEntry(row.index, ref)}
              onRemove={() => (stagedRemove ? onMarkRemoved?.(row.ref) : removeEntry(row.index))}
              diffState={getRowState(row)}
              onRevert={(stagedRemove || markedAsAdded?.size || savedList.length > 0) ? () => handleRevertRow(row) : undefined}
            />
          ) : (
            <BlankRoomRowWithRemove
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

/** Single row: [Area] [Room] only. No remove button. */
function SingleRoomRow({
  options,
  areas,
  entityRef,
  disabled,
  onChange
}: {
  options: AreaRoomOption[];
  areas: string[];
  entityRef: string;
  disabled: boolean;
  onChange: (entityRef: string) => void;
}) {
  const [area] = entityRef.includes(':') ? entityRef.split(/:(.*)/).filter(Boolean) : ['', ''];
  const roomsInArea = useMemo(
    () => (area ? options.filter((o) => o.area === area) : []),
    [options, area]
  );
  const roomValue = roomsInArea.some((o) => o.value === entityRef) ? entityRef : '';

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
          const rooms = options.filter((o) => o.area === newArea);
          const first = rooms[0];
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
        value={roomValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v || '');
        }}
        disabled={disabled || !area || roomsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="Room"
      >
        <option value="">{!area ? 'Select area first' : 'Select room…'}</option>
        {roomsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.roomId}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Row with remove/revert (for list). Uses DiffListRow for consistent diff UI. */
function RoomRowWithRemove({
  options,
  areas,
  entityRef,
  disabled,
  onAreaOrRoomChange,
  onRemove,
  diffState,
  onRevert
}: {
  options: AreaRoomOption[];
  areas: string[];
  entityRef: string;
  disabled: boolean;
  onAreaOrRoomChange: (entityRef: string) => void;
  onRemove: () => void;
  diffState: DiffListRowState;
  onRevert?: () => void;
}) {
  const [area] = entityRef.includes(':') ? entityRef.split(/:(.*)/).filter(Boolean) : ['', ''];
  const roomsInArea = useMemo(
    () => (area ? options.filter((o) => o.area === area) : []),
    [options, area]
  );
  const roomValue = roomsInArea.some((o) => o.value === entityRef) ? entityRef : '';

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
          const rooms = options.filter((o) => o.area === newArea);
          const first = rooms[0];
          if (first) onAreaOrRoomChange(first.value);
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
        value={roomValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v) onAreaOrRoomChange(v);
        }}
        disabled={disabled || !area || roomsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="Room"
      >
        <option value="">{!area ? 'Select area first' : 'Select room…'}</option>
        {roomsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.roomId}
          </option>
        ))}
      </select>
    </DiffListRow>
  );
}

function BlankRoomRowWithRemove({
  options,
  areas,
  disabled,
  onCommit,
  onRemove
}: {
  options: AreaRoomOption[];
  areas: string[];
  disabled: boolean;
  onCommit: (entityRef: string) => void;
  onRemove: () => void;
}) {
  const [area, setArea] = useState('');
  const roomsInArea = useMemo(
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
        disabled={disabled || !area || roomsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="Room"
      >
        <option value="">
          {!area ? 'Select area first' : 'Select room…'}
        </option>
        {roomsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.roomId}
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

/** Default export: room list selector (same pattern as other list selectors). */
export default RoomListSelector;

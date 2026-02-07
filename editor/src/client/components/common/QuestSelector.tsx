import React, { useMemo, useState } from 'react';
import { useAllAreaQuests, type AreaQuestOption } from '../../hooks/useAllAreaQuests';
import DiffListRow, { type DiffListRowState } from './DiffListRow';

export interface QuestSelectorProps {
  bundleName: string;
  /** Single entity ref: "area:questId" */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export interface QuestListSelectorProps {
  bundleName: string;
  /** Entity refs: "area:questId"[] */
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
 * Single quest selector. One row: [Area dropdown] [Quest dropdown]. No − or + Add.
 * Use for fields that expect a single quest ref.
 */
export function QuestSelector({
  bundleName,
  value,
  onChange,
  label = 'Quest',
  disabled = false
}: QuestSelectorProps) {
  const { options, loading, error } = useAllAreaQuests(bundleName);
  const areas = useMemo(
    () => [...new Set(options.map((o) => o.area))].sort(),
    [options]
  );

  return (
    <div className="form-group quest-selector">
      {label && <label>{label}</label>}
      {error && (
        <small style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>
          {error}
        </small>
      )}
      {loading && (
        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
          Loading areas and quests…
        </small>
      )}
      <SingleQuestRow
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
 * Quest list selector. Each entry: [Area] [Quest] [−]. "+ Add" at bottom adds a blank row.
 * Use for NPC quests array, quest requires array, etc.
 */
export function QuestListSelector({
  bundleName,
  value,
  onChange,
  label = 'Quests',
  disabled = false,
  markedForRemoval,
  onMarkRemoved,
  onRevertRemoval,
  savedValue
}: QuestListSelectorProps) {
  const { options, loading, error } = useAllAreaQuests(bundleName);
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
    <div className="form-group quest-list-selector">
      {label && <label>{label}</label>}
      {error && (
        <small style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>
          {error}
        </small>
      )}
      {loading && (
        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
          Loading areas and quests…
        </small>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rows.map((row) =>
          row.type === 'set' ? (
            <QuestRowWithRemove
              key={`set-${row.index}-${row.ref}`}
              options={options}
              areas={areas}
              entityRef={row.ref}
              disabled={disabled}
              onAreaOrQuestChange={(ref) => updateEntry(row.index, ref)}
              onRemove={() => (stagedRemove ? onMarkRemoved?.(row.ref) : removeEntry(row.index))}
              diffState={getRowState(row)}
              onRevert={(stagedRemove || savedList.length > 0) ? () => handleRevertRow(row) : undefined}
            />
          ) : (
            <BlankQuestRowWithRemove
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

/** Single row: [Area] [Quest] only. No remove button. */
function SingleQuestRow({
  options,
  areas,
  entityRef,
  disabled,
  onChange
}: {
  options: AreaQuestOption[];
  areas: string[];
  entityRef: string;
  disabled: boolean;
  onChange: (entityRef: string) => void;
}) {
  const [area] = entityRef.includes(':') ? entityRef.split(/:(.*)/).filter(Boolean) : ['', ''];
  const questsInArea = useMemo(
    () => (area ? options.filter((o) => o.area === area) : []),
    [options, area]
  );
  const questValue = questsInArea.some((o) => o.value === entityRef) ? entityRef : '';

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
          const quests = options.filter((o) => o.area === newArea);
          const first = quests[0];
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
        value={questValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v || '');
        }}
        disabled={disabled || !area || questsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="Quest"
      >
        <option value="">{!area ? 'Select area first' : 'Select quest…'}</option>
        {questsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.questId}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Row with remove/revert (for list). Uses DiffListRow for consistent diff UI. */
function QuestRowWithRemove({
  options,
  areas,
  entityRef,
  disabled,
  onAreaOrQuestChange,
  onRemove,
  diffState,
  onRevert
}: {
  options: AreaQuestOption[];
  areas: string[];
  entityRef: string;
  disabled: boolean;
  onAreaOrQuestChange: (entityRef: string) => void;
  onRemove: () => void;
  diffState: DiffListRowState;
  onRevert?: () => void;
}) {
  const [area] = entityRef.includes(':') ? entityRef.split(/:(.*)/).filter(Boolean) : ['', ''];
  const questsInArea = useMemo(
    () => (area ? options.filter((o) => o.area === area) : []),
    [options, area]
  );
  const questValue = questsInArea.some((o) => o.value === entityRef) ? entityRef : '';

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
          const quests = options.filter((o) => o.area === newArea);
          const first = quests[0];
          if (first) onAreaOrQuestChange(first.value);
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
        value={questValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v) onAreaOrQuestChange(v);
        }}
        disabled={disabled || !area || questsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="Quest"
      >
        <option value="">{!area ? 'Select area first' : 'Select quest…'}</option>
        {questsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.questId}
          </option>
        ))}
      </select>
    </DiffListRow>
  );
}

function BlankQuestRowWithRemove({
  options,
  areas,
  disabled,
  onCommit,
  onRemove
}: {
  options: AreaQuestOption[];
  areas: string[];
  disabled: boolean;
  onCommit: (entityRef: string) => void;
  onRemove: () => void;
}) {
  const [area, setArea] = useState('');
  const questsInArea = useMemo(
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
        disabled={disabled || !area || questsInArea.length === 0}
        style={{ flex: 1, minWidth: '10rem', maxWidth: '20rem' }}
        aria-label="Quest"
      >
        <option value="">
          {!area ? 'Select area first' : 'Select quest…'}
        </option>
        {questsInArea.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.questId}
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

export default QuestSelector;

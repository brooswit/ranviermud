import React from 'react';
import { useAllAreaLootPools } from '../../hooks/useAllAreaLootPools';

/** One entry in the pools array: either a pool ref string or { [poolRef]: weight } */
export type PoolEntry = string | Record<string, number>;

export interface PoolsEditorProps {
  bundleName: string;
  value: PoolEntry[];
  onChange: (value: PoolEntry[]) => void;
  label?: string;
}

/**
 * Edits an array of loot pool references, each either a string (area:poolId)
 * or an object { "area:poolId": weight }. Renders as rows with pool selector + optional weight.
 */
export default function PoolsEditor({
  bundleName,
  value,
  onChange,
  label = 'Pools'
}: PoolsEditorProps) {
  const { options, loading, error } = useAllAreaLootPools(bundleName);

  const normalized = Array.isArray(value) ? value : [];

  const getPoolRef = (entry: PoolEntry): string => {
    if (typeof entry === 'string') return entry;
    const keys = Object.keys(entry);
    return keys.length === 1 ? keys[0] : '';
  };

  const getWeight = (entry: PoolEntry): number | '' => {
    if (typeof entry === 'string') return '';
    const keys = Object.keys(entry);
    if (keys.length !== 1) return '';
    const w = entry[keys[0]];
    return typeof w === 'number' ? w : '';
  };

  const setEntry = (index: number, poolRef: string, weight: number | '') => {
    const next = [...normalized];
    if (!poolRef.trim()) {
      next[index] = '';
    } else if (weight === '' || weight === undefined) {
      next[index] = poolRef;
    } else {
      next[index] = { [poolRef]: weight };
    }
    onChange(next.filter((e) => e !== '' && (typeof e !== 'string' || e.trim() !== '')));
  };

  const remove = (index: number) => {
    const next = normalized.filter((_, i) => i !== index);
    onChange(next);
  };

  const add = () => {
    onChange([...normalized, '']);
  };

  return (
    <div className="form-group pools-editor">
      {label && <label>{label}</label>}
      {error && (
        <small style={{ color: 'var(--danger)', display: 'block', marginBottom: '0.25rem' }}>
          {error}
        </small>
      )}
      {loading && (
        <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
          Loading pools…
        </small>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {normalized.map((entry, idx) => (
          <div
            key={`pool-${idx}`}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}
          >
            <div className="form-group" style={{ flex: '1 1 12rem', marginBottom: 0, minWidth: 0 }}>
              <label className="sr-only">Pool</label>
              <select
                value={getPoolRef(entry)}
                onChange={(e) => setEntry(idx, e.target.value, getWeight(entry))}
                disabled={loading}
                style={{ width: '100%' }}
              >
                <option value="">(select pool)</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ width: '6rem', marginBottom: 0, flexShrink: 0 }}>
              <label className="sr-only">Weight (optional)</label>
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Weight"
                value={getWeight(entry)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const weight = raw === '' ? '' : parseFloat(raw);
                  setEntry(idx, getPoolRef(entry), weight as number | '');
                }}
                disabled={loading}
              />
            </div>
            <button
              type="button"
              className="btn btn-small btn-danger"
              onClick={() => remove(idx)}
              aria-label="Remove pool"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-small btn-success"
          onClick={add}
          disabled={loading}
        >
          Add pool
        </button>
      </div>
      <small style={{ color: 'var(--text-secondary)' }}>
        Optional weight overrides default pool weight for this reference.
      </small>
    </div>
  );
}

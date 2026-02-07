import React from 'react';
import { getDiffWrapClassName, type DiffRevertVariant } from '../../utils/diff';
import DiffRevertButton from './DiffRevertButton';

export type FieldDiffState = 'unchanged' | 'changed' | 'new';

interface FieldWithRevertProps {
  /** Whether this field has changed from saved (yellow). Use diffState for add vs change. */
  changed?: boolean;
  /** If set, overrides styling: 'new' = green (added), 'changed' = yellow, 'unchanged' = none. */
  diffState?: FieldDiffState;
  onRevert: () => void;
  /** If true, layout is inline (label + field + revert on one row). Default false = block with revert top-right */
  inline?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps an editor field with diff semantics: new = green, changed = yellow, Revert button.
 * Uses shared diff UI (utils/diff, DiffRevertButton).
 */
export default function FieldWithRevert({ changed, diffState, onRevert, inline = false, children }: FieldWithRevertProps) {
  const state = diffState ?? (changed ? 'changed' : 'unchanged');
  const diffClass = getDiffWrapClassName(state);
  const layoutClass = inline ? 'form-group-inline-with-revert' : 'form-group-with-revert';
  const className = [layoutClass, diffClass].filter(Boolean).join(' ');
  const revertVariant: DiffRevertVariant = state === 'new' ? 'new' : state === 'changed' ? 'change' : 'change';

  return (
    <div className={className}>
      {children}
      {(state === 'changed' || state === 'new') && (
        <DiffRevertButton variant={revertVariant} onClick={onRevert} ariaLabel="Revert" />
      )}
    </div>
  );
}

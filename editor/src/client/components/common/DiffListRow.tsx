import React from 'react';
import { getDiffWrapClassName, DIFF_LABEL_REMOVED } from '../../utils/diff';
import type { DiffState } from '../../utils/diff';
import DiffRevertButton from './DiffRevertButton';

export type DiffListRowState = 'unchanged' | 'removed' | 'changed' | 'new';

export interface DiffListRowProps {
  /** removed = red + "Removed" + Revert; new = green + Revert; changed = yellow + Revert; unchanged = Remove only */
  state: DiffListRowState;
  onRevert?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  removeAriaLabel?: string;
  children: React.ReactNode;
}

/**
 * Single source of truth for list row diff UI: red = removed, yellow = changed, green = new.
 * Renders row wrapper with correct class and the right action (Removed + Revert | Revert | Remove).
 */
export default function DiffListRow({
  state,
  onRevert,
  onRemove,
  disabled = false,
  removeAriaLabel = 'Remove',
  children
}: DiffListRowProps) {
  const diffClass = getDiffWrapClassName(state);

  const rowClassName = ['diff-list-row', diffClass].filter(Boolean).join(' ');

  return (
    <div className={rowClassName} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {children}
      {state === 'removed' && (
        <>
          <span className="diff-label-removed">{DIFF_LABEL_REMOVED}</span>
          {onRevert && <DiffRevertButton variant="removed" onClick={onRevert} disabled={disabled} ariaLabel="Revert removal" />}
        </>
      )}
      {(state === 'new' || state === 'changed') && onRevert && (
        <DiffRevertButton variant="change" onClick={onRevert} disabled={disabled} ariaLabel={state === 'changed' ? 'Revert change' : 'Revert addition'} />
      )}
      {state === 'unchanged' && onRemove && (
        <button type="button" className="btn btn-small btn-danger" onClick={onRemove} disabled={disabled} aria-label={removeAriaLabel}>
          Remove
        </button>
      )}
    </div>
  );
}

import React from 'react';
import { getDiffWrapClassName, type DiffState } from '../../utils/diff';
import DiffRevertButton from './DiffRevertButton';

export interface DiffWrapProps {
  /** Current diff state. Unchanged = no styling. */
  state: DiffState;
  /** When set and state is not unchanged, a Revert button is shown. */
  onRevert?: () => void;
  children: React.ReactNode;
  /** Layout: block (revert top-right) vs inline (revert next to content). Default false. */
  inline?: boolean;
  /** Extra class names for the wrapper (e.g. form-group-with-revert, list-row). */
  className?: string;
}

/**
 * Wraps content with diff state styling (red / yellow / green) and optional Revert button.
 * Use for changed fields (with inline/block layout) or as the base for list rows.
 */
export default function DiffWrap({ state, onRevert, children, inline = false, className = '' }: DiffWrapProps) {
  const diffClass = getDiffWrapClassName(state);
  const showRevert = state !== 'unchanged' && onRevert != null;
  const revertVariant = state === 'removed' ? 'removed' : 'change';

  const wrapClasses = [
    inline ? 'diff-wrap-inline' : 'diff-wrap-block',
    diffClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapClasses}>
      {children}
      {showRevert && (
        <DiffRevertButton variant={revertVariant} onClick={onRevert} ariaLabel={`Revert ${state}`} />
      )}
    </div>
  );
}

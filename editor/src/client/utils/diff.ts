/**
 * Central diff semantics for the editor: removed / changed / new.
 * Red = removed, Yellow = changed, Green = new.
 * Use with DiffWrap, DiffListRow, and DiffRevertButton for consistent UI.
 */

export type DiffState = 'unchanged' | 'removed' | 'changed' | 'new';

/** CSS class for a wrapper that indicates diff state (e.g. field or list row). */
export function getDiffWrapClassName(state: DiffState): string {
  if (state === 'unchanged') return '';
  return `diff-${state}`;
}

/** CSS class for the Revert button: 'removed' = red, 'change' = yellow (changed), 'new' = green (added). */
export type DiffRevertVariant = 'removed' | 'change' | 'new';

export function getDiffRevertButtonClassName(variant: DiffRevertVariant): string {
  if (variant === 'removed') return 'diff-revert-btn diff-revert-btn-removed';
  if (variant === 'new') return 'diff-revert-btn diff-revert-btn-new';
  return 'diff-revert-btn diff-revert-btn-change';
}

/** Label shown for removed list rows. */
export const DIFF_LABEL_REMOVED = 'Removed';

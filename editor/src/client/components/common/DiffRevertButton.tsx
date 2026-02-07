import React from 'react';
import { getDiffRevertButtonClassName, type DiffRevertVariant } from '../../utils/diff';

export interface DiffRevertButtonProps {
  variant: DiffRevertVariant;
  onClick: () => void;
  disabled?: boolean;
  /** Default: 'Revert' */
  children?: React.ReactNode;
  size?: 'small';
  ariaLabel?: string;
}

/**
 * Single Revert button for diff UI. Red for "removed", yellow for "changed" or "new".
 * Use everywhere we need a revert action so styling stays consistent.
 */
export default function DiffRevertButton({
  variant,
  onClick,
  disabled = false,
  children = 'Revert',
  size = 'small',
  ariaLabel = 'Revert'
}: DiffRevertButtonProps) {
  const className = ['btn', size === 'small' ? 'btn-small' : '', getDiffRevertButtonClassName(variant)].filter(Boolean).join(' ');
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

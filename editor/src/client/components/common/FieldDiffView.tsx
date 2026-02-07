import React, { useState } from 'react';
import * as Diff from 'diff';
import DiffRevertButton from './DiffRevertButton';

interface FieldDiffViewProps {
  label: string;
  savedValue: string;
  draftValue: string;
  onRevert: () => void;
  language?: string;
  /** Collapse long diffs to this many lines when collapsed */
  collapseThreshold?: number;
}

export default function FieldDiffView({ label, savedValue, draftValue, onRevert, collapseThreshold = 20 }: FieldDiffViewProps) {
  const [expanded, setExpanded] = useState(true);
  const unchanged = (savedValue || '') === (draftValue || '');
  if (unchanged) return null;

  const oldStr = savedValue || '';
  const newStr = draftValue || '';
  const changes = Diff.diffLines(oldStr, newStr);
  const totalLines = changes.reduce((n, c) => n + (c.value.match(/\n/g)?.length ?? 0) + (c.value && !c.value.endsWith('\n') ? 1 : 0), 0);
  const showCollapse = collapseThreshold > 0 && totalLines > collapseThreshold;
  const isCollapsed = showCollapse && !expanded;

  return (
    <div className="field-diff-view">
      <div className="field-diff-header">
        <span className="field-diff-label">{label}</span>
        <div className="field-diff-actions">
          {showCollapse && (
            <button type="button" className="btn btn-small" onClick={() => setExpanded(!expanded)}>
              {isCollapsed ? `Show diff (${totalLines} lines)` : 'Collapse'}
            </button>
          )}
          <DiffRevertButton variant="change" onClick={onRevert} ariaLabel="Revert" />
        </div>
      </div>
      {!isCollapsed && (
        <div className="field-diff-body">
          <pre className="field-diff-content">
            {changes.map((part, i) => {
              const className = part.added ? 'diff-add' : part.removed ? 'diff-remove' : 'diff-unchanged';
              return (
                <span key={i} className={className}>
                  {part.value}
                </span>
              );
            })}
          </pre>
        </div>
      )}
    </div>
  );
}

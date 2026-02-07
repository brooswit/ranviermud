import React from 'react';
import type { TreeItemConfig } from '../../types/editor';

interface TreeItemProps {
  config: TreeItemConfig;
  level?: number;
}

export default function TreeItem({ config, level = 0 }: TreeItemProps) {
  const { label, icon, onClick, actions = [], active = false, expandable = false, expanded = false, children = [] } = config;

  return (
    <>
      <div
        className={`tree-item ${active ? 'active' : ''} ${expandable ? 'tree-item-expandable' : ''} ${expanded ? 'tree-item-expanded' : ''}`}
        onClick={(e) => {
          if (e.target instanceof HTMLElement && (e.target.tagName === 'BUTTON' || e.target.closest('.tree-item-actions'))) {
            return;
          }
          onClick?.();
        }}
        style={{ 
          cursor: onClick ? 'pointer' : 'default',
          paddingLeft: `${level * 1}rem`
        }}
      >
        {expandable && (
          <span style={{ marginRight: '0.25rem' }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
        <span>
          {icon && `${icon} `}
          {label}
        </span>
        {actions.length > 0 && (
          <div className="tree-item-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {expanded && children && children.length > 0 && (
        <div className="tree-folder-content">
          {children.map((child, index) => (
            <TreeItem key={index} config={child} level={level + 1} />
          ))}
        </div>
      )}
    </>
  );
}

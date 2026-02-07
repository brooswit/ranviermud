import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { BreadcrumbSegment } from '../../types/editor';

interface BreadcrumbProps {
  bundleName: string;
  path?: string;
}

export default function Breadcrumb({ bundleName, path }: BreadcrumbProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Parse current path to build breadcrumbs
  const segments: BreadcrumbSegment[] = [
    { label: bundleName, path: `/bundle/${bundleName}` }
  ];

  if (path) {
    const parts = path.split('/').filter(p => p);
    let currentPath = `/bundle/${bundleName}`;
    
    parts.forEach((part, index) => {
      currentPath += `/${part}`;
      const isLast = index === parts.length - 1;
      
      // Capitalize and format labels
      let label = part;
      if (part === 'areas') label = 'Areas';
      else if (part === 'classes') label = 'Classes';
      else if (part === 'behaviors') label = 'Behaviors';
      else if (part === 'commands') label = 'Commands';
      else if (part === 'effects') label = 'Effects';
      else if (part === 'skills') label = 'Skills';
      else if (part === 'help') label = 'Help Files';
      else if (part === 'root-files') label = 'Root Files';
      else if (part === 'lib') label = 'Lib Files';
      
      segments.push({
        label,
        path: isLast ? undefined : currentPath,
        onClick: isLast ? undefined : () => navigate(currentPath)
      });
    });
  }

  return (
    <div className="breadcrumb" id="breadcrumb">
      {segments.map((segment, index) => {
        if (segment.path || segment.onClick) {
          return (
            <React.Fragment key={index}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (segment.path) {
                    navigate(segment.path);
                  }
                  segment.onClick?.();
                }}
              >
                {segment.label}
              </a>
              {index < segments.length - 1 && ' / '}
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={index}>
            <span>{segment.label}</span>
            {index < segments.length - 1 && ' / '}
          </React.Fragment>
        );
      })}
    </div>
  );
}

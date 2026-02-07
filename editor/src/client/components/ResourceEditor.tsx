import React from 'react';

interface ResourceEditorProps {
  bundleName: string;
  resource: any;
  onClose: () => void;
}

export default function ResourceEditor({ bundleName, resource, onClose }: ResourceEditorProps) {
  return (
    <div className="form-container">
      <h2>Edit {resource.type}: {resource.name}</h2>
      <p>Editor implementation coming soon...</p>
      <button className="btn" onClick={onClose}>Close</button>
    </div>
  );
}

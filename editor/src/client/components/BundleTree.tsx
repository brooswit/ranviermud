import React from 'react';

interface BundleTreeProps {
  bundleName: string;
  bundleData: any;
  onSelectResource: (resource: any) => void;
  onShowMap: () => void;
}

export default function BundleTree({ bundleName, bundleData, onSelectResource, onShowMap }: BundleTreeProps) {
  if (!bundleData) {
    return <div className="tree">Loading...</div>;
  }

  return (
    <div className="tree" id="resource-tree">
      {/* Areas */}
      {bundleData.areas && bundleData.areas.length > 0 && (
        <div className="tree-section">
          <div className="tree-item">
            <span>🗺️ Areas</span>
            <button className="tree-item-actions">+</button>
          </div>
          {bundleData.areas.map((area: string) => (
            <div key={area} className="tree-item" style={{ paddingLeft: '1rem' }}>
              <span onClick={() => onSelectResource({ type: 'area', name: area })}>{area}</span>
            </div>
          ))}
        </div>
      )}

      {/* Classes */}
      {bundleData.classes && bundleData.classes.length > 0 && (
        <div className="tree-section">
          <div className="tree-item">
            <span>⚔️ Classes</span>
            <button className="tree-item-actions">+</button>
          </div>
          {bundleData.classes.map((className: string) => (
            <div key={className} className="tree-item" style={{ paddingLeft: '1rem' }}>
              <span onClick={() => onSelectResource({ type: 'class', name: className })}>{className}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add more resource types as needed */}
    </div>
  );
}

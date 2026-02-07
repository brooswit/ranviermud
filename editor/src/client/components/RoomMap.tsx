import React from 'react';

interface RoomMapProps {
  bundleName: string;
  onClose: () => void;
}

export default function RoomMap({ bundleName, onClose }: RoomMapProps) {
  return (
    <div className="map-container">
      <div className="map-header">
        <h2>Room Map</h2>
        <button className="btn" onClick={onClose}>Close Map</button>
      </div>
      <div className="room-map">
        <p>Map visualization coming soon...</p>
      </div>
    </div>
  );
}

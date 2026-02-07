import React, { useEffect, useRef } from 'react';
import { useRoomMap } from '../../hooks/useRoomMap';

// vis-network is loaded via CDN
declare global {
  interface Window {
    vis?: {
      DataSet: new <T = any>(data?: T[]) => {
        add(data: T | T[]): string[];
        update(data: T | T[]): string[];
        remove(id: string | string[]): string[];
        get(id: string | string[]): T | T[];
        forEach(callback: (item: T) => void): void;
        map(callback: (item: T) => any): any[];
        filter(callback: (item: T) => boolean): T[];
      };
      Network: new (container: HTMLElement, data: { nodes: any; edges: any }, options?: any) => {
        on(event: string, callback: (params: any) => void): void;
        off(event: string, callback: (params: any) => void): void;
        destroy(): void;
      };
    };
  }
}

interface RoomMapProps {
  bundleName: string;
  areaName: string;
  onNodeClick?: (nodeId: string, nodeType: string) => void;
  onClose?: () => void;
}

export default function RoomMap({ bundleName, areaName, onNodeClick, onClose }: RoomMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any | null>(null);
  const { mapData, loading, error } = useRoomMap(bundleName, areaName);

  useEffect(() => {
    if (!mapData || !mapRef.current) return;

    // Check if vis-network is loaded
    if (typeof window === 'undefined' || !window.vis) {
      console.warn('vis-network not loaded');
      return;
    }

    const { DataSet, Network } = window.vis;

    // Create nodes
    const nodes = new DataSet(
      mapData.nodes.map(node => {
        const baseNode: any = {
          id: node.id,
          label: node.label,
          title: node.title,
          font: { color: '#e0e0e0', size: 12 }
        };

        // Style based on node type
        if (node.type === 'room') {
          baseNode.color = {
            background: '#4a9eff',
            border: '#2d5aa0',
            highlight: { background: '#5baaff', border: '#3d6ab0' }
          };
          baseNode.shape = 'box';
          baseNode.font.size = 14;
          if (node.coordinates) {
            baseNode.x = node.coordinates[0] * 100;
            baseNode.y = node.coordinates[1] * 100;
          }
        } else if (node.type === 'npc') {
          baseNode.color = {
            background: '#ff6b6b',
            border: '#cc5555',
            highlight: { background: '#ff8787', border: '#dd6666' }
          };
          baseNode.shape = 'ellipse';
        } else if (node.type === 'item') {
          if (node.isContainer) {
            baseNode.color = {
              background: '#9b59b6',
              border: '#7d3c98',
              highlight: { background: '#bb8fce', border: '#9b59b6' }
            };
            baseNode.shape = 'database';
          } else {
            baseNode.color = {
              background: '#ffd93d',
              border: '#ccaa2a',
              highlight: { background: '#ffe066', border: '#ddbb33' }
            };
            baseNode.shape = 'diamond';
          }
        } else if (node.type === 'area') {
          baseNode.color = {
            background: '#6bcf7f',
            border: '#4fa866',
            highlight: { background: '#7dd88f', border: '#5fb870' }
          };
          baseNode.shape = 'hexagon';
        }

        return baseNode;
      })
    );

    // Create edges
    const edges = new DataSet(
      mapData.edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        label: edge.label || '',
        arrows: edge.arrows || 'to',
        color: edge.color || { color: '#888', highlight: '#4a9eff' },
        font: { color: edge.color?.color || '#888', size: 10, align: 'middle' },
        dashes: edge.dashes || false,
        width: edge.width || 2
      }))
    );

    const data = { nodes, edges };

    const options = {
      nodes: {
        margin: 10,
        widthConstraint: { maximum: 150 },
        heightConstraint: { minimum: 30 },
        scaling: { min: 10, max: 30 }
      },
      edges: {
        smooth: { type: 'continuous', roundness: 0.5 },
        font: { size: 10, color: '#888', strokeWidth: 2, strokeColor: '#1a1a1a' }
      },
      physics: {
        enabled: true,
        stabilization: { enabled: true, iterations: 200 },
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.1,
          springLength: 150,
          springConstant: 0.04,
          damping: 0.09
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true
      },
      layout: {
        improvedLayout: true
      }
    };

    const network = new Network(mapRef.current, data, options);
    networkRef.current = network;

    // Add click handler
    network.on('click', (params) => {
      if (params.nodes.length > 0 && onNodeClick) {
        const nodeId = params.nodes[0];
        const node = mapData.nodes.find(n => n.id === nodeId);
        if (node) {
          onNodeClick(nodeId, node.type);
        }
      }
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [mapData, onNodeClick]);

  if (loading) {
    return <div>Loading map...</div>;
  }

  if (error) {
    return <div>Error loading map: {error}</div>;
  }

  return (
    <div className="map-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ margin: 0 }}>Room Map</h2>
        {onClose && (
          <button className="btn" onClick={onClose}>
            Close Map
          </button>
        )}
      </div>
      <div ref={mapRef} className="room-map" style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}

export interface Room {
  id: string;
  title?: string;
  description?: string;
  coordinates?: [number, number, number];
  exits?: Exit[];
  script?: string;
  [key: string]: any; // Allow any additional properties
}

export interface Exit {
  direction: string;
  roomId: string;
  leaveMessage?: string;
}

export interface NPC {
  id: string;
  name?: string;
  keywords?: string[];
  level?: number;
  room?: string;
  [key: string]: any; // Allow any additional properties
}

export interface Item {
  id: string;
  name?: string;
  keywords?: string[];
  description?: string;
  room?: string;
  npc?: string;
  container?: string;
  type?: string;
  [key: string]: any; // Allow any additional properties
}

export interface Area {
  name: string;
  title?: string;
  respawnInterval?: number;
}

export interface MapNode {
  id: string;
  label: string;
  title?: string;
  type: 'room' | 'npc' | 'item' | 'area';
  coordinates?: [number, number, number] | null;
  isContainer?: boolean;
  floating?: boolean;
}

export interface MapEdge {
  from: string;
  to: string;
  label?: string;
  arrows?: string;
  color?: { color: string; highlight?: string };
  dashes?: boolean;
  width?: number;
}

export interface MapData {
  nodes: MapNode[];
  edges: MapEdge[];
}

import { Hono } from 'hono';
import { readdir, mkdir } from 'fs/promises';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { BUNDLES_DIR } from '../config';
import { readYamlFile, writeYamlFile } from '../utils/fileUtils';

const areas = new Hono();

// Get areas in a bundle
areas.get('/:bundleName/areas', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areasPath = join(BUNDLES_DIR, bundleName, 'areas');
    
    try {
      const areaDirs = await readdir(areasPath, { withFileTypes: true });
      const areaList = areaDirs
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      return c.json({ areas: areaList });
    } catch (error: any) {
      // If areas directory doesn't exist, return empty array
      if (error.code === 'ENOENT') {
        return c.json({ areas: [] });
      }
      throw error;
    }
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Create new area
areas.post('/:bundleName/areas', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const { name } = await c.req.json();
    
    if (!name || !/^[a-z0-9-]+$/.test(name)) {
      return c.json({ error: 'Invalid area name' }, 400);
    }

    const areaPath = join(BUNDLES_DIR, bundleName, 'areas', name);
    await mkdir(areaPath, { recursive: true });

    // Create manifest.yml
    await writeYamlFile(join(areaPath, 'manifest.yml'), {
      title: name.charAt(0).toUpperCase() + name.slice(1),
      respawnInterval: 300
    });

    // Create empty rooms.yml, npcs.yml, items.yml
    await writeYamlFile(join(areaPath, 'rooms.yml'), []);
    await writeYamlFile(join(areaPath, 'npcs.yml'), []);
    await writeYamlFile(join(areaPath, 'items.yml'), []);

    return c.json({ success: true, area: { name } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Get rooms in an area
areas.get('/:bundleName/areas/:areaName/rooms', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const roomsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'rooms.yml');
    
    try {
      const rooms = await readYamlFile(roomsPath);
      return c.json({ rooms: Array.isArray(rooms) ? rooms : [] });
    } catch (error: any) {
      // If rooms.yml doesn't exist, return empty array
      if (error.code === 'ENOENT') {
        return c.json({ rooms: [] });
      }
      throw error;
    }
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Get room map/graph data for an area
areas.get('/:bundleName/areas/:areaName/map', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const roomsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'rooms.yml');
    const npcsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'npcs.yml');
    const itemsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'items.yml');
    
    const rooms = await readYamlFile(roomsPath);
    const roomsList = Array.isArray(rooms) ? rooms : [];
    
    let npcsList: any[] = [];
    try {
      const npcs = await readYamlFile(npcsPath);
      npcsList = Array.isArray(npcs) ? npcs : [];
    } catch {}
    
    let itemsList: any[] = [];
    try {
      const items = await readYamlFile(itemsPath);
      itemsList = Array.isArray(items) ? items : [];
    } catch {}
    
    // Build graph data
    const nodes: any[] = [];
    const edges: any[] = [];
    const associatedItems = new Set<string>();
    
    // Add room nodes and process exits
    roomsList.forEach((room: any) => {
      nodes.push({
        id: `room:${room.id}`,
        label: room.title || room.id,
        title: room.description || '',
        type: 'room',
        coordinates: room.coordinates || null
      });
      
      // Process explicit exits
      if (room.exits && Array.isArray(room.exits)) {
        room.exits.forEach((exit: any) => {
          const targetRoomId = exit.roomId;
          if (targetRoomId && targetRoomId.includes(':')) {
            const [targetArea, targetId] = targetRoomId.split(':');
            if (targetArea === areaName) {
              edges.push({
                from: `room:${room.id}`,
                to: `room:${targetId}`,
                label: exit.direction || '',
                arrows: 'to',
                color: { color: '#888', highlight: '#4a9eff' },
                width: 2
              });
            } else {
              const externalAreaNodeId = `area:${targetArea}`;
              if (!nodes.find(n => n.id === externalAreaNodeId)) {
                nodes.push({
                  id: externalAreaNodeId,
                  label: `${targetArea} (area)`,
                  title: `Exit to area: ${targetArea}`,
                  type: 'area'
                });
              }
              edges.push({
                from: `room:${room.id}`,
                to: externalAreaNodeId,
                label: `${exit.direction || ''} → ${targetArea}`,
                arrows: 'to',
                color: { color: '#6bcf7f', highlight: '#7dd88f' },
                dashes: [5, 5],
                width: 2
              });
            }
          }
        });
      }
      
      // Infer exits from coordinates
      if (room.coordinates && Array.isArray(room.coordinates) && room.coordinates.length >= 2) {
        const [x, y, z = 0] = room.coordinates;
        const directions = [
          { name: 'north', delta: [0, 1, 0] },
          { name: 'south', delta: [0, -1, 0] },
          { name: 'east', delta: [1, 0, 0] },
          { name: 'west', delta: [-1, 0, 0] },
          { name: 'up', delta: [0, 0, 1] },
          { name: 'down', delta: [0, 0, -1] }
        ];
        
        directions.forEach(dir => {
          const [dx, dy, dz] = dir.delta;
          const targetCoords = [x + dx, y + dy, z + dz];
          const targetRoom = roomsList.find((r: any) => {
            if (!r.coordinates || !Array.isArray(r.coordinates)) return false;
            const [tx, ty, tz = 0] = r.coordinates;
            return tx === targetCoords[0] && ty === targetCoords[1] && tz === targetCoords[2];
          });
          
          if (targetRoom) {
            const targetNodeId = `room:${targetRoom.id}`;
            const edgeExists = edges.some((e: any) => 
              e.from === `room:${room.id}` && e.to === targetNodeId
            );
            
            if (!edgeExists) {
              edges.push({
                from: `room:${room.id}`,
                to: targetNodeId,
                label: dir.name,
                arrows: 'to',
                color: { color: '#888', highlight: '#4a9eff' },
                width: 2
              });
            }
          }
        });
      }
      
      // Add NPCs in this room
      if (room.npcs && Array.isArray(room.npcs)) {
        room.npcs.forEach((npcRef: any) => {
          const npcRefStr = typeof npcRef === 'string' ? npcRef : (npcRef.id || npcRef);
          if (!npcRefStr || typeof npcRefStr !== 'string') return;
          const npcId = npcRefStr.includes(':') ? npcRefStr.split(':')[1] : npcRefStr;
          const npc = npcsList.find((n: any) => n.id === npcId);
          if (npc) {
            const npcNodeId = `npc:${npcId}`;
            if (!nodes.find(n => n.id === npcNodeId)) {
              nodes.push({
                id: npcNodeId,
                label: npc.name || npc.id,
                title: npc.description || '',
                type: 'npc'
              });
            }
            edges.push({
              from: npcNodeId,
              to: `room:${room.id}`,
              label: 'in',
              arrows: 'to',
              color: { color: '#ff6b6b', highlight: '#ff8787' },
              dashes: true,
              width: 1
            });
            
            // Add items in NPC inventory
            if (npc.items && Array.isArray(npc.items)) {
              processItems(npc.items, itemsList, nodes, edges, associatedItems, npcNodeId);
            }
          }
        });
      }
      
      // Add items in this room
      if (room.items && Array.isArray(room.items)) {
        processItems(room.items, itemsList, nodes, edges, associatedItems, `room:${room.id}`);
      }
    });
    
    // Add floating items
    itemsList.forEach((item: any) => {
      if (!associatedItems.has(item.id)) {
        const itemNodeId = `item:${item.id}`;
        nodes.push({
          id: itemNodeId,
          label: item.name || item.id,
          title: item.description || '',
          type: 'item',
          floating: true,
          isContainer: item.type === 'CONTAINER' || item.type === 'container'
        });
        
        const isContainer = item.type === 'CONTAINER' || item.type === 'container';
        if (isContainer && item.items && Array.isArray(item.items)) {
          processItems(item.items, itemsList, nodes, edges, associatedItems, itemNodeId);
        }
      }
    });
    
    return c.json({ nodes, edges });
  } catch (error) {
    console.error('Error getting room map:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Helper function to process items
function processItems(
  itemRefs: any[],
  itemsList: any[],
  nodes: any[],
  edges: any[],
  associatedItems: Set<string>,
  parentNodeId: string
) {
  itemRefs.forEach((itemRef: any) => {
    const itemRefStr = typeof itemRef === 'string' ? itemRef : (itemRef.id || itemRef);
    if (!itemRefStr || typeof itemRefStr !== 'string') return;
    const itemId = itemRefStr.includes(':') ? itemRefStr.split(':')[1] : itemRefStr;
    const item = itemsList.find((i: any) => i.id === itemId);
    if (item) {
      const itemNodeId = `item:${itemId}`;
      const isContainer = item.type === 'CONTAINER' || item.type === 'container';
      if (!nodes.find(n => n.id === itemNodeId)) {
        nodes.push({
          id: itemNodeId,
          label: item.name || item.id,
          title: item.description || '',
          type: 'item',
          isContainer: isContainer
        });
      }
      edges.push({
        from: itemNodeId,
        to: parentNodeId,
        label: 'in',
        arrows: 'to',
        color: { color: '#ffd93d', highlight: '#ffe066' },
        dashes: true,
        width: 1
      });
      
      if (isContainer && item.items && Array.isArray(item.items)) {
        processItems(item.items, itemsList, nodes, edges, associatedItems, itemNodeId);
      }
      associatedItems.add(itemId);
    }
  });
}

// Get a specific room
areas.get('/:bundleName/areas/:areaName/rooms/:roomId', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const roomId = c.req.param('roomId');
    const roomsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'rooms.yml');
    
    const rooms = await readYamlFile(roomsPath);
    const room = Array.isArray(rooms) 
      ? rooms.find((r: any) => r.id === roomId)
      : null;
    
    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }
    
    return c.json({ room });
  } catch (error) {
    console.error('Error getting room:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Create/Update room
areas.post('/:bundleName/areas/:areaName/rooms', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const roomData = await c.req.json();
    const roomsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'rooms.yml');
    
    let rooms: any[] = [];
    try {
      const existing = await readYamlFile(roomsPath);
      rooms = Array.isArray(existing) ? existing : [];
    } catch {
      // File doesn't exist, start fresh
    }

    const existingIndex = rooms.findIndex((r: any) => r.id === roomData.id);
    if (existingIndex >= 0) {
      rooms[existingIndex] = roomData;
    } else {
      rooms.push(roomData);
    }

    await writeYamlFile(roomsPath, rooms);
    return c.json({ success: true, room: roomData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete room
areas.delete('/:bundleName/areas/:areaName/rooms/:roomId', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const roomId = c.req.param('roomId');
    const roomsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'rooms.yml');
    
    const rooms = await readYamlFile(roomsPath);
    const filtered = Array.isArray(rooms) 
      ? rooms.filter((r: any) => r.id !== roomId)
      : [];
    
    await writeYamlFile(roomsPath, filtered);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Get NPCs in an area
areas.get('/:bundleName/areas/:areaName/npcs', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const npcsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'npcs.yml');
    
    try {
      const npcs = await readYamlFile(npcsPath);
      return c.json({ npcs: Array.isArray(npcs) ? npcs : [] });
    } catch (error: any) {
      // If npcs.yml doesn't exist, return empty array
      if (error.code === 'ENOENT') {
        return c.json({ npcs: [] });
      }
      throw error;
    }
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Create/Update NPC
areas.post('/:bundleName/areas/:areaName/npcs', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const npcData = await c.req.json();
    const npcsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'npcs.yml');
    
    let npcs: any[] = [];
    try {
      const existing = await readYamlFile(npcsPath);
      npcs = Array.isArray(existing) ? existing : [];
    } catch {}

    const existingIndex = npcs.findIndex((n: any) => n.id === npcData.id);
    if (existingIndex >= 0) {
      npcs[existingIndex] = npcData;
    } else {
      npcs.push(npcData);
    }

    await writeYamlFile(npcsPath, npcs);
    return c.json({ success: true, npc: npcData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete NPC
areas.delete('/:bundleName/areas/:areaName/npcs/:npcId', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const npcId = c.req.param('npcId');
    const npcsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'npcs.yml');
    
    let npcs: any[] = [];
    try {
      const existing = await readYamlFile(npcsPath);
      npcs = Array.isArray(existing) ? existing : [];
    } catch {}

    npcs = npcs.filter((n: any) => n.id !== npcId);
    await writeYamlFile(npcsPath, npcs);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Get Items in an area
areas.get('/:bundleName/areas/:areaName/items', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const itemsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'items.yml');
    
    try {
      const items = await readYamlFile(itemsPath);
      return c.json({ items: Array.isArray(items) ? items : [] });
    } catch (error: any) {
      // If items.yml doesn't exist, return empty array
      if (error.code === 'ENOENT') {
        return c.json({ items: [] });
      }
      throw error;
    }
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Create/Update Item
areas.post('/:bundleName/areas/:areaName/items', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const itemData = await c.req.json();
    const itemsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'items.yml');
    
    let items: any[] = [];
    try {
      const existing = await readYamlFile(itemsPath);
      items = Array.isArray(existing) ? existing : [];
    } catch {}

    const existingIndex = items.findIndex((i: any) => i.id === itemData.id);
    if (existingIndex >= 0) {
      items[existingIndex] = itemData;
    } else {
      items.push(itemData);
    }

    await writeYamlFile(itemsPath, items);
    return c.json({ success: true, item: itemData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete Item
areas.delete('/:bundleName/areas/:areaName/items/:itemId', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const itemId = c.req.param('itemId');
    const itemsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'items.yml');
    
    let items: any[] = [];
    try {
      const existing = await readYamlFile(itemsPath);
      items = Array.isArray(existing) ? existing : [];
    } catch {}

    items = items.filter((i: any) => i.id !== itemId);
    await writeYamlFile(itemsPath, items);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Get quests in an area
areas.get('/:bundleName/areas/:areaName/quests', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const questsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'quests.yml');
    
    try {
      const quests = await readYamlFile(questsPath);
      const questList = Array.isArray(quests) ? quests : [];
      return c.json({ quests: questList });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return c.json({ quests: [] });
      }
      throw error;
    }
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Helpers for loot-pools.yml: file can be object keyed by pool id (e.g. { potions: [...], junk: [...] })
// Each pool value is array of YAML entries: string "area:id" or object { "area:id": weight }
function normalizeLootPoolItems(raw: unknown): { itemRef: string; weight: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (typeof entry === 'string') return { itemRef: entry, weight: 1 };
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const keys = Object.keys(entry);
      if (keys.length === 1) {
        const w = (entry as Record<string, number>)[keys[0]];
        return { itemRef: keys[0], weight: typeof w === 'number' ? w : 1 };
      }
    }
    return { itemRef: '', weight: 1 };
  }).filter((e) => e.itemRef);
}

function serializeLootPoolItems(items: { itemRef: string; weight: number }[]): unknown[] {
  return items
    .filter((e) => e.itemRef)
    .map((e) => (e.weight === 1 ? e.itemRef : { [e.itemRef]: e.weight }));
}

// Get loot pools in an area (full pool data: id, name, items)
areas.get('/:bundleName/areas/:areaName/loot-pools', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const lootPoolsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'loot-pools.yml');
    
    try {
      const raw = await readYamlFile(lootPoolsPath);
      if (Array.isArray(raw)) {
        const lootPoolList = raw.map((lp: any) => ({
          id: lp.id ?? lp.name,
          name: lp.name ?? lp.id ?? '',
          items: normalizeLootPoolItems(lp.items ?? lp.entries ?? [])
        }));
        return c.json({ lootPools: lootPoolList });
      }
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const lootPoolList = Object.entries(raw).map(([id, value]) => ({
          id,
          name: id,
          items: normalizeLootPoolItems(value)
        }));
        return c.json({ lootPools: lootPoolList });
      }
      return c.json({ lootPools: [] });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return c.json({ lootPools: [] });
      }
      throw error;
    }
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Create/Update Quest
areas.post('/:bundleName/areas/:areaName/quests', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const questData = await c.req.json();
    const questsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'quests.yml');
    
    let quests: any[] = [];
    try {
      const existing = await readYamlFile(questsPath);
      quests = Array.isArray(existing) ? existing : [];
    } catch {}

    const existingIndex = quests.findIndex((q: any) => q.id === questData.id);
    if (existingIndex >= 0) {
      quests[existingIndex] = questData;
    } else {
      quests.push(questData);
    }

    await writeYamlFile(questsPath, quests);
    return c.json({ success: true, quest: questData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete Quest
areas.delete('/:bundleName/areas/:areaName/quests/:questId', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const questId = c.req.param('questId');
    const questsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'quests.yml');
    
    let quests: any[] = [];
    try {
      const existing = await readYamlFile(questsPath);
      quests = Array.isArray(existing) ? existing : [];
    } catch {}

    quests = quests.filter((q: any) => q.id !== questId);
    await writeYamlFile(questsPath, quests);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Create/Update Loot Pool (writes object format for YAML: { poolId: serializedItems[] })
areas.post('/:bundleName/areas/:areaName/loot-pools', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const lootPoolData = await c.req.json();
    const lootPoolsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'loot-pools.yml');
    const poolId = lootPoolData.id ?? lootPoolData.name;
    const items = Array.isArray(lootPoolData.items) ? lootPoolData.items : [];

    let obj: Record<string, unknown> = {};
    try {
      const existing = await readYamlFile(lootPoolsPath);
      if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
        obj = { ...existing } as Record<string, unknown>;
      } else if (Array.isArray(existing)) {
        existing.forEach((lp: any) => {
          const id = lp.id ?? lp.name;
          if (id) obj[id] = lp.items ?? lp.entries ?? [];
        });
      }
    } catch {}

    obj[poolId] = serializeLootPoolItems(items.map((e: any) => ({
      itemRef: e.itemRef ?? e,
      weight: typeof e.weight === 'number' ? e.weight : 1
    })));

    await writeYamlFile(lootPoolsPath, obj);
    return c.json({ success: true, lootPool: { id: poolId, name: poolId, items } });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete Loot Pool
areas.delete('/:bundleName/areas/:areaName/loot-pools/:lootPoolId', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const lootPoolId = c.req.param('lootPoolId');
    const lootPoolsPath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'loot-pools.yml');
    
    let obj: Record<string, unknown> = {};
    try {
      const existing = await readYamlFile(lootPoolsPath);
      if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
        obj = { ...existing } as Record<string, unknown>;
      } else if (Array.isArray(existing)) {
        existing.forEach((lp: any) => {
          const id = lp.id ?? lp.name;
          if (id) obj[id] = lp.items ?? lp.entries ?? [];
        });
      }
    } catch {}

    delete obj[lootPoolId];
    await writeYamlFile(lootPoolsPath, obj);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Item Scripts (area-specific)
// Get item script
areas.get('/:bundleName/areas/:areaName/scripts/items/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'items', `${scriptName}.js`);
    
    const content = await readFile(filePath, 'utf-8');
    return c.json({ script: { type: 'items', name: scriptName, content } });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ error: 'Script not found' }, 404);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// Save item script
areas.post('/:bundleName/areas/:areaName/scripts/items/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const scriptData = await c.req.json();
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'items', `${scriptName}.js`);
    
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, scriptData.content, 'utf-8');
    return c.json({ success: true, script: scriptData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete item script
areas.delete('/:bundleName/areas/:areaName/scripts/items/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'items', `${scriptName}.js`);
    
    await unlink(filePath);
    return c.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ success: true }); // Already deleted
    }
    return c.json({ error: String(error) }, 500);
  }
});

// NPC Scripts (area-specific)
// Get NPC script
areas.get('/:bundleName/areas/:areaName/scripts/npcs/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'npcs', `${scriptName}.js`);
    
    const content = await readFile(filePath, 'utf-8');
    return c.json({ script: { type: 'npcs', name: scriptName, content } });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ error: 'Script not found' }, 404);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// Save NPC script
areas.post('/:bundleName/areas/:areaName/scripts/npcs/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const scriptData = await c.req.json();
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'npcs', `${scriptName}.js`);
    
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, scriptData.content, 'utf-8');
    return c.json({ success: true, script: scriptData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete NPC script
areas.delete('/:bundleName/areas/:areaName/scripts/npcs/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'npcs', `${scriptName}.js`);
    
    await unlink(filePath);
    return c.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ success: true }); // Already deleted
    }
    return c.json({ error: String(error) }, 500);
  }
});

// Room Scripts (area-specific)
// Get room script
areas.get('/:bundleName/areas/:areaName/scripts/rooms/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'rooms', `${scriptName}.js`);
    
    const content = await readFile(filePath, 'utf-8');
    return c.json({ script: { type: 'rooms', name: scriptName, content } });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ error: 'Script not found' }, 404);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// Save room script
areas.post('/:bundleName/areas/:areaName/scripts/rooms/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const scriptData = await c.req.json();
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'rooms', `${scriptName}.js`);
    
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, scriptData.content, 'utf-8');
    return c.json({ success: true, script: scriptData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete room script
areas.delete('/:bundleName/areas/:areaName/scripts/rooms/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'rooms', `${scriptName}.js`);
    
    await unlink(filePath);
    return c.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ success: true }); // Already deleted
    }
    return c.json({ error: String(error) }, 500);
  }
});

// Quest Scripts (area-specific)
// Get quest script
areas.get('/:bundleName/areas/:areaName/scripts/quests/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'quests', `${scriptName}.js`);
    
    const content = await readFile(filePath, 'utf-8');
    return c.json({ script: { type: 'quests', name: scriptName, content } });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ error: 'Script not found' }, 404);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// Save quest script
areas.post('/:bundleName/areas/:areaName/scripts/quests/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const scriptData = await c.req.json();
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'quests', `${scriptName}.js`);
    
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, scriptData.content, 'utf-8');
    return c.json({ success: true, script: scriptData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete quest script
areas.delete('/:bundleName/areas/:areaName/scripts/quests/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'quests', `${scriptName}.js`);
    
    await unlink(filePath);
    return c.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ success: true }); // Already deleted
    }
    return c.json({ error: String(error) }, 500);
  }
});

// Loot Pool Scripts (area-specific)
// Get loot pool script
areas.get('/:bundleName/areas/:areaName/scripts/loot-pools/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'loot-pools', `${scriptName}.js`);
    
    const content = await readFile(filePath, 'utf-8');
    return c.json({ script: { type: 'loot-pools', name: scriptName, content } });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ error: 'Script not found' }, 404);
    }
    return c.json({ error: String(error) }, 500);
  }
});

// Save loot pool script
areas.post('/:bundleName/areas/:areaName/scripts/loot-pools/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const scriptData = await c.req.json();
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'loot-pools', `${scriptName}.js`);
    
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, scriptData.content, 'utf-8');
    return c.json({ success: true, script: scriptData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Delete loot pool script
areas.delete('/:bundleName/areas/:areaName/scripts/loot-pools/:scriptName', async (c) => {
  try {
    const bundleName = c.req.param('bundleName');
    const areaName = c.req.param('areaName');
    const scriptName = c.req.param('scriptName');
    const filePath = join(BUNDLES_DIR, bundleName, 'areas', areaName, 'scripts', 'loot-pools', `${scriptName}.js`);
    
    await unlink(filePath);
    return c.json({ success: true });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return c.json({ success: true }); // Already deleted
    }
    return c.json({ error: String(error) }, 500);
  }
});

export default areas;

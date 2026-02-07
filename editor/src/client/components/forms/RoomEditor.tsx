import React, { useState, useEffect } from 'react';
import type { Room, Exit } from '../../types/area';
import { roomsApi, bundlesApi, areasApi, roomScriptsApi } from '../../services/api';
import CodeBlockWithAI from '../common/CodeBlockWithAI';
import AIConfigEdit from '../editor/AIConfigEdit';
import { NPCListSelector } from '../common/NPCSelector';
import FieldWithRevert from '../common/FieldWithRevert';
import DiffListRow from '../common/DiffListRow';
import { useDraftEditor } from '../../hooks/useDraftEditor';

interface RoomEditorProps {
  bundleName: string;
  areaName: string;
  room: Room;
  onSave: (room: Room) => Promise<void>;
  onCancel: () => void;
}

export default function RoomEditor({ bundleName, areaName, room: initialRoom, onSave, onCancel }: RoomEditorProps) {
  const { draft: room, setDraft: setRoom, saved, updateDraft, isFieldChanged, getFieldDiffState, revertField, handleSave } = useDraftEditor(initialRoom, {
    onSave,
    resetKey: initialRoom.id
  });
  const [allBundles, setAllBundles] = useState<string[]>([]);
  const [allAreas, setAllAreas] = useState<Record<string, string[]>>({});
  const [roomsByArea, setRoomsByArea] = useState<Record<string, Room[]>>({});
  const [scriptContent, setScriptContent] = useState<string>('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [coordinateError, setCoordinateError] = useState<string | null>(null);

  useEffect(() => {
    loadScript();
  }, [room.script, bundleName, areaName]);

  useEffect(() => {
    loadBundlesAndAreas();
  }, []);

  // Pre-load rooms for any area referenced in exits so the room dropdown is populated on load
  useEffect(() => {
    (room.exits || []).forEach((exit) => {
      if (!exit.roomId || !exit.roomId.includes(':')) return;
      const [area, roomId] = exit.roomId.split(':');
      if (!area) return;
      for (const [bundle, areas] of Object.entries(allAreas)) {
        if (areas.includes(area)) {
          loadRoomsForArea(bundle, area);
          break;
        }
      }
    });
  }, [room.exits, allAreas]);

  // Load rooms for current area so we can validate coordinate uniqueness
  useEffect(() => {
    if (bundleName && areaName) {
      loadRoomsForArea(bundleName, areaName);
    }
  }, [bundleName, areaName]);

  async function loadBundlesAndAreas() {
    try {
      const bundlesRes = await bundlesApi.getAll();
      const bundles = bundlesRes.bundles.map(b => b.name);
      setAllBundles(bundles);

      const areasMap: Record<string, string[]> = {};
      for (const bundle of bundles) {
        try {
          const areasRes = await areasApi.getAll(bundle);
          areasMap[bundle] = areasRes.areas;
        } catch {}
      }
      setAllAreas(areasMap);
    } catch (error) {
      console.error('Error loading bundles and areas:', error);
    }
  }

  async function loadRoomsForArea(bundle: string, area: string) {
    try {
      const roomsRes = await roomsApi.getAll(bundle, area);
      setRoomsByArea(prev => ({ ...prev, [`${bundle}:${area}`]: roomsRes.rooms }));
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  }

  function updateExit(index: number, field: keyof Exit, value: string) {
    const exits = [...(room.exits || [])];
    if (!exits[index]) {
      exits[index] = { direction: '', roomId: '' };
    }
    exits[index] = { ...exits[index], [field]: value };
    setRoom({ ...room, exits });
  }

  function addExit() {
    const exits = [...(room.exits || []), { direction: '', roomId: '' }];
    setRoom({ ...room, exits });
  }

  function removeExit(index: number) {
    const exits = [...(room.exits || [])];
    exits.splice(index, 1);
    setRoom({ ...room, exits });
  }

  function updateCoord(index: 0 | 1 | 2, raw: string) {
    const cur = room.coordinates ?? [0, 0, 0];
    const num = raw === '' ? NaN : Number(raw);
    const next: [number, number, number] = [
      index === 0 ? (raw === '' ? 0 : (Number.isNaN(num) ? cur[0] : num)) : (cur[0] ?? 0),
      index === 1 ? (raw === '' ? 0 : (Number.isNaN(num) ? cur[1] : num)) : (cur[1] ?? 0),
      index === 2 ? (raw === '' ? 0 : (Number.isNaN(num) ? cur[2] : num)) : (cur[2] ?? 0)
    ];
    if (raw !== '' && !Number.isNaN(num)) {
      setRoom({ ...room, coordinates: next });
    } else {
      setRoom({ ...room, coordinates: next[0] === 0 && next[1] === 0 && next[2] === 0 ? undefined : next });
    }
  }

  async function loadScript() {
    if (!room.script) {
      setScriptContent('');
      setScriptError(null);
      return;
    }

    setScriptLoading(true);
    setScriptError(null);
    try {
      const data = await roomScriptsApi.get(bundleName, areaName, room.script);
      setScriptContent(data.script.content);
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'Failed to load script');
      setScriptContent('');
    } finally {
      setScriptLoading(false);
    }
  }

  async function handleAddScript() {
    const scriptName = prompt('Enter script name (without .js extension):');
    if (!scriptName || !scriptName.trim()) return;

    const trimmedName = scriptName.trim();
    const newRoom = { ...room, script: trimmedName };
    setRoom(newRoom);

    // Create empty script file
    try {
      await roomScriptsApi.save(bundleName, areaName, trimmedName, {
        type: 'rooms',
        name: trimmedName,
        content: `'use strict';\n\nmodule.exports = {\n  listeners: {\n    // Add event listeners here\n  }\n};`
      });
      await loadScript();
    } catch (err) {
      alert('Failed to create script: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  async function handleRemoveScript() {
    if (!room.script) return;

    if (!confirm(`Are you sure you want to remove the script "${room.script}"? This will delete the script file.`)) {
      return;
    }

    try {
      await roomScriptsApi.delete(bundleName, areaName, room.script);
      const newRoom = { ...room };
      delete newRoom.script;
      setRoom(newRoom);
      setScriptContent('');
      setScriptError(null);
    } catch (err) {
      alert('Failed to delete script: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  function getCurrentCoordinates(): [number, number, number] | null {
    const coords = room.coordinates;
    if (!coords || coords.length < 3) return null;
    const x = Number(coords[0]);
    const y = Number(coords[1]);
    const z = Number(coords[2]);
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) return null;
    return [x, y, z];
  }

  const COORD_DIRECTIONS = [
    { name: 'north', delta: [0, 1, 0] },
    { name: 'south', delta: [0, -1, 0] },
    { name: 'east', delta: [1, 0, 0] },
    { name: 'west', delta: [-1, 0, 0] },
    { name: 'up', delta: [0, 0, 1] },
    { name: 'down', delta: [0, 0, -1] }
  ] as const;

  function getAdjacentRoomsByCoordinate(): { direction: string; room: Room }[] {
    const coords = getCurrentCoordinates();
    if (!coords) return [];
    const areaRooms = roomsByArea[`${bundleName}:${areaName}`] || [];
    const [x, y, z] = coords;
    const result: { direction: string; room: Room }[] = [];
    for (const dir of COORD_DIRECTIONS) {
      const [dx, dy, dz] = dir.delta;
      const targetCoords = [x + dx, y + dy, z + dz];
      const targetRoom = areaRooms.find((r) => {
        if (!r.coordinates || r.coordinates.length < 3) return false;
        const [tx, ty, tz = 0] = r.coordinates;
        return tx === targetCoords[0] && ty === targetCoords[1] && (tz ?? 0) === targetCoords[2];
      });
      if (targetRoom) {
        result.push({ direction: dir.name, room: targetRoom });
      }
    }
    return result;
  }

  function isDuplicateCoordinates(): boolean {
    const coords = getCurrentCoordinates();
    if (!coords) return false;
    const otherRooms = roomsByArea[`${bundleName}:${areaName}`] || [];
    const [x, y, z] = coords;
    return otherRooms.some(
      (r) => r.id !== room.id && r.coordinates && r.coordinates.length >= 3
        && r.coordinates[0] === x && r.coordinates[1] === y && (r.coordinates[2] ?? 0) === z
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCoordinateError(null);

    const coords = getCurrentCoordinates();
    if (coords !== null && isDuplicateCoordinates()) {
      setCoordinateError('Another room in this area already has these coordinates. Each room must have unique coordinates.');
      return;
    }

    // Save the script if it exists and has content
    if (room.script && scriptContent) {
      try {
        await roomScriptsApi.save(bundleName, areaName, room.script, {
          type: 'rooms',
          name: room.script,
          content: scriptContent
        });
      } catch (err) {
        alert('Failed to save script: ' + (err instanceof Error ? err.message : 'Unknown error'));
        return; // Don't save room if script save fails
      }
    }

    await handleSave(room);
  }

  return (
    <div className="form-container">
      <h2>Edit Room: {room.title || room.id}</h2>
      <form onSubmit={handleSubmit}>
        {/* id and value on same row */}
        <FieldWithRevert changed={isFieldChanged('id')} onRevert={() => revertField('id')} inline>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            <label style={{ minWidth: '4rem', marginBottom: 0 }}>id</label>
            <input
              type="text"
              value={room.id}
              onChange={(e) => updateDraft('id', e.target.value)}
              required
              style={{ flex: 1, minWidth: '10rem' }}
            />
          </div>
        </FieldWithRevert>

        <FieldWithRevert changed={isFieldChanged('title')} onRevert={() => revertField('title')}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={room.title || ''}
              onChange={(e) => updateDraft('title', e.target.value)}
              required
            />
          </div>
        </FieldWithRevert>

        <FieldWithRevert changed={isFieldChanged('description')} onRevert={() => revertField('description')}>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={room.description || ''}
              onChange={(e) => updateDraft('description', e.target.value)}
              required
            />
          </div>
        </FieldWithRevert>

        <FieldWithRevert changed={isFieldChanged('coordinates')} onRevert={() => revertField('coordinates')}>
          <div className="form-group">
            <label>Coordinates (x, y, z) – Optional</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                value={room.coordinates?.[0] ?? ''}
                onChange={(e) => updateCoord(0, e.target.value)}
                placeholder="x"
                style={{ width: '4rem' }}
              />
              <input
                type="number"
                value={room.coordinates?.[1] ?? ''}
                onChange={(e) => updateCoord(1, e.target.value)}
                placeholder="y"
                style={{ width: '4rem' }}
              />
              <input
                type="number"
                value={room.coordinates?.[2] ?? ''}
                onChange={(e) => updateCoord(2, e.target.value)}
                placeholder="z"
                style={{ width: '4rem' }}
              />
            </div>
            {coordinateError && (
              <div style={{ color: 'var(--danger)', marginTop: '0.25rem', fontSize: '0.9rem' }} role="alert">
                {coordinateError}
              </div>
            )}
            {room.coordinates != null && isDuplicateCoordinates() && !coordinateError && (
              <div style={{ color: 'var(--danger)', marginTop: '0.25rem', fontSize: '0.9rem' }} role="alert">
                Another room in this area already has these coordinates.
              </div>
            )}
            {getCurrentCoordinates() != null && (() => {
              const adjacent = getAdjacentRoomsByCoordinate();
              return (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <div style={{ marginBottom: '0.25rem' }}>Rooms you could exit to (by coordinates):</div>
                  {adjacent.length === 0 ? (
                    <div style={{ fontStyle: 'italic' }}>No other rooms in this area at adjacent coordinates.</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                      {adjacent.map(({ direction, room: r }) => (
                        <li key={`${direction}-${r.id}`}>
                          <strong>{direction}</strong> → {r.title || r.id}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
          </div>
        </FieldWithRevert>

        {/* Exits: only leaf rows get changed/revert UI (DiffListRow per exit), not the whole section. */}
        <div className="form-group">
          <label>Exits</label>
          {(room.exits || []).map((exit, index) => {
            const [exitArea, exitRoom] = exit.roomId ? exit.roomId.split(':') : ['', ''];
            const exitDiffState = getFieldDiffState(`exits.${index}`);
            return (
              <DiffListRow
                key={index}
                state={exitDiffState === 'removed' ? 'unchanged' : exitDiffState}
                onRevert={() => revertField(`exits.${index}`)}
                onRemove={() => removeExit(index)}
                removeAriaLabel="Remove exit"
              >
                  <input
                    type="text"
                    value={exit.direction || ''}
                    onChange={(e) => updateExit(index, 'direction', e.target.value)}
                    placeholder="Direction"
                    style={{ flex: 1, minWidth: '5rem' }}
                  />
                  <select
                    value={exitArea}
                    onChange={(e) => {
                      const area = e.target.value;
                      updateExit(index, 'roomId', area ? `${area}:` : '');
                      if (area) {
                        for (const [bundle, areas] of Object.entries(allAreas)) {
                          if (areas.includes(area)) {
                            loadRoomsForArea(bundle, area);
                            break;
                          }
                        }
                      }
                    }}
                    style={{ flex: 1, minWidth: '6rem' }}
                  >
                    <option value="">Select Area...</option>
                    {allBundles.map(bundle => {
                      const areas = allAreas[bundle] || [];
                      if (areas.length === 0) return null;
                      return (
                        <optgroup key={bundle} label={bundle}>
                          {areas.map(area => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  <select
                    value={exitRoom}
                    onChange={(e) => {
                      const roomId = e.target.value;
                      updateExit(index, 'roomId', exitArea ? `${exitArea}:${roomId}` : roomId);
                    }}
                    style={{ flex: 1, minWidth: '6rem' }}
                  >
                    <option value="">Select Room...</option>
                    {exitArea && roomsByArea[`${bundleName}:${exitArea}`]?.map(r => (
                      <option key={r.id} value={r.id}>{r.title || r.id}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={exit.leaveMessage || ''}
                    onChange={(e) => updateExit(index, 'leaveMessage', e.target.value)}
                    placeholder="Leave message (optional)"
                    style={{ flex: 1.5, minWidth: '8rem' }}
                  />
                </DiffListRow>
              );
            })}
            <button type="button" onClick={addExit} className="btn" style={{ marginTop: '0.5rem' }}>
              Add Exit
            </button>
          </div>

        <div className="form-group">
          <NPCListSelector
            bundleName={bundleName}
            label="NPCs in this room"
            value={
              Array.isArray(room.npcs)
                ? room.npcs
                    .filter((r): r is string => typeof r === 'string')
                    .map((r) => (r.includes(':') ? r : `${areaName}:${r}`))
                : []
            }
            savedValue={
              saved && Array.isArray(saved.npcs)
                ? saved.npcs
                    .filter((r): r is string => typeof r === 'string')
                    .map((r) => (r.includes(':') ? r : `${areaName}:${r}`))
                : []
            }
            onChange={(next) => setRoom({ ...room, npcs: next })}
          />
        </div>

        <AIConfigEdit config={room} resourceType="room" onApply={setRoom} />

        {/* Script Section */}
        <div className="script-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Room Script</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {room.script ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRemoveScript}
                >
                  Remove Script
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddScript}
                >
                  + Add Script
                </button>
              )}
            </div>
          </div>

          {room.script && (
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Script: <code>{room.script}.js</code>
              </p>
              {scriptLoading ? (
                <div>Loading script...</div>
              ) : scriptError ? (
                <>
                  <div style={{ color: 'var(--danger)', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '4px', marginBottom: '1rem' }}>
                    Error: {scriptError}
                  </div>
                  <CodeBlockWithAI
                    value={scriptContent || ''}
                    onChange={setScriptContent}
                    language="javascript"
                    label="JavaScript Code"
                    height="400px"
                  />
                </>
              ) : (
                <CodeBlockWithAI
                  value={scriptContent}
                  onChange={setScriptContent}
                  language="javascript"
                  label="JavaScript Code"
                  height="400px"
                />
              )}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save Room</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

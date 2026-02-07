import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, Routes, Route, Navigate } from 'react-router-dom';
import { useBundleData } from '../hooks/useBundleData';
import ResourceTree from '../components/tree/ResourceTree';
import Breadcrumb from '../components/common/Breadcrumb';
import RoomMap from '../components/map/RoomMap';
import RoomEditor from '../components/forms/RoomEditor';
import ClassEditor from '../components/forms/ClassEditor';
import BehaviorEditor from '../components/forms/BehaviorEditor';
import CommandEditor from '../components/forms/CommandEditor';
import EffectEditor from '../components/forms/EffectEditor';
import SkillEditor from '../components/forms/SkillEditor';
import HelpFileEditor from '../components/forms/HelpFileEditor';
import NPCEditor from '../components/forms/NPCEditor';
import ItemEditor from '../components/forms/ItemEditor';
import QuestEditor from '../components/forms/QuestEditor';
import { roomsApi, classesApi, behaviorsApi, commandsApi, effectsApi, skillsApi, helpFilesApi, npcsApi, itemsApi, questsApi, lootPoolsApi, lootPoolScriptsApi, DEFAULT_BEHAVIOR_CONTENT } from '../services/api';
import CodeBlockWithAI from '../components/common/CodeBlockWithAI';
import LootPoolItemsEditor from '../components/common/LootPoolItemsEditor';
import FieldWithRevert from '../components/common/FieldWithRevert';
import AIConfigEdit from '../components/editor/AIConfigEdit';
import Modal from '../components/common/Modal';
import { useDraftEditor } from '../hooks/useDraftEditor';
import type { Room, NPC, Item } from '../types/area';
import type { Class, Behavior, Command, Effect, Skill, HelpFile } from '../types/resource';

export default function EditorPage() {
  const { bundleName, '*': path } = useParams<{ bundleName: string; '*': string }>();
  const navigate = useNavigate();
  const { bundleData, loading: bundleLoading } = useBundleData(bundleName || null);

  if (bundleLoading || !bundleName) {
    return <div>Loading...</div>;
  }

  if (!bundleData) {
    return <div>Bundle not found</div>;
  }

  return (
    <div className="app">
      <header>
        <h1>🏰 Ranvier MUD Editor</h1>
        <nav className="tabs">
          <button className="tab" onClick={() => navigate('/bundles')}>Bundles</button>
          <button className="tab active">Editor</button>
        </nav>
      </header>

      <main>
        <section className="view active">
          <div className="editor-layout">
            <aside className="sidebar">
              <Breadcrumb bundleName={bundleName} path={path} />
              <ResourceTree bundleName={bundleName} bundleData={bundleData} />
            </aside>
            <div className="editor-content">
              <Routes>
                <Route path="" element={<div className="placeholder"><p>Select a resource to edit</p></div>} />
                <Route path="areas/:areaName/*" element={<AreaView bundleName={bundleName} />} />
                <Route path="classes" element={<ClassesView bundleName={bundleName} />} />
                <Route path="classes/:className" element={<ClassEditView bundleName={bundleName} />} />
                <Route path="behaviors" element={<BehaviorsView bundleName={bundleName} />} />
                <Route path="behaviors/new" element={<BehaviorNewView bundleName={bundleName} />} />
                <Route path="behaviors/:type/:name" element={<BehaviorEditView bundleName={bundleName} />} />
                <Route path="commands" element={<CommandsView bundleName={bundleName} />} />
                <Route path="commands/:commandName" element={<CommandEditView bundleName={bundleName} />} />
                <Route path="effects" element={<EffectsView bundleName={bundleName} />} />
                <Route path="effects/:effectName" element={<EffectEditView bundleName={bundleName} />} />
                <Route path="skills" element={<SkillsView bundleName={bundleName} />} />
                <Route path="skills/:skillName" element={<SkillEditView bundleName={bundleName} />} />
                <Route path="help" element={<HelpFilesView bundleName={bundleName} />} />
                <Route path="help/:helpName" element={<HelpFileEditView bundleName={bundleName} />} />
                <Route path="*" element={<Navigate to="" replace />} />
              </Routes>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Area View
function AreaView({ bundleName }: { bundleName: string }) {
  const { areaName, '*': subPath } = useParams<{ areaName: string; '*': string }>();
  const navigate = useNavigate();

  if (!areaName) return <div>Area not found</div>;

  return (
    <Routes>
      <Route path="" element={<AreaDefaultView bundleName={bundleName} areaName={areaName} />} />
      <Route path="rooms/:roomId" element={<RoomEditView bundleName={bundleName} areaName={areaName} />} />
      <Route path="npcs/:npcId" element={<NPCEditView bundleName={bundleName} areaName={areaName} />} />
      <Route path="items/:itemId" element={<ItemEditView bundleName={bundleName} areaName={areaName} />} />
      <Route path="quests/:questId" element={<QuestEditView bundleName={bundleName} areaName={areaName} />} />
      <Route path="loot-pools/:lootPoolId" element={<LootPoolEditView bundleName={bundleName} areaName={areaName} />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}

function AreaDefaultView({ bundleName, areaName }: { bundleName: string; areaName: string }) {
  return (
    <RoomMap
      bundleName={bundleName}
      areaName={areaName}
      onNodeClick={(nodeId, nodeType) => {
        if (nodeType === 'room') {
          const roomId = nodeId.replace('room:', '');
          window.location.href = `/bundle/${bundleName}/areas/${areaName}/rooms/${roomId}`;
        } else if (nodeType === 'npc') {
          const npcId = nodeId.replace('npc:', '');
          window.location.href = `/bundle/${bundleName}/areas/${areaName}/npcs/${npcId}`;
        } else if (nodeType === 'item') {
          const itemId = nodeId.replace('item:', '');
          window.location.href = `/bundle/${bundleName}/areas/${areaName}/items/${itemId}`;
        }
      }}
    />
  );
}

function RoomEditView({ bundleName, areaName }: { bundleName: string; areaName: string }) {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setRoom(null); // Clear old data immediately
    
    roomsApi.get(bundleName, areaName, roomId)
      .then(data => {
        setRoom(data.room);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading room:', err);
        setLoading(false);
      });
  }, [bundleName, areaName, roomId]);

  async function handleSave(updatedRoom: Room) {
    try {
      await roomsApi.save(bundleName, areaName, updatedRoom);
      navigate(`/bundle/${bundleName}/areas/${areaName}`);
    } catch (error) {
      console.error('Error saving room:', error);
      alert('Failed to save room');
    }
  }

  async function handleDelete() {
    if (!room || !roomId) return;
    if (!confirm(`Are you sure you want to delete Room "${room.title || room.id}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await roomsApi.delete(bundleName, areaName, roomId);
      navigate(`/bundle/${bundleName}/areas/${areaName}`);
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room');
    }
  }

  if (loading) return <div>Loading room...</div>;
  if (!room) return <div>Room not found</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Edit Room: {room.title || room.id}</h2>
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>
      <RoomEditor
        bundleName={bundleName}
        areaName={areaName}
        room={room}
        onSave={handleSave}
        onCancel={() => navigate(`/bundle/${bundleName}/areas/${areaName}`)}
      />
    </div>
  );
}

function NPCEditView({ bundleName, areaName }: { bundleName: string; areaName: string }) {
  const { npcId } = useParams<{ npcId: string }>();
  const navigate = useNavigate();
  const [npc, setNPC] = useState<NPC | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!npcId) {
      setNPC(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNPC(null); // Clear old data immediately
    
    npcsApi.getAll(bundleName, areaName)
      .then(data => {
        const found = data.npcs.find((n: NPC) => n.id === npcId);
        if (found) {
          setNPC(found);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading NPC:', err);
        setLoading(false);
      });
  }, [bundleName, areaName, npcId]);

  async function handleSave(updatedNPC: NPC) {
    try {
      await npcsApi.save(bundleName, areaName, updatedNPC);
      navigate(`/bundle/${bundleName}/areas/${areaName}`);
    } catch (error) {
      console.error('Error saving NPC:', error);
      alert('Failed to save NPC');
    }
  }

  if (loading) return <div>Loading NPC...</div>;
  if (!npc) return <div>NPC not found</div>;

  return (
    <NPCEditor
      bundleName={bundleName}
      areaName={areaName}
      npc={npc}
      onSave={handleSave}
      onCancel={() => navigate(`/bundle/${bundleName}/areas/${areaName}`)}
    />
  );
}

function ItemEditView({ bundleName, areaName }: { bundleName: string; areaName: string }) {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setItem(null); // Clear old data immediately
    
    itemsApi.getAll(bundleName, areaName)
      .then(data => {
        const found = data.items.find((i: Item) => i.id === itemId);
        if (found) {
          setItem(found);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading item:', err);
        setLoading(false);
      });
  }, [bundleName, areaName, itemId]);

  async function handleSave(updatedItem: Item) {
    try {
      await itemsApi.save(bundleName, areaName, updatedItem);
      navigate(`/bundle/${bundleName}/areas/${areaName}`);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    }
  }

  if (loading) return <div>Loading item...</div>;
  if (!item) return <div>Item not found</div>;

  return (
    <ItemEditor
      bundleName={bundleName}
      areaName={areaName}
      item={item}
      onSave={handleSave}
      onCancel={() => navigate(`/bundle/${bundleName}/areas/${areaName}`)}
    />
  );
}

function QuestEditView({ bundleName, areaName }: { bundleName: string; areaName: string }) {
  const { questId } = useParams<{ questId: string }>();
  const navigate = useNavigate();
  const [quest, setQuest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!questId) {
      setQuest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setQuest(null);
    
    questsApi.getAll(bundleName, areaName)
      .then(data => {
        const found = data.quests.find((q: any) => q.id === questId);
        if (found) {
          setQuest(found);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading quest:', err);
        setLoading(false);
      });
  }, [bundleName, areaName, questId]);

  async function handleSave(updatedQuest: any) {
    try {
      await questsApi.save(bundleName, areaName, updatedQuest);
      navigate(`/bundle/${bundleName}/areas/${areaName}`);
    } catch (error) {
      console.error('Error saving quest:', error);
      alert('Failed to save quest');
    }
  }

  async function handleDelete() {
    if (!quest || !questId) return;
    if (!confirm(`Are you sure you want to delete Quest "${quest.title || quest.id}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await questsApi.delete(bundleName, areaName, questId);
      navigate(`/bundle/${bundleName}/areas/${areaName}`);
    } catch (error) {
      console.error('Error deleting quest:', error);
      alert('Failed to delete quest');
    }
  }

  if (loading) return <div>Loading quest...</div>;
  if (!quest) return <div>Quest not found</div>;

  return (
    <div className="form-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Edit Quest: {quest.title || quest.id}</h2>
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>
      <QuestEditor
        bundleName={bundleName}
        areaName={areaName}
        quest={quest}
        onSave={handleSave}
        onCancel={() => navigate(`/bundle/${bundleName}/areas/${areaName}`)}
      />
    </div>
  );
}

function LootPoolEditView({ bundleName, areaName }: { bundleName: string; areaName: string }) {
  const { lootPoolId } = useParams<{ lootPoolId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [initialLootPool, setInitialLootPool] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [scriptContent, setScriptContent] = useState<string>('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const defaultPool = { id: lootPoolId ?? '', name: lootPoolId ?? '', items: [] as { itemRef: string; weight: number }[] };
  const { draft: lootPool, setDraft: setLootPool, updateDraft, isFieldChanged, revertField, handleSave: commitSave } = useDraftEditor(initialLootPool ?? defaultPool, {
    onSave: async (data) => {
      if (data.script && scriptContent) {
        await lootPoolScriptsApi.save(bundleName, areaName, data.script, {
          type: 'loot-pools',
          name: data.script,
          content: scriptContent
        });
      }
      const itemsToSave = Array.isArray(data.items) ? data.items.filter((e: any) => e?.itemRef?.trim()) : [];
      await lootPoolsApi.save(bundleName, areaName, { ...data, items: itemsToSave });
      navigate(`/bundle/${bundleName}/areas/${areaName}`);
    },
    resetKey: lootPoolId ?? ''
  });

  useEffect(() => {
    if (!lootPoolId) {
      setInitialLootPool(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setInitialLootPool(null);

    lootPoolsApi.getAll(bundleName, areaName)
      .then(data => {
        const found = data.lootPools.find((lp: any) => (lp.id || lp.name) === lootPoolId);
        if (found) {
          setInitialLootPool(found);
        } else if (searchParams.get('new') === 'true') {
          setInitialLootPool({ id: lootPoolId, name: lootPoolId, items: [] });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading loot pool:', err);
        setLoading(false);
      });
  }, [bundleName, areaName, lootPoolId, searchParams]);

  useEffect(() => {
    if (!lootPool?.script) {
      setScriptContent('');
      setScriptError(null);
      return;
    }
    let cancelled = false;
    setScriptLoading(true);
    setScriptError(null);
    lootPoolScriptsApi.get(bundleName, areaName, lootPool.script)
      .then(data => {
        if (!cancelled) setScriptContent(data.script.content);
      })
      .catch(err => {
        if (!cancelled) setScriptError(err instanceof Error ? err.message : 'Failed to load script');
        if (!cancelled) setScriptContent('');
      })
      .finally(() => {
        if (!cancelled) setScriptLoading(false);
      });
    return () => { cancelled = true; };
  }, [lootPool?.script, bundleName, areaName]);

  async function handleAddScript() {
    const scriptName = prompt('Enter script name (without .js extension):');
    if (!scriptName || !scriptName.trim()) return;

    const trimmedName = scriptName.trim();
    updateDraft('script', trimmedName);

    try {
      await lootPoolScriptsApi.save(bundleName, areaName, trimmedName, {
        type: 'loot-pools',
        name: trimmedName,
        content: `'use strict';\n\nmodule.exports = {\n  listeners: {\n    // Add event listeners here\n  }\n};`
      });
      const data = await lootPoolScriptsApi.get(bundleName, areaName, trimmedName);
      setScriptContent(data.script.content);
      setScriptError(null);
    } catch (err) {
      alert('Failed to create script: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  async function handleRemoveScript() {
    if (!lootPool?.script) return;

    if (!confirm(`Are you sure you want to remove the script "${lootPool.script}"? This will delete the script file.`)) {
      return;
    }

    try {
      await lootPoolScriptsApi.delete(bundleName, areaName, lootPool.script);
      updateDraft('script', undefined);
      setScriptContent('');
      setScriptError(null);
    } catch (err) {
      alert('Failed to delete script: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    commitSave(lootPool);
  }

  async function handleDelete() {
    if (!lootPool || !lootPoolId) return;
    if (!confirm(`Are you sure you want to delete Loot Pool "${lootPool.name || lootPool.id || lootPoolId}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await lootPoolsApi.delete(bundleName, areaName, lootPoolId);
      navigate(`/bundle/${bundleName}/areas/${areaName}`);
    } catch (error) {
      console.error('Error deleting loot pool:', error);
      alert('Failed to delete loot pool');
    }
  }

  const items = (Array.isArray(lootPool?.items) ? lootPool.items : []).map((e: any) =>
    e && typeof e === 'object' && 'itemRef' in e ? { itemRef: e.itemRef || '', weight: typeof e.weight === 'number' ? e.weight : 1 } : { itemRef: typeof e === 'string' ? e : '', weight: 1 }
  );

  if (loading) return <div>Loading loot pool...</div>;
  if (lootPoolId && searchParams.get('new') !== 'true' && !initialLootPool) return <div>Loot pool not found</div>;

  return (
    <div className="form-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Edit Loot Pool: {lootPool.name || lootPool.id || lootPoolId}</h2>
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>

      <form onSubmit={handleSave}>
        <h3 className="form-section-title" style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Basic info</h3>
        <FieldWithRevert changed={isFieldChanged('id')} onRevert={() => revertField('id')}>
          <div className="form-group">
            <label>Id</label>
            <input
              type="text"
              value={lootPool.id ?? ''}
              onChange={(e) => updateDraft('id', e.target.value)}
              required
            />
          </div>
        </FieldWithRevert>
        <FieldWithRevert changed={isFieldChanged('name')} onRevert={() => revertField('name')}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={lootPool.name ?? ''}
              onChange={(e) => updateDraft('name', e.target.value)}
            />
          </div>
        </FieldWithRevert>

        <h3 className="form-section-title" style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 600 }}>Loot table</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Add items and set a weight for each. Higher weight = higher drop chance relative to other items in this pool.
        </p>
        <LootPoolItemsEditor
          bundleName={bundleName}
          value={items}
          onChange={(next) => updateDraft('items', next)}
          label=""
          isFieldChanged={isFieldChanged}
          revertField={revertField}
          itemsPath="items"
        />

        <AIConfigEdit config={lootPool} resourceType="loot-pool" onApply={setLootPool} />

        {/* Script Section */}
        <div className="script-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Loot Pool Script</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {lootPool.script ? (
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

          {lootPool.script && (
            <div>
              <p style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Script: <code>{lootPool.script}.js</code>
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

        <div className="form-actions" style={{ marginTop: '2rem' }}>
          <button type="submit" className="btn btn-primary">Save Loot Pool</button>
          <button type="button" className="btn" onClick={() => navigate(`/bundle/${bundleName}/areas/${areaName}`)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// Classes View
function ClassesView({ bundleName }: { bundleName: string }) {
  const navigate = useNavigate();
  const { bundleData } = useBundleData(bundleName);

  if (!bundleData) return <div>Loading...</div>;

  return (
    <div>
      <h2>Classes</h2>
      <button className="btn btn-primary" onClick={() => {/* TODO: create class */}}>
        + New Class
      </button>
      <div className="list">
        {bundleData.classes?.map(className => (
          <div key={className} className="card" onClick={() => navigate(`/bundle/${bundleName}/classes/${className}`)}>
            <h3>{className}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassEditView({ bundleName }: { bundleName: string }) {
  const { className } = useParams<{ className: string }>();
  const navigate = useNavigate();
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!className) {
      setClassData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setClassData(null); // Clear old data immediately
    
    classesApi.get(bundleName, className)
      .then(data => {
        setClassData(data.class);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading class:', err);
        setLoading(false);
      });
  }, [bundleName, className]);

  async function handleSave(updatedClass: Class) {
    try {
      await classesApi.save(bundleName, className!, updatedClass);
      navigate(`/bundle/${bundleName}/classes`);
    } catch (error) {
      console.error('Error saving class:', error);
      alert('Failed to save class');
    }
  }

  if (loading) return <div>Loading class...</div>;
  if (!classData) return <div>Class not found</div>;

  return (
    <ClassEditor
      bundleName={bundleName}
      classData={classData}
      onSave={handleSave}
      onCancel={() => navigate(`/bundle/${bundleName}/classes`)}
    />
  );
}

// Behaviors View
function BehaviorsView({ bundleName }: { bundleName: string }) {
  const navigate = useNavigate();
  const [behaviors, setBehaviors] = useState<{ type: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newType, setNewType] = useState('');
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    behaviorsApi.getAll(bundleName)
      .then((data) => {
        if (!cancelled) setBehaviors(data.behaviors ?? []);
      })
      .catch(() => {
        if (!cancelled) setBehaviors([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [bundleName]);

  const behaviorsByType: Record<string, string[]> = {};
  behaviors.forEach((b) => {
    if (!behaviorsByType[b.type]) behaviorsByType[b.type] = [];
    behaviorsByType[b.type].push(b.name);
  });
  const typeOrder = Object.keys(behaviorsByType).sort();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const t = newType.trim().toLowerCase().replace(/\s+/g, '-');
    const n = newName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!t || !n) {
      setCreateError('Type and name are required (e.g. npc, my-behavior).');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(t) || !/^[a-z0-9-]+$/.test(n)) {
      setCreateError('Use only lowercase letters, numbers, and hyphens.');
      return;
    }
    setShowNewModal(false);
    setNewType('');
    setNewName('');
    // Stage only: open editor; file is created only when user clicks Save there
    navigate(`/bundle/${bundleName}/behaviors/new`, { state: { type: t, name: n } });
  }

  if (loading) return <div className="view-loading">Loading behaviors…</div>;

  return (
    <div className="behaviors-view">
      <div className="view-toolbar">
        <h2>Behaviors</h2>
        <p className="view-description">NPC and entity behavior scripts. Each behavior has a type (e.g. <code>npc</code>) and a name. Configure them on NPCs in area YAML.</p>
        <button type="button" className="btn btn-primary" onClick={() => { setCreateError(null); setShowNewModal(true); }}>
          + New Behavior
        </button>
      </div>

      {typeOrder.length === 0 ? (
        <div className="empty-state">
          <p>No behaviors yet. Add one to define reusable behavior scripts (e.g. aggro, wander) that you can attach to NPCs.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            + New Behavior
          </button>
        </div>
      ) : (
        <div className="behaviors-list">
          {typeOrder.map((type) => (
            <section key={type} className="behaviors-type-section">
              <h3 className="behaviors-type-title">📁 {type}</h3>
              <div className="list">
                {(behaviorsByType[type] ?? []).sort().map((name) => (
                  <div
                    key={`${type}:${name}`}
                    className="card card-clickable"
                    onClick={() => navigate(`/bundle/${bundleName}/behaviors/${type}/${name}`)}
                  >
                    <span className="card-title">{name}</span>
                    <span className="card-meta">{type}/{name}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="New Behavior">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Type</label>
            <input
              type="text"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="e.g. npc"
              autoFocus
            />
            <span className="form-hint">Folder under behaviors/ (e.g. npc, item).</span>
          </div>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. my-aggro"
            />
            <span className="form-hint">Script name (e.g. ranvier-aggro, wander).</span>
          </div>
          {createError && <p className="form-error">{createError}</p>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Open editor</button>
            <button type="button" className="btn" onClick={() => setShowNewModal(false)}>Cancel</button>
          </div>
          <p className="form-hint" style={{ marginTop: '0.5rem' }}>The behavior file is created only when you click Save in the editor.</p>
        </form>
      </Modal>
    </div>
  );
}

// New behavior: staged in editor; nothing is saved until user clicks Save
function BehaviorNewView({ bundleName }: { bundleName: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { type?: string; name?: string } | null) ?? {};
  const type = state.type ?? '';
  const name = state.name ?? '';

  useEffect(() => {
    if (!type || !name) {
      navigate(`/bundle/${bundleName}/behaviors`, { replace: true });
    }
  }, [bundleName, type, name, navigate]);

  const initialBehavior: Behavior = {
    type,
    name,
    content: DEFAULT_BEHAVIOR_CONTENT,
    exampleConfig: ''
  };

  async function handleSave(updatedBehavior: Behavior) {
    try {
      await behaviorsApi.create(bundleName, updatedBehavior.type, updatedBehavior.name, updatedBehavior.content, updatedBehavior.exampleConfig);
      navigate(`/bundle/${bundleName}/behaviors`);
    } catch (error) {
      console.error('Error saving behavior:', error);
      alert('Failed to create behavior');
    }
  }

  if (!type || !name) return null;

  return (
    <BehaviorEditor
      bundleName={bundleName}
      behaviorData={initialBehavior}
      isNew={true}
      onSave={handleSave}
      onCancel={() => navigate(`/bundle/${bundleName}/behaviors`)}
    />
  );
}

function BehaviorEditView({ bundleName }: { bundleName: string }) {
  const { type, name } = useParams<{ type: string; name: string }>();
  const navigate = useNavigate();
  const [behaviorData, setBehaviorData] = useState<Behavior | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!type || !name) {
      setBehaviorData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setBehaviorData(null); // Clear old data immediately
    
    behaviorsApi.get(bundleName, type, name)
      .then(data => {
        setBehaviorData(data.behavior);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading behavior:', err);
        setLoading(false);
      });
  }, [bundleName, type, name]);

  async function handleSave(updatedBehavior: Behavior) {
    try {
      await behaviorsApi.save(bundleName, type!, name!, updatedBehavior);
      // Stay on editor so baseline updates and diff clears
    } catch (error) {
      console.error('Error saving behavior:', error);
      alert('Failed to save behavior');
    }
  }

  async function handleDelete() {
    try {
      await behaviorsApi.delete(bundleName, type!, name!);
      navigate(`/bundle/${bundleName}/behaviors`);
    } catch (error) {
      console.error('Error deleting behavior:', error);
      alert('Failed to delete behavior');
    }
  }

  if (loading) return <div className="view-loading">Loading behavior…</div>;
  if (!behaviorData) return <div>Behavior not found</div>;

  return (
    <BehaviorEditor
      bundleName={bundleName}
      behaviorData={behaviorData}
      onSave={handleSave}
      onCancel={() => navigate(`/bundle/${bundleName}/behaviors`)}
      onDelete={handleDelete}
    />
  );
}

// Commands View
function CommandsView({ bundleName }: { bundleName: string }) {
  const navigate = useNavigate();
  const { bundleData } = useBundleData(bundleName);

  if (!bundleData) return <div>Loading...</div>;

  return (
    <div>
      <h2>Commands</h2>
      <button className="btn btn-primary" onClick={() => {/* TODO: create command */}}>
        + New Command
      </button>
      <div className="list">
        {bundleData.commands?.map(commandName => (
          <div key={commandName} className="card" onClick={() => navigate(`/bundle/${bundleName}/commands/${commandName}`)}>
            <h3>{commandName}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommandEditView({ bundleName }: { bundleName: string }) {
  const { commandName } = useParams<{ commandName: string }>();
  const navigate = useNavigate();
  const [commandData, setCommandData] = useState<Command | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!commandName) {
      setCommandData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setCommandData(null); // Clear old data immediately
    
    commandsApi.get(bundleName, commandName)
      .then(data => {
        setCommandData(data.command);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading command:', err);
        setLoading(false);
      });
  }, [bundleName, commandName]);

  async function handleSave(updatedCommand: Command) {
    try {
      await commandsApi.save(bundleName, commandName!, updatedCommand);
      navigate(`/bundle/${bundleName}/commands`);
    } catch (error) {
      console.error('Error saving command:', error);
      alert('Failed to save command');
    }
  }

  if (loading) return <div>Loading command...</div>;
  if (!commandData) return <div>Command not found</div>;

  return (
    <CommandEditor
      bundleName={bundleName}
      commandData={commandData}
      onSave={handleSave}
      onCancel={() => navigate(`/bundle/${bundleName}/commands`)}
    />
  );
}

// Effects View
function EffectsView({ bundleName }: { bundleName: string }) {
  const navigate = useNavigate();
  const { bundleData } = useBundleData(bundleName);

  if (!bundleData) return <div>Loading...</div>;

  return (
    <div>
      <h2>Effects</h2>
      <button className="btn btn-primary" onClick={() => {/* TODO: create effect */}}>
        + New Effect
      </button>
      <div className="list">
        {bundleData.effects?.map(effectName => (
          <div key={effectName} className="card" onClick={() => navigate(`/bundle/${bundleName}/effects/${effectName}`)}>
            <h3>{effectName}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

function EffectEditView({ bundleName }: { bundleName: string }) {
  const { effectName } = useParams<{ effectName: string }>();
  const navigate = useNavigate();
  const [effectData, setEffectData] = useState<Effect | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectName) {
      setEffectData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setEffectData(null); // Clear old data immediately
    
    effectsApi.get(bundleName, effectName)
      .then(data => {
        setEffectData(data.effect);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading effect:', err);
        setLoading(false);
      });
  }, [bundleName, effectName]);

  async function handleSave(updatedEffect: Effect) {
    try {
      await effectsApi.save(bundleName, effectName!, updatedEffect);
      navigate(`/bundle/${bundleName}/effects`);
    } catch (error) {
      console.error('Error saving effect:', error);
      alert('Failed to save effect');
    }
  }

  if (loading) return <div>Loading effect...</div>;
  if (!effectData) return <div>Effect not found</div>;

  return (
    <EffectEditor
      bundleName={bundleName}
      effectData={effectData}
      onSave={handleSave}
      onCancel={() => navigate(`/bundle/${bundleName}/effects`)}
    />
  );
}

// Skills View
function SkillsView({ bundleName }: { bundleName: string }) {
  const navigate = useNavigate();
  const { bundleData } = useBundleData(bundleName);

  if (!bundleData) return <div>Loading...</div>;

  return (
    <div>
      <h2>Skills</h2>
      <button className="btn btn-primary" onClick={() => {/* TODO: create skill */}}>
        + New Skill
      </button>
      <div className="list">
        {bundleData.skills?.map(skillName => (
          <div key={skillName} className="card" onClick={() => navigate(`/bundle/${bundleName}/skills/${skillName}`)}>
            <h3>{skillName}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillEditView({ bundleName }: { bundleName: string }) {
  const { skillName } = useParams<{ skillName: string }>();
  const navigate = useNavigate();
  const [skillData, setSkillData] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (skillName) {
      skillsApi.get(bundleName, skillName)
        .then(data => {
          setSkillData(data.skill);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading skill:', err);
          setLoading(false);
        });
    }
  }, [bundleName, skillName]);

  async function handleSave(updatedSkill: Skill) {
    try {
      await skillsApi.save(bundleName, skillName!, updatedSkill);
      navigate(`/bundle/${bundleName}/skills`);
    } catch (error) {
      console.error('Error saving skill:', error);
      alert('Failed to save skill');
    }
  }

  if (loading) return <div>Loading skill...</div>;
  if (!skillData) return <div>Skill not found</div>;

  return (
    <SkillEditor
      bundleName={bundleName}
      skillData={skillData}
      onSave={handleSave}
      onCancel={() => navigate(`/bundle/${bundleName}/skills`)}
    />
  );
}

// Help Files View
function HelpFilesView({ bundleName }: { bundleName: string }) {
  const navigate = useNavigate();
  const { bundleData } = useBundleData(bundleName);

  if (!bundleData) return <div>Loading...</div>;

  return (
    <div>
      <h2>Help Files</h2>
      <button className="btn btn-primary" onClick={() => {/* TODO: create help file */}}>
        + New Help File
      </button>
      <div className="list">
        {bundleData.helpFiles?.map(helpName => (
          <div key={helpName} className="card" onClick={() => navigate(`/bundle/${bundleName}/help/${helpName}`)}>
            <h3>{helpName}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

function HelpFileEditView({ bundleName }: { bundleName: string }) {
  const { helpName } = useParams<{ helpName: string }>();
  const navigate = useNavigate();
  const [helpData, setHelpData] = useState<HelpFile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!helpName) {
      setHelpData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHelpData(null); // Clear old data immediately
    
    helpFilesApi.get(bundleName, helpName)
      .then(data => {
        setHelpData(data.help);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading help file:', err);
        setLoading(false);
      });
  }, [bundleName, helpName]);

  async function handleSave(updatedHelp: HelpFile) {
    try {
      await helpFilesApi.save(bundleName, helpName!, updatedHelp);
      navigate(`/bundle/${bundleName}/help`);
    } catch (error) {
      console.error('Error saving help file:', error);
      alert('Failed to save help file');
    }
  }

  if (loading) return <div>Loading help file...</div>;
  if (!helpData) return <div>Help file not found</div>;

  return (
    <HelpFileEditor
      bundleName={bundleName}
      helpData={helpData}
      onSave={handleSave}
      onCancel={() => navigate(`/bundle/${bundleName}/help`)}
    />
  );
}

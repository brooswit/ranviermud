import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRooms, useNPCs, useItems } from '../../hooks';
import { roomsApi, npcsApi, itemsApi } from '../../services/api';
import type { BundleData } from '../../types/bundle';
import type { TreeItemConfig } from '../../types/editor';
import TreeItem from './TreeItem';

interface ResourceTreeProps {
  bundleName: string;
  bundleData: BundleData | null;
}

interface AreaData {
  rooms: string[];
  npcs: string[];
  items: string[];
  quests: string[];
  lootPools: string[];
}

export default function ResourceTree({ bundleName, bundleData }: ResourceTreeProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [areaData, setAreaData] = useState<Record<string, AreaData>>({});

  // Auto-expand areas and sections (Rooms, NPCs, behaviors, etc.) that are in the current path
  useEffect(() => {
    const updates: Record<string, boolean> = {};
    if (location.pathname.includes('/behaviors')) {
      updates['behaviors'] = true;
      const typeMatch = location.pathname.match(/\/behaviors\/([^/]+)\/([^/]+)/);
      if (typeMatch) updates[`behaviors:${typeMatch[1]}`] = true;
    }
    const pathMatch = location.pathname.match(/\/areas\/([^/]+)/);
    if (pathMatch) {
      const areaName = pathMatch[1];
      const areaKey = `area:${areaName}`;
      updates.areas = true;
      updates[areaKey] = true;
      if (location.pathname.includes('/rooms/')) updates[`${areaKey}:rooms`] = true;
      if (location.pathname.includes('/npcs/')) updates[`${areaKey}:npcs`] = true;
      if (location.pathname.includes('/items/')) updates[`${areaKey}:items`] = true;
      if (location.pathname.includes('/quests/')) updates[`${areaKey}:quests`] = true;
      if (location.pathname.includes('/loot-pools/')) updates[`${areaKey}:loot-pools`] = true;
      setExpanded(prev => ({ ...prev, ...updates }));
      loadAreaData(areaName);
    } else if (Object.keys(updates).length > 0) {
      setExpanded(prev => ({ ...prev, ...updates }));
    }
  }, [location.pathname, bundleName]);

  const loadAreaData = async (areaName: string) => {
    if (areaData[areaName]) return; // Already loaded

    try {
      const [roomsRes, npcsRes, itemsRes, questsRes, lootPoolsRes] = await Promise.all([
        roomsApi.getAll(bundleName, areaName).catch(() => ({ rooms: [] })),
        npcsApi.getAll(bundleName, areaName).catch(() => ({ npcs: [] })),
        itemsApi.getAll(bundleName, areaName).catch(() => ({ items: [] })),
        fetch(`/api/bundles/${bundleName}/areas/${areaName}/quests`).catch(() => ({ ok: false })),
        fetch(`/api/bundles/${bundleName}/areas/${areaName}/loot-pools`).catch(() => ({ ok: false }))
      ]);

      // Parse quests and loot-pools
      let quests: string[] = [];
      let lootPools: string[] = [];
      if (questsRes.ok) {
        try {
          const questsData = await questsRes.json();
          quests = Array.isArray(questsData.quests) ? questsData.quests.map((q: any) => q.id || q.name) : [];
        } catch {}
      }

      if (lootPoolsRes.ok) {
        try {
          const lootPoolsData = await lootPoolsRes.json();
          lootPools = Array.isArray(lootPoolsData.lootPools) ? lootPoolsData.lootPools.map((lp: any) => lp.id || lp.name) : [];
        } catch {}
      }

      setAreaData(prev => ({
        ...prev,
        [areaName]: {
          rooms: roomsRes.rooms.map((r: any) => r.id || r.title || r),
          npcs: npcsRes.npcs.map((n: any) => n.id || n.name || n),
          items: itemsRes.items.map((i: any) => i.id || i.name || i),
          quests,
          lootPools
        }
      }));
    } catch (error) {
      console.error('Error loading area data:', error);
    }
  };

  const toggleExpanded = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    
    // If expanding an area, load its data
    if (key.startsWith('area:')) {
      const areaName = key.replace('area:', '');
      loadAreaData(areaName);
    }
  };

  if (!bundleData) {
    return <div className="tree">Loading...</div>;
  }

  const items: TreeItemConfig[] = [];

  // Areas
  if (bundleData.areas && bundleData.areas.length > 0) {
    const isExpanded = expanded['areas'] ?? false;
    items.push({
      label: 'Areas',
      icon: '📁',
      expandable: true,
      expanded: isExpanded,
      onClick: () => toggleExpanded('areas'),
      actions: [{ label: '+', onClick: () => {/* TODO: create area */} }],
      children: isExpanded ? bundleData.areas.map(area => {
        const areaKey = `area:${area}`;
        const isAreaExpanded = expanded[areaKey] ?? false;
        const data = areaData[area] || { rooms: [], npcs: [], items: [], quests: [], lootPools: [] };
        
        return {
          label: area,
          icon: '🗺️',
          expandable: true,
          expanded: isAreaExpanded,
          onClick: () => {
            toggleExpanded(areaKey);
            navigate(`/bundle/${bundleName}/areas/${area}`);
          },
          active: location.pathname.includes(`/areas/${area}`) && !location.pathname.match(/\/areas\/[^/]+\/(rooms|npcs|items|quests|loot-pools)\//),
          children: isAreaExpanded ? [
            {
              label: 'Rooms',
              icon: '🚪',
              expandable: true,
              expanded: expanded[`${areaKey}:rooms`] ?? false,
              onClick: () => toggleExpanded(`${areaKey}:rooms`),
              actions: [{ label: '+', onClick: () => {
                const roomId = prompt('Enter room ID:');
                if (roomId) {
                  navigate(`/bundle/${bundleName}/areas/${area}/rooms/${roomId}?new=true`);
                }
              } }],
              children: expanded[`${areaKey}:rooms`] ? data.rooms.map((roomId: string) => ({
                label: roomId,
                onClick: () => navigate(`/bundle/${bundleName}/areas/${area}/rooms/${roomId}`),
                active: location.pathname.includes(`/rooms/${roomId}`)
              })) : []
            },
            {
              label: 'NPCs',
              icon: '👤',
              expandable: true,
              expanded: expanded[`${areaKey}:npcs`] ?? false,
              onClick: () => toggleExpanded(`${areaKey}:npcs`),
              actions: [{ label: '+', onClick: () => {
                const npcId = prompt('Enter NPC ID:');
                if (npcId) {
                  navigate(`/bundle/${bundleName}/areas/${area}/npcs/${npcId}?new=true`);
                }
              } }],
              children: expanded[`${areaKey}:npcs`] ? data.npcs.map((npcId: string) => ({
                label: npcId,
                onClick: () => navigate(`/bundle/${bundleName}/areas/${area}/npcs/${npcId}`),
                active: location.pathname.includes(`/npcs/${npcId}`)
              })) : []
            },
            {
              label: 'Items',
              icon: '🎒',
              expandable: true,
              expanded: expanded[`${areaKey}:items`] ?? false,
              onClick: () => toggleExpanded(`${areaKey}:items`),
              actions: [{ label: '+', onClick: () => {
                const itemId = prompt('Enter item ID:');
                if (itemId) {
                  navigate(`/bundle/${bundleName}/areas/${area}/items/${itemId}?new=true`);
                }
              } }],
              children: expanded[`${areaKey}:items`] ? data.items.map((itemId: string) => ({
                label: itemId,
                onClick: () => navigate(`/bundle/${bundleName}/areas/${area}/items/${itemId}`),
                active: location.pathname.includes(`/items/${itemId}`)
              })) : []
            },
            {
              label: 'Quests',
              icon: '📜',
              expandable: true,
              expanded: expanded[`${areaKey}:quests`] ?? false,
              onClick: () => toggleExpanded(`${areaKey}:quests`),
              actions: [{ label: '+', onClick: () => {
                const questId = prompt('Enter quest ID:');
                if (questId) {
                  navigate(`/bundle/${bundleName}/areas/${area}/quests/${questId}?new=true`);
                }
              } }],
              children: expanded[`${areaKey}:quests`] ? (data.quests.length > 0 ? data.quests.map((questId: string) => ({
                label: questId,
                onClick: () => navigate(`/bundle/${bundleName}/areas/${area}/quests/${questId}`),
                active: location.pathname.includes(`/quests/${questId}`)
              })) : []) : []
            },
            {
              label: 'Loot Pools',
              icon: '💎',
              expandable: true,
              expanded: expanded[`${areaKey}:loot-pools`] ?? false,
              onClick: () => toggleExpanded(`${areaKey}:loot-pools`),
              actions: [{ label: '+', onClick: () => {
                const lootPoolId = prompt('Enter loot pool ID:');
                if (lootPoolId) {
                  navigate(`/bundle/${bundleName}/areas/${area}/loot-pools/${lootPoolId}?new=true`);
                }
              } }],
              children: expanded[`${areaKey}:loot-pools`] ? (data.lootPools.length > 0 ? data.lootPools.map((lootPoolId: string) => ({
                label: lootPoolId,
                onClick: () => navigate(`/bundle/${bundleName}/areas/${area}/loot-pools/${lootPoolId}`),
                active: location.pathname.includes(`/loot-pools/${lootPoolId}`)
              })) : []) : []
            }
          ] : []
        };
      }) : []
    });
  }

  // Classes
  if (bundleData.classes && bundleData.classes.length > 0) {
    const isExpanded = expanded['classes'] ?? false;
    items.push({
      label: 'Classes',
      icon: '⚔️',
      expandable: true,
      expanded: isExpanded,
      onClick: () => toggleExpanded('classes'),
      actions: [{ label: '+', onClick: () => {/* TODO: create class */} }],
      children: isExpanded ? bundleData.classes.map(className => ({
        label: className,
        onClick: () => navigate(`/bundle/${bundleName}/classes/${className}`),
        active: location.pathname.includes(`/classes/${className}`)
      })) : []
    });
  }

  // Behaviors (always show; when empty, clicking goes to behaviors view)
  const behaviorsList = bundleData.behaviors ?? [];
  const hasBehaviors = behaviorsList.length > 0;
  const behaviorsByType: Record<string, string[]> = {};
  behaviorsList.forEach(b => {
    if (!behaviorsByType[b.type]) behaviorsByType[b.type] = [];
    behaviorsByType[b.type].push(b.name);
  });
  const isBehaviorsExpanded = expanded['behaviors'] ?? false;
  const navigateToBehaviors = () => navigate(`/bundle/${bundleName}/behaviors`);

  items.push({
    label: 'Behaviors',
    icon: '🤖',
    expandable: hasBehaviors,
    expanded: isBehaviorsExpanded,
    onClick: hasBehaviors ? () => toggleExpanded('behaviors') : navigateToBehaviors,
    actions: [{ label: '+', onClick: navigateToBehaviors }],
    children: hasBehaviors && isBehaviorsExpanded ? Object.entries(behaviorsByType).map(([type, names]) => ({
      label: type,
      icon: '📁',
      expandable: true,
      expanded: expanded[`behaviors:${type}`] ?? false,
      onClick: () => toggleExpanded(`behaviors:${type}`),
      children: expanded[`behaviors:${type}`] ? names.map(name => ({
        label: name,
        onClick: () => navigate(`/bundle/${bundleName}/behaviors/${type}/${name}`),
        active: location.pathname.includes(`/behaviors/${type}/${name}`)
      })) : []
    })) : []
  });

  // Commands
  if (bundleData.commands && bundleData.commands.length > 0) {
    const isExpanded = expanded['commands'] ?? false;
    items.push({
      label: 'Commands',
      icon: '⌨️',
      expandable: true,
      expanded: isExpanded,
      onClick: () => toggleExpanded('commands'),
      actions: [{ label: '+', onClick: () => {/* TODO: create command */} }],
      children: isExpanded ? bundleData.commands.map(commandName => ({
        label: commandName,
        onClick: () => navigate(`/bundle/${bundleName}/commands/${commandName}`),
        active: location.pathname.includes(`/commands/${commandName}`)
      })) : []
    });
  }

  // Effects
  if (bundleData.effects && bundleData.effects.length > 0) {
    const isExpanded = expanded['effects'] ?? false;
    items.push({
      label: 'Effects',
      icon: '✨',
      expandable: true,
      expanded: isExpanded,
      onClick: () => toggleExpanded('effects'),
      actions: [{ label: '+', onClick: () => {/* TODO: create effect */} }],
      children: isExpanded ? bundleData.effects.map(effectName => ({
        label: effectName,
        onClick: () => navigate(`/bundle/${bundleName}/effects/${effectName}`),
        active: location.pathname.includes(`/effects/${effectName}`)
      })) : []
    });
  }

  // Skills
  if (bundleData.skills && bundleData.skills.length > 0) {
    const isExpanded = expanded['skills'] ?? false;
    items.push({
      label: 'Skills',
      icon: '⚡',
      expandable: true,
      expanded: isExpanded,
      onClick: () => toggleExpanded('skills'),
      actions: [{ label: '+', onClick: () => {/* TODO: create skill */} }],
      children: isExpanded ? bundleData.skills.map(skillName => ({
        label: skillName,
        onClick: () => navigate(`/bundle/${bundleName}/skills/${skillName}`),
        active: location.pathname.includes(`/skills/${skillName}`)
      })) : []
    });
  }

  // Root Files
  if (bundleData.rootFiles && bundleData.rootFiles.length > 0) {
    const isExpanded = expanded['rootFiles'] ?? false;
    items.push({
      label: 'Root Files',
      icon: '📄',
      expandable: true,
      expanded: isExpanded,
      onClick: () => toggleExpanded('rootFiles'),
      actions: [{ label: '+', onClick: () => {/* TODO: create root file */} }],
      children: isExpanded ? bundleData.rootFiles.map(fileName => ({
        label: fileName,
        onClick: () => navigate(`/bundle/${bundleName}/root-files/${fileName}`),
        active: location.pathname.includes(`/root-files/${fileName}`)
      })) : []
    });
  }

  // Lib Files
  if (bundleData.libFiles && bundleData.libFiles.length > 0) {
    const isExpanded = expanded['libFiles'] ?? false;
    items.push({
      label: 'Lib Files',
      icon: '📚',
      expandable: true,
      expanded: isExpanded,
      onClick: () => toggleExpanded('libFiles'),
      actions: [{ label: '+', onClick: () => {/* TODO: create lib file */} }],
      children: isExpanded ? bundleData.libFiles.map(fileName => ({
        label: fileName,
        onClick: () => navigate(`/bundle/${bundleName}/lib/${fileName}`),
        active: location.pathname.includes(`/lib/${fileName}`)
      })) : []
    });
  }

  // Help Files
  if (bundleData.helpFiles && bundleData.helpFiles.length > 0) {
    const isExpanded = expanded['helpFiles'] ?? false;
    items.push({
      label: 'Help Files',
      icon: '❓',
      expandable: true,
      expanded: isExpanded,
      onClick: () => toggleExpanded('helpFiles'),
      actions: [{ label: '+', onClick: () => {/* TODO: create help file */} }],
      children: isExpanded ? bundleData.helpFiles.map(helpName => ({
        label: helpName,
        onClick: () => navigate(`/bundle/${bundleName}/help/${helpName}`),
        active: location.pathname.includes(`/help/${helpName}`)
      })) : []
    });
  }

  return (
    <div className="tree" id="resource-tree">
      {items.map((item, index) => (
        <TreeItem key={index} config={item} />
      ))}
    </div>
  );
}

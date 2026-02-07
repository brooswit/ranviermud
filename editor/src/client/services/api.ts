import type { Bundle, BundleData } from '../types/bundle';
import type { Room, NPC, Item, MapData } from '../types/area';
import type {
  Class,
  Behavior,
  Command,
  Effect,
  Skill,
  RootFile,
  LibFile,
  QuestGoal,
  QuestReward,
  InputEvent,
  ServerEvent,
  HelpFile,
  JsonFile,
  Script
} from '../types/resource';
import type { AISummaryResponse, AIEditRequest, AIEditResponse, AIConfigEditRequest, AIConfigEditResponse } from '../types/editor';

export const API_BASE = '/api';

// Generic API error handler
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// Bundles API
export const bundlesApi = {
  getAll: async (): Promise<{ bundles: Bundle[] }> => {
    const response = await fetch(`${API_BASE}/bundles`);
    return handleResponse(response);
  },

  get: async (bundleName: string): Promise<BundleData> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}`);
    return handleResponse(response);
  },

  create: async (name: string): Promise<{ success: boolean; bundle: { name: string } }> => {
    const response = await fetch(`${API_BASE}/bundles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return handleResponse(response);
  },

  toggle: async (bundleName: string): Promise<{ success: boolean; active: boolean; bundle: { name: string } }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/toggle`, {
      method: 'PATCH'
    });
    return handleResponse(response);
  }
};

// Areas API
export const areasApi = {
  getAll: async (bundleName: string): Promise<{ areas: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas`);
    return handleResponse(response);
  },

  create: async (bundleName: string, name: string): Promise<{ success: boolean; area: { name: string } }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return handleResponse(response);
  }
};

// Rooms API
export const roomsApi = {
  getAll: async (bundleName: string, areaName: string): Promise<{ rooms: Room[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/rooms`);
    return handleResponse(response);
  },

  get: async (bundleName: string, areaName: string, roomId: string): Promise<{ room: Room }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/rooms/${roomId}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, areaName: string, room: Room): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, areaName: string, roomId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/rooms/${roomId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`Failed to delete room: ${response.status}`);
    }
  }
};

// NPCs API
export const npcsApi = {
  getAll: async (bundleName: string, areaName: string): Promise<{ npcs: NPC[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/npcs`);
    return handleResponse(response);
  },

  save: async (bundleName: string, areaName: string, npc: NPC): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/npcs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(npc)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, areaName: string, npcId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/npcs/${npcId}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Items API
export const itemsApi = {
  getAll: async (bundleName: string, areaName: string): Promise<{ items: Item[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/items`);
    return handleResponse(response);
  },

  save: async (bundleName: string, areaName: string, item: Item): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, areaName: string, itemId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/items/${itemId}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Quests API
export const questsApi = {
  getAll: async (bundleName: string, areaName: string): Promise<{ quests: any[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/quests`);
    return handleResponse(response);
  },

  save: async (bundleName: string, areaName: string, quest: any): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/quests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quest)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, areaName: string, questId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/quests/${questId}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Loot Pools API
export const lootPoolsApi = {
  getAll: async (bundleName: string, areaName: string): Promise<{ lootPools: any[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/loot-pools`);
    return handleResponse(response);
  },

  save: async (bundleName: string, areaName: string, lootPool: any): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/loot-pools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lootPool)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, areaName: string, lootPoolId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/loot-pools/${lootPoolId}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Map API
export const mapApi = {
  get: async (bundleName: string, areaName: string): Promise<MapData> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/map`);
    return handleResponse(response);
  }
};

// Classes API
export const classesApi = {
  getAll: async (bundleName: string): Promise<{ classes: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/classes`);
    return handleResponse(response);
  },

  get: async (bundleName: string, className: string): Promise<{ class: Class }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/classes/${className}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, className: string, classData: Class): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/classes/${className}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData)
    });
    return handleResponse(response);
  }
};

export const DEFAULT_BEHAVIOR_CONTENT = `'use strict';

module.exports = {
  listeners: {
    // Add your behavior listeners here (e.g. updateTick, init, etc.)
  }
};
`;

// Behaviors API
export const behaviorsApi = {
  getAll: async (bundleName: string): Promise<{ behaviors: { type: string; name: string }[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/behaviors`);
    return handleResponse(response);
  },

  get: async (bundleName: string, behaviorType: string, behaviorName: string): Promise<{ behavior: Behavior }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/behaviors/${behaviorType}/${behaviorName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, behaviorType: string, behaviorName: string, behaviorData: Behavior): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/behaviors/${behaviorType}/${behaviorName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(behaviorData)
    });
    return handleResponse(response);
  },

  create: async (bundleName: string, type: string, name: string, content: string = DEFAULT_BEHAVIOR_CONTENT, exampleConfig?: string): Promise<{ success: boolean }> => {
    return behaviorsApi.save(bundleName, type, name, { type, name, content, exampleConfig });
  },

  delete: async (bundleName: string, behaviorType: string, behaviorName: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/behaviors/${behaviorType}/${behaviorName}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Commands API
export const commandsApi = {
  getAll: async (bundleName: string): Promise<{ commands: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/commands`);
    return handleResponse(response);
  },

  get: async (bundleName: string, commandName: string): Promise<{ command: Command }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/commands/${commandName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, commandName: string, commandData: Command): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/commands/${commandName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commandData)
    });
    return handleResponse(response);
  }
};

// Effects API
export const effectsApi = {
  getAll: async (bundleName: string): Promise<{ effects: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/effects`);
    return handleResponse(response);
  },

  get: async (bundleName: string, effectName: string): Promise<{ effect: Effect }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/effects/${effectName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, effectName: string, effectData: Effect): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/effects/${effectName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(effectData)
    });
    return handleResponse(response);
  }
};

// Skills API
export const skillsApi = {
  getAll: async (bundleName: string): Promise<{ skills: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/skills`);
    return handleResponse(response);
  },

  get: async (bundleName: string, skillName: string): Promise<{ skill: Skill }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/skills/${skillName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, skillName: string, skillData: Skill): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/skills/${skillName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skillData)
    });
    return handleResponse(response);
  }
};

// Root Files API
export const rootFilesApi = {
  getAll: async (bundleName: string): Promise<{ rootFiles: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/root-files`);
    return handleResponse(response);
  },

  get: async (bundleName: string, fileName: string): Promise<{ file: RootFile }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/root-files/${fileName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, fileName: string, fileData: RootFile): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/root-files/${fileName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData)
    });
    return handleResponse(response);
  }
};

// Lib Files API
export const libFilesApi = {
  getAll: async (bundleName: string): Promise<{ libFiles: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/lib`);
    return handleResponse(response);
  },

  get: async (bundleName: string, fileName: string): Promise<{ lib: LibFile }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/lib/${fileName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, fileName: string, fileData: LibFile): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/lib/${fileName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData)
    });
    return handleResponse(response);
  }
};

// Quest Goals API
export const questGoalsApi = {
  getAll: async (bundleName: string): Promise<{ questGoals: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/quest-goals`);
    return handleResponse(response);
  },

  get: async (bundleName: string, goalName: string): Promise<{ questGoal: QuestGoal }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/quest-goals/${goalName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, goalName: string, goalData: QuestGoal): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/quest-goals/${goalName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalData)
    });
    return handleResponse(response);
  }
};

// Quest Rewards API
export const questRewardsApi = {
  getAll: async (bundleName: string): Promise<{ questRewards: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/quest-rewards`);
    return handleResponse(response);
  },

  get: async (bundleName: string, rewardName: string): Promise<{ questReward: QuestReward }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/quest-rewards/${rewardName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, rewardName: string, rewardData: QuestReward): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/quest-rewards/${rewardName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rewardData)
    });
    return handleResponse(response);
  }
};

// Input Events API
export const inputEventsApi = {
  getAll: async (bundleName: string): Promise<{ inputEvents: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/input-events`);
    return handleResponse(response);
  },

  get: async (bundleName: string, eventName: string): Promise<{ inputEvent: InputEvent }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/input-events/${eventName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, eventName: string, eventData: InputEvent): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/input-events/${eventName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    return handleResponse(response);
  }
};

// Server Events API
export const serverEventsApi = {
  getAll: async (bundleName: string): Promise<{ serverEvents: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/server-events`);
    return handleResponse(response);
  },

  get: async (bundleName: string, eventName: string): Promise<{ serverEvent: ServerEvent }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/server-events/${eventName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, eventName: string, eventData: ServerEvent): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/server-events/${eventName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    return handleResponse(response);
  }
};

// Help Files API
export const helpFilesApi = {
  getAll: async (bundleName: string): Promise<{ helpFiles: string[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/help`);
    return handleResponse(response);
  },

  get: async (bundleName: string, helpName: string): Promise<{ help: HelpFile }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/help/${helpName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, helpName: string, helpData: HelpFile): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/help/${helpName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: helpName, content: helpData.content })
    });
    return handleResponse(response);
  }
};

// JSON Files API
export const jsonFilesApi = {
  getAll: async (bundleName: string): Promise<{ jsonFiles: { type: string; name: string }[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/json-files`);
    return handleResponse(response);
  },

  get: async (bundleName: string, type: string, fileName: string): Promise<{ jsonFile: JsonFile }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/json-files/${type}/${fileName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, type: string, fileName: string, fileData: JsonFile): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/json-files/${type}/${fileName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData)
    });
    return handleResponse(response);
  }
};

// Scripts API
export const scriptsApi = {
  getAll: async (bundleName: string): Promise<{ scripts: { type: string; name: string }[] }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/scripts`);
    return handleResponse(response);
  },

  get: async (bundleName: string, scriptType: string, scriptName: string): Promise<{ script: Script }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/scripts/${scriptType}/${scriptName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, scriptType: string, scriptName: string, scriptData: Script): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/scripts/${scriptType}/${scriptName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scriptData)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, scriptType: string, scriptName: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/scripts/${scriptType}/${scriptName}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Area-specific item scripts API
export const itemScriptsApi = {
  get: async (bundleName: string, areaName: string, scriptName: string): Promise<{ script: Script }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/items/${scriptName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, areaName: string, scriptName: string, scriptData: Script): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/items/${scriptName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scriptData)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, areaName: string, scriptName: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/items/${scriptName}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Area-specific NPC scripts API
export const npcScriptsApi = {
  get: async (bundleName: string, areaName: string, scriptName: string): Promise<{ script: Script }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/npcs/${scriptName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, areaName: string, scriptName: string, scriptData: Script): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/npcs/${scriptName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scriptData)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, areaName: string, scriptName: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/npcs/${scriptName}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Area-specific room scripts API
export const roomScriptsApi = {
  get: async (bundleName: string, areaName: string, scriptName: string): Promise<{ script: Script }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/rooms/${scriptName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, areaName: string, scriptName: string, scriptData: Script): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/rooms/${scriptName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scriptData)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, areaName: string, scriptName: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/rooms/${scriptName}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Area-specific quest scripts API
export const questScriptsApi = {
  get: async (bundleName: string, areaName: string, scriptName: string): Promise<{ script: Script }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/quests/${scriptName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, areaName: string, scriptName: string, scriptData: Script): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/quests/${scriptName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scriptData)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, areaName: string, scriptName: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/quests/${scriptName}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// Area-specific loot pool scripts API
export const lootPoolScriptsApi = {
  get: async (bundleName: string, areaName: string, scriptName: string): Promise<{ script: Script }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/loot-pools/${scriptName}`);
    return handleResponse(response);
  },

  save: async (bundleName: string, areaName: string, scriptName: string, scriptData: Script): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/loot-pools/${scriptName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scriptData)
    });
    return handleResponse(response);
  },

  delete: async (bundleName: string, areaName: string, scriptName: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE}/bundles/${bundleName}/areas/${areaName}/scripts/loot-pools/${scriptName}`, {
      method: 'DELETE'
    });
    return handleResponse(response);
  }
};

// AI API
export const aiApi = {
  summarize: async (code: string): Promise<AISummaryResponse> => {
    const response = await fetch(`${API_BASE}/ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return handleResponse(response);
  },

  modify: async (request: AIEditRequest): Promise<AIEditResponse> => {
    const response = await fetch(`${API_BASE}/ai/modify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return handleResponse(response);
  },

  modifyConfig: async (request: AIConfigEditRequest): Promise<AIConfigEditResponse> => {
    const response = await fetch(`${API_BASE}/ai/modify-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return handleResponse(response);
  }
};

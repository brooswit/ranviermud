export interface Class {
  id: string;
  content: string;
}

export interface Behavior {
  type: string;
  name: string;
  content: string;
  /** Optional example YAML config for NPCs (stored as <name>.example.yml) */
  exampleConfig?: string;
}

export interface Command {
  name: string;
  content: string;
}

export interface Effect {
  name: string;
  content: string;
}

export interface Skill {
  name: string;
  content: string;
}

export interface RootFile {
  name: string;
  content: string;
}

export interface LibFile {
  name: string;
  content: string;
}

export interface QuestGoal {
  name: string;
  content: string;
}

export interface QuestReward {
  name: string;
  content: string;
}

export interface InputEvent {
  name: string;
  content: string;
}

export interface ServerEvent {
  name: string;
  content: string;
}

export interface HelpFile {
  name: string;
  content: string | object;
}

export interface JsonFile {
  type: 'root' | 'data';
  name: string;
  content: object | string;
}

export interface Script {
  type: string;
  name: string;
  content: string;
}

export type ResourceType = 
  | 'class'
  | 'behavior'
  | 'command'
  | 'effect'
  | 'skill'
  | 'root-file'
  | 'lib'
  | 'quest-goal'
  | 'quest-reward'
  | 'input-event'
  | 'server-event'
  | 'help'
  | 'json'
  | 'script';

export interface Resource {
  type: ResourceType;
  name: string;
  bundleName: string;
  areaName?: string;
  data?: any;
}

export interface Bundle {
  name: string;
  active?: boolean;
  path?: string;
  areas?: string[];
  classes?: string[];
  behaviors?: BehaviorRef[];
  commands?: string[];
  effects?: string[];
  skills?: string[];
  rootFiles?: string[];
  libFiles?: string[];
  questGoals?: string[];
  questRewards?: string[];
  inputEvents?: string[];
  serverEvents?: string[];
  helpFiles?: string[];
  jsonFiles?: JsonFileRef[];
  scripts?: ScriptRef[];
}

export interface BehaviorRef {
  type: string;
  name: string;
}

export interface JsonFileRef {
  type: 'root' | 'data';
  name: string;
}

export interface ScriptRef {
  type: string;
  name: string;
}

import { Bundle } from './bundle';
import { Room, NPC, Item, MapData } from './area';
import { ResourceType } from './resource';

export interface EditorState {
  currentBundle: string | null;
  currentArea: string | null;
  currentResourceType: ResourceType | null;
  selectedResource: ResourceSelection | null;
  showMap: boolean;
}

export interface ResourceSelection {
  type: ResourceType;
  id: string;
  name?: string;
  data?: Room | NPC | Item | any;
}

export interface BreadcrumbSegment {
  label: string;
  path?: string;
  onClick?: () => void;
}

export interface TreeItemConfig {
  label: string;
  icon?: string;
  onClick?: () => void;
  actions?: TreeItemAction[];
  active?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  children?: TreeItemConfig[];
}

export interface TreeItemAction {
  label: string;
  onClick: () => void;
}

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'yaml' | 'json';
  readOnly?: boolean;
  placeholder?: string;
}

export interface AISummaryResponse {
  summary: string;
  error?: string;
}

export interface AIEditRequest {
  code: string;
  prompt: string;
}

export interface AIEditResponse {
  code: string;
  error?: string;
}

export interface AIConfigEditRequest {
  config: object;
  resourceType?: string;
  prompt: string;
}

export interface AIConfigEditResponse {
  config: object;
  error?: string;
}

export interface BundleData extends Bundle {
  // Extended bundle data with all resource lists
}

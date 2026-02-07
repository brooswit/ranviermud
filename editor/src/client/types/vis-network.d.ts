declare module 'vis-network' {
  export class DataSet<T = any> {
    constructor(data?: T[]);
    add(data: T | T[]): string[];
    update(data: T | T[]): string[];
    remove(id: string | string[]): string[];
    get(id: string | string[]): T | T[];
    forEach(callback: (item: T) => void): void;
    map(callback: (item: T) => any): any[];
    filter(callback: (item: T) => boolean): T[];
  }

  export interface NetworkOptions {
    nodes?: any;
    edges?: any;
    physics?: any;
    interaction?: any;
    layout?: any;
  }

  export class Network {
    constructor(container: HTMLElement, data: { nodes: DataSet; edges: DataSet }, options?: NetworkOptions);
    on(event: string, callback: (params: any) => void): void;
    off(event: string, callback: (params: any) => void): void;
    destroy(): void;
  }
}

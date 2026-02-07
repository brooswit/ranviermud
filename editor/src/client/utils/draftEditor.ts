/**
 * Shared utilities for draft/saved state and per-field revert in editors.
 * Paths are dot-separated; a segment may use bracket notation for array indices,
 * e.g. "goals[0].config.title" (same as "goals.0.config.title").
 */

function parsePathSegment(segment: string): { key: string; index: number | null } {
  const match = segment.match(/^(\w+)\[(\d+)\]$/);
  if (match) return { key: match[1], index: parseInt(match[2], 10) };
  return { key: segment, index: null };
}

export function getValueAtPath(obj: any, path: string): any {
  if (!path) return obj;
  const segments = path.split('.');
  return segments.reduce((o, segment) => {
    if (o == null) return undefined;
    const { key, index } = parsePathSegment(segment);
    const val = o[key];
    return index !== null ? (Array.isArray(val) ? val[index] : undefined) : val;
  }, obj);
}

/**
 * Immutable update: returns a new object with value set at path.
 * Path is dot-separated (e.g. "behaviors.aggro.config.delay" or "goals[0].config.title").
 */
export function setValueAtPath<T>(obj: T, path: string, value: any): T {
  const segments = path.split('.');
  if (segments.length === 1) {
    const { key, index } = parsePathSegment(segments[0]);
    const o = obj as any;
    // When target is an array and segment is a numeric key (e.g. path "0"), update array element and return a new array instead of spreading into a plain object
    const numericKeyIndex = Array.isArray(o) && /^\d+$/.test(key) ? parseInt(key, 10) : null;
    if (numericKeyIndex !== null) {
      const arr = [...o];
      if (value === undefined) {
        arr.splice(numericKeyIndex, 1);
        return arr as T;
      }
      arr[numericKeyIndex] = value;
      return arr as T;
    }
    if (index !== null) {
      const arr = Array.isArray(o[key]) ? [...o[key]] : [];
      if (value === undefined) {
        arr.splice(index, 1);
        return (arr.length === 0 ? (() => { const { [key]: _, ...r } = o; return r as T; })() : { ...o, [key]: arr }) as T;
      }
      arr[index] = value;
      return { ...o, [key]: arr } as T;
    }
    if (value === undefined || value === '') {
      const { [key]: _, ...rest } = o;
      return rest as T;
    }
    return { ...o, [key]: value } as T;
  }
  const [head, ...tail] = segments;
  const restPath = tail.join('.');
  const { key, index } = parsePathSegment(head);
  const o = obj as any;
  const current = o[key];
  let next: any;
  if (index !== null) {
    const arr = Array.isArray(current) ? [...current] : [];
    const existing = arr[index];
    next = setValueAtPath(existing != null && typeof existing === 'object' ? existing : {}, restPath, value);
    if (next === existing && arr[index] !== undefined) return obj;
    arr[index] = next;
    next = arr;
  } else {
    next = setValueAtPath(current != null && typeof current === 'object' ? current : {}, restPath, value);
    if (next === current && o[key] !== undefined) return obj;
  }
  return { ...o, [key]: next } as T;
}

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

export function copyDeep<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

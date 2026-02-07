/**
 * NPC (and other entity) behaviors are specified in YAML as either:
 * - A toggle: `behaviorName: true` or `behaviorName: false` (boolean)
 * - A config:  `behaviorName: { key: value, ... }` (plain object)
 *
 * You can tell which case you have by inspecting the value at runtime.
 */

export type BehaviorValueKind = 'toggle' | 'config';

/**
 * Returns whether the behavior value is a toggle (true/false).
 * Toggles are booleans; everything else that is a plain object is a config.
 */
export function isBehaviorToggle(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Returns whether the behavior value is a config object.
 * Configs are plain objects (not null, not array). Booleans are toggles.
 */
export function isBehaviorConfig(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Classify a behavior value as either 'toggle' or 'config'.
 * Use this when you need a single discriminant (e.g. for switch or UI).
 */
export function getBehaviorValueKind(value: unknown): BehaviorValueKind {
  return isBehaviorToggle(value) ? 'toggle' : 'config';
}

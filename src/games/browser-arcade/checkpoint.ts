// Preserve entity prototypes and shared references (for example a lander's captive).
type Value = null | boolean | number | string | { ref: number };
interface Node {
  type: string;
  entries: [string, Value][];
}
interface Checkpoint {
  version: 1;
  id: string;
  nodes: Node[];
}
const infrastructure = new Set([
  'input',
  'sound',
  'soundEngine',
  'renderer',
  'canvas',
  'ctx',
]);
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export function checkpoint(
  id: string,
  game: object,
  classes: Record<string, { prototype: object }>,
): Checkpoint {
  const nodes: Node[] = [];
  const seen = new Map<object, number>();
  const encode = (value: unknown, root = false): Value => {
    if (value == null) return null;
    if (typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value !== 'object') throw new Error('Unsupported save value');
    const found = seen.get(value);
    if (found !== undefined) return { ref: found };
    const ref = nodes.length;
    seen.set(value, ref);
    const type = Array.isArray(value)
      ? 'Array'
      : value instanceof Uint8Array
        ? 'Uint8Array'
        : value instanceof Set
          ? 'Set'
          : value instanceof Map
            ? 'Map'
            : (Object.entries(classes).find(
                ([, ctor]) => Object.getPrototypeOf(value) === ctor.prototype,
              )?.[0] ?? 'Object');
    const node: Node = { type, entries: [] };
    nodes.push(node);
    const entries =
      value instanceof Set
        ? [...value].map((v, i) => [String(i), v] as const)
        : value instanceof Map
          ? [...value].map((v, i) => [String(i), v] as const)
          : Object.entries(value);
    for (const [key, entry] of entries) {
      if (
        (root && infrastructure.has(key)) ||
        typeof entry === 'function' ||
        entry === undefined
      )
        continue;
      if (forbidden.has(key)) throw new Error('Unsafe save key');
      node.entries.push([key, encode(entry)]);
    }
    return { ref };
  };
  encode(game, true);
  return { version: 1, id, nodes };
}
export function restore(
  id: string,
  game: object,
  payload: unknown,
  classes: Record<string, { prototype: object }>,
): boolean {
  try {
    if (!payload || typeof payload !== 'object') return false;
    const saved = payload as Checkpoint;
    if (
      saved.version !== 1 ||
      saved.id !== id ||
      !Array.isArray(saved.nodes) ||
      !saved.nodes.length ||
      saved.nodes.length > 10000
    )
      return false;
    const objects = saved.nodes.map((node) => {
      if (!node || !Array.isArray(node.entries) || node.entries.length > 100000)
        throw new Error('Invalid save');
      if (node.type === 'Array') return [];
      if (node.type === 'Uint8Array')
        return new Uint8Array(node.entries.length);
      if (node.type === 'Set') return new Set();
      if (node.type === 'Map') return new Map();
      if (node.type === 'Object') return {};
      const ctor = Object.getOwnPropertyDescriptor(classes, node.type)
        ? classes[node.type]
        : undefined;
      if (!ctor) throw new Error('Unknown entity');
      return Object.create(ctor.prototype) as object;
    });
    const decode = (value: Value): unknown => {
      if (
        value === null ||
        typeof value === 'boolean' ||
        typeof value === 'string'
      )
        return value;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (
        typeof value === 'object' &&
        Number.isInteger(value.ref) &&
        value.ref >= 0 &&
        value.ref < objects.length
      )
        return objects[value.ref];
      throw new Error('Invalid save reference');
    };
    const maps: [Map<unknown, unknown>, unknown][] = [];
    saved.nodes.forEach((node, i) => {
      for (const entry of node.entries) {
        if (!Array.isArray(entry) || entry.length !== 2)
          throw new Error('Invalid entry');
        const [key, value] = entry;
        if (
          typeof key !== 'string' ||
          forbidden.has(key) ||
          (i === 0 && infrastructure.has(key))
        )
          throw new Error('Unsafe save key');
        const target = objects[i],
          decoded = decode(value);
        if (target instanceof Set) target.add(decoded);
        else if (target instanceof Map) {
          maps.push([target, decoded]);
        } else
          Object.defineProperty(target, key, {
            value: decoded,
            writable: true,
            enumerable: true,
            configurable: true,
          });
      }
    });
    for (const [target, entry] of maps) {
      if (!Array.isArray(entry) || entry.length !== 2)
        throw new Error('Invalid map');
      target.set(entry[0], entry[1]);
    }
    const state = objects[0] as Record<string, unknown>;
    if (typeof state.state !== 'string' || typeof state.clock !== 'number')
      return false;
    // Root references must point to the live Game; its runtime services remain intact.
    const replace = (value: unknown): unknown =>
      value === objects[0] ? game : value;
    for (const object of objects) {
      if (object instanceof Set) {
        const entries = [...object];
        object.clear();
        for (const value of entries) object.add(replace(value));
      } else if (object instanceof Map) {
        const entries = [...object];
        object.clear();
        for (const [key, value] of entries)
          object.set(replace(key), replace(value));
      } else
        for (const [key, value] of Object.entries(object))
          (object as Record<string, unknown>)[key] = replace(value);
    }
    Object.assign(game, state);
    return true;
  } catch {
    return false;
  }
}

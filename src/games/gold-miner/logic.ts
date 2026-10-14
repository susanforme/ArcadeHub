export const WIDTH = 800;
export const HEIGHT = 600;
export const ORIGIN = { x: 400, y: 145 };
export const REST = 28;
export type MineralKind = 'gold' | 'diamond' | 'rock' | 'bag';
export interface Mineral {
  id: number;
  kind: MineralKind;
  x: number;
  y: number;
  radius: number;
  value: number;
  weight: number;
}
export interface MinerState {
  version: 1;
  phase: 'ready' | 'mining' | 'shop' | 'over';
  level: number;
  cash: number;
  score: number;
  target: number;
  remaining: number;
  angle: number;
  swing: 1 | -1;
  length: number;
  hook: 'swing' | 'out' | 'back';
  cargo: Mineral | null;
  minerals: Mineral[];
  dynamite: number;
  strength: boolean;
  polish: boolean;
}
export const SHOP = { dynamite: 180, strength: 260, polish: 300 };
export type ShopItem = keyof typeof SHOP;
export type MinerEvent =
  | 'cast'
  | 'grab'
  | 'collect'
  | 'blast'
  | 'clear'
  | 'over';

function field(level: number, random: () => number): Mineral[] {
  const types: MineralKind[] = [
    'gold',
    'rock',
    'gold',
    'bag',
    'gold',
    'rock',
    'diamond',
    'gold',
    'rock',
    'gold',
    'bag',
    'diamond',
    'gold',
    'diamond',
    'bag',
    'rock',
    'gold',
    'gold',
  ];
  // Shuffle the cells, keeping enough separation for the largest nuggets.
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types
    .map((kind, id) => {
      const large = kind === 'gold' && id % 3 === 0;
      const radius =
        kind === 'diamond' ? 15 : kind === 'bag' ? 20 : large ? 34 : 24;
      return {
        id,
        kind,
        x: 84 + (id % 6) * 126 + (random() - 0.5) * 32,
        y: 260 + Math.floor(id / 6) * 112 + (random() - 0.5) * 28,
        radius,
        value:
          kind === 'gold'
            ? large
              ? 500
              : 250
            : kind === 'diamond'
              ? 600
              : kind === 'rock'
                ? 20
                : 100 + Math.floor(random() * 5) * 100,
        weight:
          kind === 'rock'
            ? 5
            : large
              ? 4
              : kind === 'gold'
                ? 2.3
                : kind === 'bag'
                  ? 1.5
                  : 0.8,
      };
    })
    .map((mineral) => ({
      ...mineral,
      y: mineral.y + Math.min(level - 1, 5) * 3,
    }));
}
export function newMiner(random = Math.random): MinerState {
  return {
    version: 1,
    phase: 'ready',
    level: 1,
    cash: 0,
    score: 0,
    target: 650,
    remaining: 60,
    angle: -0.65,
    swing: 1,
    length: REST,
    hook: 'swing',
    cargo: null,
    minerals: field(1, random),
    dynamite: 1,
    strength: false,
    polish: false,
  };
}
export function hookPosition(state: MinerState) {
  return {
    x: ORIGIN.x + Math.sin(state.angle) * state.length,
    y: ORIGIN.y + Math.cos(state.angle) * state.length,
  };
}
export function buy(state: MinerState, item: ShopItem) {
  if (
    state.phase !== 'shop' ||
    state.cash < SHOP[item] ||
    (item !== 'dynamite' && state[item]) ||
    (item === 'dynamite' && state.dynamite >= 9)
  )
    return false;
  state.cash -= SHOP[item];
  if (item === 'dynamite') state.dynamite++;
  else state[item] = true;
  return true;
}
export function nextLevel(state: MinerState, random = Math.random) {
  if (state.phase !== 'shop') return;
  state.level++;
  state.target += Math.min(2200, 650 + (state.level - 1) * 150);
  state.remaining = 60;
  state.minerals = field(state.level, random);
  state.cargo = null;
  state.hook = 'swing';
  state.length = REST;
  state.phase = 'mining';
}
function endRound(state: MinerState, events: MinerEvent[]) {
  state.phase = state.cash >= state.target ? 'shop' : 'over';
  state.strength = false;
  state.polish = false;
  events.push(state.phase === 'shop' ? 'clear' : 'over');
}
export function stepMiner(
  state: MinerState,
  seconds: number,
  drop = false,
  blast = false,
): MinerEvent[] {
  const events: MinerEvent[] = [];
  if (state.phase === 'ready') {
    if (drop) state.phase = 'mining';
    return events;
  }
  if (state.phase !== 'mining') return events;
  if (drop && state.hook === 'swing') {
    state.hook = 'out';
    events.push('cast');
  }
  if (blast && state.hook === 'back' && state.cargo && state.dynamite > 0) {
    state.cargo = null;
    state.dynamite--;
    events.push('blast');
  }
  // Substeps prevent the hook tunnelling through small diamonds at low FPS.
  let elapsed = Math.max(0, Math.min(seconds, 0.1));
  while (elapsed > 0 && state.phase === 'mining') {
    const dt = Math.min(elapsed, 1 / 120, state.remaining);
    elapsed -= dt;
    state.remaining = Math.max(0, state.remaining - dt);
    if (state.hook === 'swing') {
      state.angle += state.swing * 0.85 * dt;
      if (Math.abs(state.angle) >= 1.22) {
        state.angle = Math.sign(state.angle) * 1.22;
        state.swing = state.angle > 0 ? -1 : 1;
      }
    } else if (state.hook === 'out') {
      const old = state.length;
      state.length += 360 * dt;
      const dx = Math.sin(state.angle),
        dy = Math.cos(state.angle);
      let first: Mineral | undefined;
      let distance = state.length;
      for (const mineral of state.minerals) {
        const x = mineral.x - ORIGIN.x,
          y = mineral.y - ORIGIN.y;
        const along = x * dx + y * dy;
        const across = x * dy - y * dx;
        const radius = mineral.radius + 6;
        if (Math.abs(across) > radius) continue;
        const hit = along - Math.sqrt(radius * radius - across * across);
        if (along >= old && hit <= distance && along + radius >= old) {
          first = mineral;
          distance = Math.max(old, hit);
        }
      }
      if (first) {
        state.length = distance;
        state.cargo = first;
        state.minerals = state.minerals.filter((item) => item.id !== first.id);
        state.hook = 'back';
        events.push('grab');
      } else {
        const p = hookPosition(state);
        if (p.x <= 22 || p.x >= WIDTH - 22 || p.y >= HEIGHT - 32)
          state.hook = 'back';
      }
    } else {
      const speed =
        (340 / (state.cargo?.weight ?? 1)) * (state.strength ? 1.85 : 1);
      state.length = Math.max(REST, state.length - speed * dt);
      if (state.length === REST) {
        if (state.cargo) {
          const value =
            state.cargo.value *
            (state.cargo.kind === 'diamond' && state.polish ? 1.5 : 1);
          state.cash += value;
          state.score += value;
          state.cargo = null;
          events.push('collect');
        }
        state.hook = 'swing';
      }
    }
    if (
      state.remaining === 0 ||
      (state.minerals.length === 0 && !state.cargo && state.hook === 'swing')
    )
      endRound(state, events);
  }
  return events;
}
export function finishDay(state: MinerState) {
  if (state.phase !== 'mining' || state.cash < state.target) return false;
  endRound(state, []);
  return true;
}
export function isMinerState(value: unknown): value is MinerState {
  if (!value || typeof value !== 'object') return false;
  const s = value as MinerState;
  const number = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const integer = (v: unknown, min: number, max: number) =>
    number(v, min, max) && Number.isInteger(v);
  const mineral = (m: Mineral) =>
    m &&
    integer(m.id, 0, 17) &&
    ['gold', 'diamond', 'rock', 'bag'].includes(m.kind) &&
    number(m.x, 40, 760) &&
    number(m.y, 210, 560) &&
    number(m.radius, 15, 34) &&
    integer(m.value, 20, 600) &&
    number(m.weight, 0.8, 5);
  return (
    s.version === 1 &&
    ['ready', 'mining', 'shop'].includes(s.phase) &&
    integer(s.level, 1, 1000000) &&
    integer(s.cash, 0, 1e12) &&
    integer(s.score, s.cash, 1e12) &&
    integer(s.target, 650, 1e12) &&
    number(s.remaining, 0, 60) &&
    number(s.angle, -1.22, 1.22) &&
    (s.swing === 1 || s.swing === -1) &&
    number(s.length, REST, 1000) &&
    ['swing', 'out', 'back'].includes(s.hook) &&
    integer(s.dynamite, 0, 9) &&
    typeof s.strength === 'boolean' &&
    typeof s.polish === 'boolean' &&
    Array.isArray(s.minerals) &&
    s.minerals.length <= 18 &&
    s.minerals.every(mineral) &&
    new Set(s.minerals.map((m) => m.id)).size === s.minerals.length &&
    (s.cargo === null ||
      (mineral(s.cargo) &&
        s.hook === 'back' &&
        !s.minerals.some((m) => m.id === s.cargo?.id))) &&
    (s.phase !== 'mining' || s.remaining > 0) &&
    (s.hook !== 'swing' || s.length === REST)
  );
}

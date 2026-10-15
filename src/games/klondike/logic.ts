export interface Card {
  id: number;
  up: boolean;
}
export interface KlondikeState {
  version: 1;
  stock: number[];
  waste: number[];
  foundations: number[][];
  tableau: Card[][];
  drawCount: 1 | 3;
  score: number;
  moves: number;
  seconds: number;
  timePenalties: number;
  passes: number;
  started: boolean;
  won: boolean;
}
export type Location =
  | { kind: 'stock' }
  | { kind: 'waste' }
  | { kind: 'foundation'; pile: number }
  | { kind: 'tableau'; pile: number; index: number };
export const rank = (id: number) => (id % 13) + 1;
export const suit = (id: number) => Math.floor(id / 13);
export const red = (id: number) => suit(id) === 1 || suit(id) === 2;
export function newGame(
  drawCount: 1 | 3 = 1,
  random: () => number = Math.random,
): KlondikeState {
  const stock = Array.from({ length: 52 }, (_, i) => i);
  for (let i = stock.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [stock[i], stock[j]] = [stock[j], stock[i]];
  }
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  // Deal left-to-right in successive rows, as in the Windows game.
  for (let row = 0; row < 7; row++) {
    for (let col = row; col < 7; col++) {
      tableau[col].push({ id: stock.pop() as number, up: col === row });
    }
  }
  return {
    version: 1,
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    drawCount,
    score: 0,
    moves: 0,
    seconds: 0,
    timePenalties: 0,
    passes: 0,
    started: false,
    won: false,
  };
}
function points(state: KlondikeState, amount: number) {
  state.score = Math.max(0, state.score + amount);
}
function acted(state: KlondikeState) {
  state.started = true;
  state.moves++;
}
export function drawStock(state: KlondikeState) {
  if (state.won) return false;
  if (state.stock.length) {
    for (let n = 0; n < state.drawCount && state.stock.length; n++)
      state.waste.push(state.stock.pop() as number);
  } else {
    if (!state.waste.length) return false;
    state.stock = state.waste.reverse();
    state.waste = [];
    state.passes++;
    if (state.drawCount === 1) points(state, -100);
    else if (state.passes >= 3) points(state, -20);
  }
  acted(state);
  return true;
}
export function selectedCards(
  state: KlondikeState,
  location: Location,
): number[] {
  if (location.kind === 'stock') return [];
  if (location.kind === 'waste') return state.waste.slice(-1);
  if (location.kind === 'foundation')
    return state.foundations[location.pile]?.slice(-1) ?? [];
  const pile = state.tableau[location.pile];
  if (!pile || location.index < 0 || !pile[location.index]?.up) return [];
  const cards = pile.slice(location.index);
  if (
    !cards.every(
      (card, i) =>
        card.up &&
        (i === 0 ||
          (rank(cards[i - 1].id) === rank(card.id) + 1 &&
            red(cards[i - 1].id) !== red(card.id))),
    )
  )
    return [];
  return cards.map((card) => card.id);
}
export function canMove(state: KlondikeState, from: Location, to: Location) {
  if (state.won || to.kind === 'stock' || to.kind === 'waste') return false;
  if (from.kind === to.kind && 'pile' in from && from.pile === to.pile)
    return false;
  const cards = selectedCards(state, from);
  if (!cards.length) return false;
  if (to.kind === 'foundation') {
    const pile = state.foundations[to.pile];
    if (!pile || cards.length !== 1) return false;
    const top = pile[pile.length - 1];
    return top === undefined
      ? rank(cards[0]) === 1
      : suit(cards[0]) === suit(top) && rank(cards[0]) === rank(top) + 1;
  }
  const pile = state.tableau[to.pile];
  if (!pile) return false;
  const top = pile[pile.length - 1];
  return !top
    ? rank(cards[0]) === 13
    : top.up &&
        red(top.id) !== red(cards[0]) &&
        rank(top.id) === rank(cards[0]) + 1;
}
export function move(state: KlondikeState, from: Location, to: Location) {
  if (
    !canMove(state, from, to) ||
    (to.kind !== 'foundation' && to.kind !== 'tableau')
  )
    return false;
  const cards = selectedCards(state, from);
  if (from.kind === 'waste') state.waste.pop();
  else if (from.kind === 'foundation') {
    state.foundations[from.pile].pop();
    points(state, -15);
  } else if (from.kind === 'tableau')
    state.tableau[from.pile].splice(from.index);
  if (to.kind === 'foundation') {
    state.foundations[to.pile].push(...cards);
    points(state, 10);
  } else {
    state.tableau[to.pile].push(...cards.map((id) => ({ id, up: true })));
    if (from.kind === 'waste') points(state, 5);
  }
  acted(state);
  state.won = state.foundations.every((pile) => pile.length === 13);
  if (state.won && state.seconds > 30)
    points(state, Math.floor(700000 / state.seconds));
  return true;
}
export function flip(state: KlondikeState, pileIndex: number) {
  const pile = state.tableau[pileIndex];
  const top = pile?.[pile.length - 1];
  if (!top || top.up || state.won) return false;
  top.up = true;
  points(state, 5);
  acted(state);
  return true;
}
export function advanceTime(state: KlondikeState, seconds: number) {
  if (!state.started || state.won || seconds <= 0) return;
  state.seconds += seconds;
  const penalties = Math.floor(state.seconds / 10);
  points(state, -2 * (penalties - state.timePenalties));
  state.timePenalties = penalties;
}
export function undoMove(
  current: KlondikeState,
  history: KlondikeState[],
): KlondikeState | undefined {
  const previous = history.pop();
  if (!previous) return undefined;
  previous.started = true;
  advanceTime(previous, Math.max(0, current.seconds - previous.seconds));
  points(previous, -2);
  // Earlier checkpoints must retain every undo penalty as well, otherwise
  // undoing twice would refund the first two-point penalty.
  for (const checkpoint of history) points(checkpoint, -2);
  return previous;
}
export function autoFoundation(state: KlondikeState, from: Location) {
  for (let pile = 0; pile < 4; pile++)
    if (move(state, from, { kind: 'foundation', pile })) return true;
  return false;
}
export function findHint(
  state: KlondikeState,
): { from: Location; to: Location } | null {
  const candidates: Location[] = [{ kind: 'waste' }];
  state.tableau.forEach((pile, p) => {
    pile.forEach((card, index) => {
      if (card.up) candidates.push({ kind: 'tableau', pile: p, index });
    });
  });
  for (const from of candidates) {
    for (let pile = 0; pile < 4; pile++) {
      const to: Location = { kind: 'foundation', pile };
      if (canMove(state, from, to)) return { from, to };
    }
  }
  for (const from of candidates) {
    for (let pile = 0; pile < 7; pile++) {
      if (
        from.kind === 'tableau' &&
        from.index === 0 &&
        !state.tableau[pile].length
      )
        continue;
      const to: Location = {
        kind: 'tableau',
        pile,
        index: state.tableau[pile].length,
      };
      if (canMove(state, from, to)) return { from, to };
    }
  }
  return null;
}
export function canAutoComplete(state: KlondikeState) {
  return (
    !state.won &&
    !state.stock.length &&
    !state.waste.length &&
    state.tableau.every((pile) => pile.every((card) => card.up))
  );
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const nat = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const cardId = (v: unknown): v is number => nat(v) && v < 52;
export function isKlondikeState(value: unknown): value is KlondikeState {
  if (
    !record(value) ||
    value.version !== 1 ||
    (value.drawCount !== 1 && value.drawCount !== 3) ||
    !nat(value.score) ||
    !nat(value.moves) ||
    !nat(value.passes) ||
    !nat(value.timePenalties) ||
    typeof value.seconds !== 'number' ||
    !Number.isFinite(value.seconds) ||
    value.seconds < 0 ||
    value.timePenalties !== Math.floor(value.seconds / 10) ||
    typeof value.started !== 'boolean' ||
    typeof value.won !== 'boolean'
  )
    return false;
  if (
    !Array.isArray(value.stock) ||
    !value.stock.every(cardId) ||
    !Array.isArray(value.waste) ||
    !value.waste.every(cardId) ||
    !Array.isArray(value.foundations) ||
    value.foundations.length !== 4 ||
    !Array.isArray(value.tableau) ||
    value.tableau.length !== 7
  )
    return false;
  const ids: number[] = [...value.stock, ...value.waste];
  for (const pile of value.foundations) {
    if (
      !Array.isArray(pile) ||
      pile.length > 13 ||
      !pile.every(
        (id, i) =>
          cardId(id) && rank(id) === i + 1 && suit(id) === suit(pile[0]),
      )
    )
      return false;
    ids.push(...pile);
  }
  for (const pile of value.tableau) {
    if (!Array.isArray(pile) || pile.length > 52) return false;
    let exposed = false;
    for (let i = 0; i < pile.length; i++) {
      const card = pile[i];
      if (!record(card) || !cardId(card.id) || typeof card.up !== 'boolean')
        return false;
      if (
        exposed &&
        (!card.up ||
          rank(pile[i - 1].id) !== rank(card.id) + 1 ||
          red(pile[i - 1].id) === red(card.id))
      )
        return false;
      exposed ||= card.up;
      ids.push(card.id);
    }
  }
  return (
    ids.length === 52 &&
    new Set(ids).size === 52 &&
    value.won === value.foundations.every((pile) => pile.length === 13)
  );
}

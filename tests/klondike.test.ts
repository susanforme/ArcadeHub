import { describe, expect, test } from '@rstest/core';
import {
  advanceTime,
  autoFoundation,
  canAutoComplete,
  canMove,
  drawStock,
  findHint,
  flip,
  isKlondikeState,
  move,
  newGame,
  selectedCards,
  undoMove,
} from '../src/games/klondike/logic';

function fixture() {
  const state = newGame();
  state.tableau = [[], [], [], [], [], [], []];
  state.foundations = [[], [], [], []];
  state.waste = [];
  state.stock = Array.from({ length: 52 }, (_, i) => i);
  return state;
}
describe('Klondike classic rules', () => {
  test('deals 28 unique cards with exactly seven exposed and 24 in stock', () => {
    const state = newGame(1, () => 0.37);
    expect(state.tableau.map((p) => p.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(state.tableau.flat().filter((c) => c.up)).toHaveLength(7);
    expect(state.stock).toHaveLength(24);
    expect(isKlondikeState(state)).toBe(true);
  });
  test('draw-three preserves ordering when the waste is recycled', () => {
    const state = newGame(3);
    const original = [...state.stock];
    drawStock(state);
    expect(state.waste).toEqual(original.slice(-3).reverse());
    for (let i = 0; i < 7; i++) drawStock(state);
    expect(state.stock).toHaveLength(0);
    drawStock(state);
    expect(state.stock).toEqual(original);
    expect(state.waste).toEqual([]);
    expect(state.passes).toBe(1);
  });
  test('repeated undo keeps previous undo penalties and elapsed time', () => {
    let state = newGame();
    state.score = 100;
    const history = [structuredClone(state)];
    drawStock(state);
    history.push(structuredClone(state));
    drawStock(state);
    const first = undoMove(state, history);
    if (!first) throw new Error('First undo should be available');
    state = first;
    expect(state.score).toBe(98);
    advanceTime(state, 12);
    expect(state.score).toBe(96);
    const second = undoMove(state, history);
    if (!second) throw new Error('Second undo should be available');
    state = second;
    expect(state.score).toBe(94);
    expect(state.seconds).toBe(12);
    expect(state.started).toBe(true);
    expect(state.stock).toHaveLength(24);
    expect(isKlondikeState(state)).toBe(true);
    expect(undoMove(state, history)).toBeUndefined();
  });
  test('tableau accepts descending alternating colors and moves the entire run', () => {
    const state = fixture();
    // Black king, red queen, black jack.
    state.tableau[0] = [{ id: 12, up: true }];
    state.tableau[1] = [
      { id: 24, up: true },
      { id: 10, up: true },
    ];
    const from = { kind: 'tableau', pile: 1, index: 0 } as const;
    const to = { kind: 'tableau', pile: 0, index: 1 } as const;
    expect(move(state, from, to)).toBe(true);
    expect(state.tableau[0].map((c) => c.id)).toEqual([12, 24, 10]);
    expect(state.tableau[1]).toEqual([]);
    expect(
      canMove(
        state,
        { kind: 'tableau', pile: 0, index: 1 },
        { kind: 'tableau', pile: 2, index: 0 },
      ),
    ).toBe(false);
  });
  test('hidden cards and invalid runs cannot be moved; flipping only exposes the top', () => {
    const state = fixture();
    state.tableau[0] = [
      { id: 3, up: false },
      { id: 12, up: false },
    ];
    expect(
      selectedCards(state, { kind: 'tableau', pile: 0, index: 1 }),
    ).toEqual([]);
    expect(flip(state, 0)).toBe(true);
    expect(state.tableau[0][0].up).toBe(false);
    expect(state.score).toBe(5);
    expect(flip(state, 0)).toBe(false);
    state.tableau[0].push({ id: 11, up: true });
    expect(
      selectedCards(state, { kind: 'tableau', pile: 0, index: 1 }),
    ).toEqual([]);
  });
  test('foundations require an Ace followed by ascending cards in the same suit', () => {
    const state = fixture();
    state.waste = [13];
    expect(autoFoundation(state, { kind: 'waste' })).toBe(true);
    expect(state.foundations[0]).toEqual([13]);
    state.waste = [1];
    expect(
      move(state, { kind: 'waste' }, { kind: 'foundation', pile: 0 }),
    ).toBe(false);
    state.waste = [14];
    expect(
      move(state, { kind: 'waste' }, { kind: 'foundation', pile: 0 }),
    ).toBe(true);
    expect(state.score).toBe(20);
  });
  test('a legal return from a foundation deducts standard points', () => {
    const state = fixture();
    state.score = 30;
    state.foundations[0] = [0, 1];
    state.tableau[0] = [{ id: 15, up: true }];
    expect(
      move(
        state,
        { kind: 'foundation', pile: 0 },
        { kind: 'tableau', pile: 0, index: 1 },
      ),
    ).toBe(true);
    expect(state.score).toBe(15);
  });
  test('the timer starts on the first move and charges a penalty only once per interval', () => {
    const state = newGame();
    state.score = 20;
    advanceTime(state, 100);
    expect(state.seconds).toBe(0);
    drawStock(state);
    advanceTime(state, 10);
    advanceTime(state, 0.5);
    expect(state.score).toBe(18);
    expect(state.timePenalties).toBe(1);
    expect(isKlondikeState(state)).toBe(true);
  });
  test('completing all four suits is a win and stops further moves', () => {
    const state = fixture();
    state.stock = [];
    state.foundations = Array.from({ length: 4 }, (_, suit) =>
      Array.from({ length: suit === 3 ? 12 : 13 }, (_, i) => suit * 13 + i),
    );
    state.tableau[0] = [{ id: 51, up: true }];
    expect(canAutoComplete(state)).toBe(true);
    const hint = findHint(state);
    expect(hint?.to).toEqual({ kind: 'foundation', pile: 3 });
    expect(autoFoundation(state, { kind: 'tableau', pile: 0, index: 0 })).toBe(
      true,
    );
    expect(state.won).toBe(true);
    expect(isKlondikeState(state)).toBe(true);
    expect(drawStock(state)).toBe(false);
  });
  test('saved decks reject missing/duplicate cards, hidden gaps and nonfinite timing', () => {
    const state = newGame();
    expect(isKlondikeState(JSON.parse(JSON.stringify(state)))).toBe(true);
    expect(isKlondikeState({ ...state, seconds: Infinity })).toBe(false);
    expect(
      isKlondikeState({ ...state, stock: [...state.stock, state.stock[0]] }),
    ).toBe(false);
    expect(isKlondikeState({ ...state, stock: state.stock.slice(1) })).toBe(
      false,
    );
    state.tableau[1][0].up = true;
    state.tableau[1][1].up = false;
    expect(isKlondikeState(state)).toBe(false);
  });
});

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import source from '../src/games/sokoban/collections/SOURCE.json';
import {
  collections,
  type Level,
  levels,
  parseCollection,
  parseLevel,
} from '../src/games/sokoban/levels';
import {
  cornered,
  isSokobanState,
  moveSokoban,
  neighbor,
  newSokoban,
  nextLevel,
  type SokobanState,
  scoreFor,
  solved,
  undoSokoban,
} from '../src/games/sokoban/logic';
import solutions from './fixtures/sokoban-solutions.json';

function start(map: Level): SokobanState {
  return { ...newSokoban(), player: map.player, boxes: [...map.boxes] };
}
function replay(state: SokobanState, steps: string) {
  for (const step of steps) {
    const direction = ({ L: 'LEFT', R: 'RIGHT', U: 'UP', D: 'DOWN' } as const)[
      step as 'L' | 'R' | 'U' | 'D'
    ];
    const next = moveSokoban(state, direction);
    expect(next, `${state.levelId}: ${step} must be legal`).not.toBe(state);
    state = next;
  }
  return state;
}
const firstSolution = solutions['microban-ii-1'];

describe('Sokoban community catalog', () => {
  test('discovers the puzzle plugin and its touch actions', () => {
    const game = games.find((game) => game.id === 'sokoban');
    expect(game?.category).toBe('categories.puzzle');
    expect(
      game?.virtualGamepad?.buttons?.map((button) => button.action),
    ).toEqual(['START', 'SPECIAL']);
  });
  test('ships the two complete, unmodified upstream collections', () => {
    expect(collections.map((c) => c.levels.length)).toEqual([135, 50]);
    expect(levels).toHaveLength(185);
    expect(new Set(levels.map((level) => level.id)).size).toBe(185);
    for (const file of source.files) {
      const bytes = readFileSync(
        `${process.cwd()}/src/games/sokoban/collections/${file.file}`,
      );
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        file.sha256,
      );
      const text = bytes.toString('utf8');
      const rows = text.split(/\r?\n/).filter((line) => line.includes('#'));
      const collection = collections.find(
        (c) => c.levels.length === file.levels,
      );
      const parsed = collection?.levels.flatMap((level) => level.rows) ?? [];
      expect(parsed).toHaveLength(rows.length);
      parsed.forEach((row, index) => {
        expect(row.replace(/_/g, ' ').trimEnd()).toBe(rows[index].trimEnd());
      });
    }
  });
  test('all community maps initialize valid saves, keeping original numbers and names', () => {
    levels.forEach((level, index) => {
      expect(isSokobanState(newSokoban(index)), level.id).toBe(true);
      expect(level.floor).not.toContain(0);
      expect(level.boxes).toHaveLength(level.goals.length);
    });
    expect(levels[131].title).toBe('The Mixer');
    expect(levels[134].id).toBe('microban-ii-135');
    expect(levels[135].id).toBe('sasquatch-1');
    expect(levels[184].title).toBe('Particle Theory');
  });
  test('supports ragged rows and exterior void without creating new floor', () => {
    const map = parseLevel(['  ####', '###  #', '#@$. #', '######']);
    expect(map.rows[0]).toBe('__####');
    expect(map.floor).not.toContain(0);
    expect(neighbor(map, 0, 'RIGHT')).toBe(-1);
    expect(neighbor(map, 0, 'LEFT')).toBe(-1);
    const named = parseCollection(
      "; 1 'Example'\n#####\n#@$.#\n#####\n",
      'fixture',
      'Fixture',
    );
    expect(named[0].title).toBe('Example');
    expect(() =>
      parseCollection('; 2\n#####\n#@$.#\n#####', 'bad', 'Bad'),
    ).toThrow();
  });
  test('walks and pushes once, blocks walls and multiple crates, and counts only legal moves', () => {
    const map = parseLevel(['#######', '#@$$..#', '#     #', '#######']);
    expect(moveSokoban(start(map), 'RIGHT', map)).toEqual(start(map));
    const walked = moveSokoban(start(map), 'DOWN', map);
    expect(walked.moves).toBe(1);
    expect(walked.pushes).toBe(0);
    const wall = parseLevel(['######', '# @$##', '# .  #', '######']);
    expect(moveSokoban(start(wall), 'RIGHT', wall)).toEqual(start(wall));
  });
  test('community solutions clear through actual legal moves and advance in original order', () => {
    for (const [id, solution] of Object.entries(solutions)) {
      const index = levels.findIndex((level) => level.id === id);
      const state = replay(newSokoban(index), solution);
      expect(solved(state, levels[index])).toBe(true);
      expect(scoreFor(state)).toBe(100);
      expect(isSokobanState(state)).toBe(true);
      expect(moveSokoban(state, 'UP')).toBe(state);
    }
    expect(nextLevel(newSokoban())).toEqual(newSokoban());
    const cleared = replay(newSokoban(), firstSolution);
    expect(nextLevel(cleared).levelId).toBe('microban-ii-2');
    expect(nextLevel(cleared).completed).toEqual(['microban-ii-1']);
  });
  test('undo preserves completed-puzzle credit, replays do not farm score, reset and selection keep completion', () => {
    const cleared = replay(newSokoban(), firstSolution);
    const undone = undoSokoban(cleared);
    expect(undone.moves).toBe(cleared.moves - 1);
    expect(solved(undone, levels[0])).toBe(false);
    expect(isSokobanState(undone)).toBe(true);
    expect(scoreFor(undone)).toBe(100);
    expect(scoreFor(replay(undone, firstSolution.slice(-1)))).toBe(100);
    expect(scoreFor(newSokoban(184, cleared.completed))).toBe(100);
    expect(scoreFor(newSokoban(184))).toBe(0);
    expect(newSokoban(0, cleared.completed).completed).toEqual(
      cleared.completed,
    );
    expect(undoSokoban(newSokoban())).toEqual(newSokoban());
  });
  test('only warns on non-goal corners and allows pushing a crate off a goal', () => {
    const map = parseLevel([
      '########',
      '# @* . #',
      '# $    #',
      '#      #',
      '########',
    ]);
    expect(moveSokoban(start(map), 'RIGHT', map).boxes).toContain(
      map.player + 2,
    );
    const corner = parseLevel(['######', '#@ $ #', '# .  #', '######']);
    const state = moveSokoban(
      moveSokoban(start(corner), 'RIGHT', corner),
      'RIGHT',
      corner,
    );
    expect(cornered(state, corner)).toBe(true);
    expect(cornered({ ...state, boxes: [corner.goals[0]] }, corner)).toBe(
      false,
    );
  });
  test('rejects old-map, mismatched-ID, corrupt and duplicate-completion saves', () => {
    const state = newSokoban();
    expect(isSokobanState(JSON.parse(JSON.stringify(state)))).toBe(true);
    for (const corrupt of [
      null,
      {},
      { ...state, version: 1 },
      { ...state, levelId: 'original-1' },
      { ...state, level: -1 },
      { ...state, level: 185 },
      { ...state, player: 0 },
      { ...state, boxes: [] },
      { ...state, boxes: [state.player, ...state.boxes.slice(1)] },
      { ...state, moves: -1 },
      { ...state, pushes: 2 },
      { ...state, history: [null] },
      { ...state, completed: ['missing'] },
      { ...state, completed: [state.levelId, state.levelId] },
    ])
      expect(isSokobanState(corrupt)).toBe(false);
    expect(
      isSokobanState({ ...state, boxes: [state.boxes[0], state.boxes[0]] }),
    ).toBe(false);
  });
  test('rejects malformed or unenclosed maps', () => {
    expect(() => parseLevel(['###', '#@#', '###'])).toThrow();
    expect(() => parseLevel(['#####', '#@$. ', '#####'])).toThrow();
    expect(() => parseLevel(['#####', '#@$.#', '#?  #', '#####'])).toThrow();
  });
});

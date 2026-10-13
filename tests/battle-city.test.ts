import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import {
  checkpoint,
  isCheckpoint,
  newBattle,
  stages,
} from '../src/games/battle-city/logic';
import Bullet from '../src/games/battle-city/vendor/engine/entities/Bullet';
import {
  expandBots,
  parseStage,
} from '../src/games/battle-city/vendor/engine/map/parseStage';
import TerrainMap from '../src/games/battle-city/vendor/engine/map/TerrainMap';
import { seededRandom } from '../src/games/battle-city/vendor/engine/random';
import { updateBullets } from '../src/games/battle-city/vendor/engine/systems/bullet';
import type { RawStageConfig } from '../src/games/battle-city/vendor/engine/types';
import EngineInput from '../src/games/battle-city/vendor/input/InputManager';

const audio = { play: () => {} };
function setup(twoPlayers = false, stage = 0) {
  const session = newBattle(
    audio,
    stage,
    twoPlayers,
    undefined,
    seededRandom(42),
  );
  const input = new EngineInput();
  const run = (ms: number) => {
    for (let i = 0; i < Math.ceil(ms / (1000 / 60)); i++) {
      session.step(1000 / 60, input);
      input.endTick();
    }
  };
  return { session, input, run };
}

describe('battle city integration', () => {
  test('discovers the game and loads all 35 valid classic stages', () => {
    expect(games.find((g) => g.id === 'battle-city')?.name).toBe('坦克大战');
    expect(stages).toHaveLength(35);
    stages.forEach((stage, i) => {
      expect(Number(stage.name)).toBe(i + 1);
      expect(stage.map).toHaveLength(13);
      const parsed = parseStage(stage);
      expect(parsed.eagle).not.toBeNull();
      expect(expandBots(parsed.bots)).toHaveLength(20);
    });
  });
  test('spawns both players with separate controls and three total lives', () => {
    const { session, input, run } = setup(true);
    run(2300);
    expect(session.phase).toBe('playing');
    const players =
      session.scene?.tanks.filter((t) => t.side === 'player') ?? [];
    expect(players).toHaveLength(2);
    expect(session.players.map((p) => p.lives)).toEqual([2, 2]);
    input.keyDown('KeyJ');
    input.keyDown('Slash');
    run(100);
    expect(
      session.scene?.bullets.filter((b) => b.side === 'player'),
    ).toHaveLength(2);
    input.keyUp('KeyJ');
    input.keyUp('Slash');
    const y = players[1].y;
    input.keyDown('ArrowUp');
    run(200);
    expect(players[1].y).toBeLessThan(y);
    expect(players[0].y).toBe(192);
  });
  test('destroying the eagle ends the game through GAME OVER', () => {
    const { session, run } = setup();
    run(2300);
    if (!session.scene) throw new Error('stage missing');
    session.scene.map.eagleBroken = true;
    run(17);
    expect(session.phase).toBe('gameover');
    run(5100);
    expect(session.phase).toBe('ended');
    expect(session.cleared).toBe(false);
  });
  test('restores stage opening scores, lives, upgrades and player count', () => {
    const { session } = setup(true, 12);
    session.players[0].score = 4200;
    session.players[0].lives = 1;
    session.players[0].reservedTankLevel = 'power';
    const saved = JSON.parse(JSON.stringify(checkpoint(session)));
    expect(isCheckpoint(saved)).toBe(true);
    const resumed = newBattle(audio, 0, false, saved);
    expect(checkpoint(resumed)).toEqual(saved);
    const input = new EngineInput();
    for (let i = 0; i < 140; i++) resumed.step(1000 / 60, input);
    expect(resumed.scene?.tanks.find((t) => t.side === 'player')?.level).toBe(
      'power',
    );
    expect(resumed.players[0].lives).toBe(1);
  });
  test('rejects malformed checkpoints before loading the engine', () => {
    expect(isCheckpoint(null)).toBe(false);
    expect(isCheckpoint({ version: 1, stageIndex: 35, players: [] })).toBe(
      false,
    );
    const valid = checkpoint(setup().session);
    expect(isCheckpoint({ ...valid, players: [null] })).toBe(false);
    expect(
      isCheckpoint({
        ...valid,
        players: [{ lives: -1, score: 0, level: null }],
      }),
    ).toBe(false);
    expect(isCheckpoint({ ...valid, stageIndex: 0.5 })).toBe(false);
    expect(
      isCheckpoint({
        ...valid,
        players: [{ lives: 3, score: 0, level: 'invalid' }],
      }),
    ).toBe(false);
  });
  test('bullets destroy brick, while steel requires upgraded firepower', () => {
    const raw: RawStageConfig = {
      name: 'test',
      difficulty: 1,
      bots: [],
      map: Array.from({ length: 13 }, (_, y) =>
        Array.from({ length: 13 }, (_, x) =>
          y === 2 && x === 2 ? 'Bf' : y === 2 && x === 4 ? 'Tf' : 'X',
        ).join(' '),
      ),
    };
    const map = TerrainMap.fromRaw(raw);
    const shot = (x: number, power: number) => {
      const bullets = [
        new Bullet({
          side: 'player',
          tankId: 1,
          direction: 'up',
          speed: 0.18,
          power,
          x,
          y: 49,
        }),
      ];
      updateBullets(bullets, map, [], audio, 17, [], []);
    };
    const before = map.bricks.filter(Boolean).length;
    shot(38, 1);
    expect(map.bricks.filter(Boolean).length).toBeLessThan(before);
    const steel = map.steels.filter(Boolean).length;
    shot(70, 1);
    expect(map.steels.filter(Boolean)).toHaveLength(steel);
    shot(70, 3);
    expect(map.steels.filter(Boolean).length).toBeLessThan(steel);
  });
});

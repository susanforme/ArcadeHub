import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import { checkpoint, restore } from '../src/games/browser-arcade/checkpoint';
import {
  controlsFor,
  EngineInputBridge,
} from '../src/games/browser-arcade/controls';
import type {
  ArcadeEngine,
  SoundHost,
} from '../src/games/browser-arcade/types';
import { InputManager } from '../src/shared/input';

const engines = import.meta.glob<ArcadeEngine>(
  '../src/games/*/vendor/engine.js',
  { eager: true, import: 'default' },
);
const audioNode: unknown = new Proxy(
  {
    currentTime: 0,
    sampleRate: 44100,
    length: 100,
    getChannelData: () => new Float32Array(100),
  },
  {
    get(target, key) {
      return key in target
        ? Reflect.get(target, key)
        : new Proxy(() => audioNode, {
            get: () => () => {},
            apply: () => audioNode,
          });
    },
    set(target, key, value) {
      Reflect.set(target, key, value);
      return true;
    },
  },
);
const host: SoundHost = {
  context: () => audioNode as AudioContext,
  destination: () => audioNode as AudioNode,
  after() {
    return {};
  },
  every() {
    return {};
  },
  cancel() {},
};
const originalContext = HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function () {
    return canvasFor(this.width || 1024, this.height || 768).getContext('2d');
  } as typeof originalContext;
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalContext;
});
function canvasFor(width: number, height: number) {
  const gradient = { addColorStop() {} };
  const context = new Proxy(
    {
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      getImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
      createImageData: () => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
    },
    {
      get(target, key) {
        return key in target ? Reflect.get(target, key) : () => {};
      },
      set(target, key, value) {
        Reflect.set(target, key, value);
        return true;
      },
    },
  );
  return {
    width,
    height,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
}
test('all games use the same Phaser plugin contract and retain source attribution', () => {
  expect(games).toHaveLength(19);
  const migrated = games.filter((game) => game.source);
  expect(migrated).toHaveLength(12);
  for (const game of games) {
    expect(typeof game.load).toBe('function');
    expect('nativeUrl' in game).toBe(false);
  }
  for (const game of migrated) {
    expect(
      readFileSync(`src/games/${game.id}/vendor/engine.js`, 'utf8'),
    ).not.toMatch(/requestAnimationFrame|addEventListener|localStorage/);
    expect(game.virtualGamepad?.buttons?.length).toBeGreaterThan(0);
    expect(
      readFileSync(`src/games/${game.id}/cover.png`).length,
    ).toBeGreaterThan(0);
  }
});
for (const [path, engine] of Object.entries(engines)) {
  const id = path.split('/').at(-3) as string;
  test(`${id}: starts, renders, advances and restores entity state without DOM listeners`, () => {
    expect(engine.config.width).toBeGreaterThan(0);
    expect(engine.config.height).toBeGreaterThan(0);
    const session = engine.create(
      canvasFor(engine.config.width, engine.config.height),
      host,
    );
    engine.render(session);
    const mapping = controlsFor(id);
    const controls = new InputManager(mapping.keys, mapping.buttons);
    const bridge = new EngineInputBridge(session.input, mapping.tokens);
    try {
      controls.press('START');
      bridge.tick(controls);
      engine.step(session, 1000 / 60);
      controls.release('START');
      bridge.tick(controls);
      engine.step(session, 1000 / 60);
      if (session.game.state === 'missionSelect') {
        controls.press('START');
        bridge.tick(controls);
        engine.step(session, 1000 / 60);
        controls.release('START');
      }
      expect(session.game.state).not.toBe('attract');
      for (let i = 0; i < 180; i++) {
        bridge.tick(controls);
        engine.step(session, 1000 / 60);
      }
      engine.render(session);
      const saved = checkpoint(id, session.game, engine.classes);
      const state = session.game.state,
        clock = session.game.clock;
      const resumed = engine.create(
        canvasFor(engine.config.width, engine.config.height),
        host,
      );
      expect(
        restore(id, resumed.game, structuredClone(saved), engine.classes),
      ).toBe(true);
      expect(resumed.game.state).toBe(state);
      expect(resumed.game.clock).toBe(clock);
      expect(engine.score(resumed)).toBe(engine.score(session));
      for (let i = 0; i < 60; i++) engine.step(resumed, 1000 / 60);
      engine.render(resumed);
    } finally {
      bridge.reset();
      controls.destroy();
    }
  });
}
test('checkpoint preserves prototypes, sets and cyclic entity references', () => {
  class Entity {
    target: unknown;
    move() {
      return 42;
    }
  }
  const captive = new Entity();
  const lander = new Entity();
  lander.target = captive;
  captive.target = lander;
  const game = {
    state: 'playing',
    clock: 1,
    entities: [lander, captive],
    active: new Set([lander]),
    targets: new Map([[lander, captive]]),
    terrain: new Uint8Array([10, 20, 30]),
    input: { runtime: true },
  };
  const classes = { Entity };
  const saved = checkpoint('test', game, classes);
  const restored = {
    state: 'attract',
    clock: 0,
    entities: [] as Entity[],
    active: new Set<Entity>(),
    targets: new Map<Entity, Entity>(),
    terrain: new Uint8Array(),
    input: { runtime: true },
  };
  expect(restore('test', restored, structuredClone(saved), classes)).toBe(true);
  expect(restored.entities[0].move()).toBe(42);
  expect(restored.entities[0].target).toBe(restored.entities[1]);
  expect(restored.entities[1].target).toBe(restored.entities[0]);
  expect(restored.active.has(restored.entities[0])).toBe(true);
  expect(restored.targets.get(restored.entities[0])).toBe(restored.entities[1]);
  expect(restored.terrain).toBeInstanceOf(Uint8Array);
  expect([...restored.terrain]).toEqual([10, 20, 30]);
  expect(restored.input).toEqual({ runtime: true });
});
test('corrupt and foreign checkpoints leave the live game intact', () => {
  const game = { state: 'attract', clock: 0 };
  expect(
    restore(
      'x',
      game,
      {
        version: 1,
        id: 'x',
        nodes: [{ type: 'Object', entries: [['__proto__', { ref: 0 }]] }],
      },
      {},
    ),
  ).toBe(false);
  expect(restore('x', game, { version: 1, id: 'y', nodes: [] }, {})).toBe(
    false,
  );
  expect(game).toEqual({ state: 'attract', clock: 0 });
});

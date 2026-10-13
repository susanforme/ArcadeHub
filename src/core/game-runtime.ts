import type Phaser from 'phaser';
import { listSaves } from '../shared/storage';
import { events } from './event-bus';
import { bindGameDisplay } from './game-display';
import { loadGame } from './game-loader';
import type { GameManifest } from './types';

class GameRuntime {
  private game?: Phaser.Game;
  private generation = 0;
  private destruction: Promise<void> = Promise.resolve();
  async start(parent: HTMLElement, manifest: GameManifest, resume: boolean) {
    const token = ++this.generation;
    events.emit('state', { score: 0, status: 'loading' });
    const [PhaserModule, plugin, saves] = await Promise.all([
      import('phaser'),
      loadGame(manifest),
      listSaves().catch(() => {
        events.emit('storageError', '本地存档不可用，本次仍可游玩。');
        return [];
      }),
    ]);
    await this.destruction;
    if (token !== this.generation) return;
    const Phaser = PhaserModule.default;
    const save = resume
      ? saves.find((save) => save.id === manifest.id)
      : undefined;
    const scenes = plugin.scenes.map((Scene) => new Scene());
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      ...plugin.config,
      backgroundColor: '#111b26',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      audio: { noAudio: true },
      callbacks: {
        preBoot: (game) => {
          game.registry.set('gameId', manifest.id);
        },
      },
    });
    const game = this.game;
    game.events.once('ready', () => {
      const updateScene = bindGameDisplay(game, parent, plugin.config);
      scenes.forEach((scene, index) => {
        const key = `${manifest.id}-${index}`;
        scene.sys.settings.key = key;
        game.scene.add(key, scene, false);
        scene.events.on('create', () => updateScene(scene));
      });
      game.scene.start(`${manifest.id}-0`, {
        snapshot: save?.snapshot,
        score: save?.score,
      });
      parent.querySelector('canvas')?.setAttribute('aria-label', manifest.name);
    });
  }
  stop() {
    ++this.generation;
    const game = this.game;
    this.game = undefined;
    if (game) {
      // Phaser destroys on the next frame; serialize launches to keep one live instance.
      this.destruction = new Promise((resolve) => {
        game.events.once('destroy', resolve);
        game.destroy(true);
      });
    }
  }
}
export const runtime = new GameRuntime();

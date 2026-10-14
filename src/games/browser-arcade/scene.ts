import Phaser from 'phaser';
import { SessionScene } from '../../core/session-scene';
import { listSaves } from '../../shared/storage';
import { SceneAudio } from './audio';
import { checkpoint, restore } from './checkpoint';
import { controlsFor, EngineInputBridge } from './controls';
import type { ArcadeEngine, EngineSession } from './types';

export function arcadeScene(id: string, engine: ArcadeEngine) {
  return class ArcadeScene extends SessionScene {
    private session!: EngineSession;
    private texture!: Phaser.Textures.CanvasTexture;
    private soundHost!: SceneAudio;
    private bridge!: EngineInputBridge;
    private accumulator = 0;
    create() {
      this.accumulator = 0;
      const mapping = controlsFor(id);
      this.inputBindings = mapping.keys;
      this.gamepadButtons = mapping.buttons;
      const key = `${id}-screen`;
      const texture = this.textures.createCanvas(
        key,
        engine.config.width,
        engine.config.height,
      );
      if (!texture) throw new Error(`Cannot create ${id} texture`);
      this.texture = texture;
      texture.setFilter(
        engine.config.pixelArt
          ? Phaser.Textures.FilterMode.NEAREST
          : Phaser.Textures.FilterMode.LINEAR,
      );
      this.add.image(0, 0, key).setOrigin(0);
      this.soundHost = new SceneAudio(this);
      this.session = engine.create(texture.getCanvas(), this.soundHost);
      this.bridge = new EngineInputBridge(this.session.input, mapping.tokens);
      if (restore(id, this.session.game, this.savedSnapshot, engine.classes))
        this.session.sound.init();
      this.score = engine.score(this.session);
      this.begin();
      const reset = this.controls.onReset(() => this.bridge.reset());
      void listSaves()
        .then((saves) => {
          const save = saves.find((save) => save.id === id);
          if (this.sys.isActive() && save && 'highScore' in this.session.game)
            this.session.game.highScore = Math.max(
              this.session.game.highScore ?? 0,
              save.bestScore,
            );
        })
        .catch(() => {});
      const point = (pointer: Phaser.Input.Pointer) => {
        if (this.status !== 'playing') return;
        if (id === 'missile-command') {
          const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          this.session.input.mouseX = Phaser.Math.Clamp(world.x / 3, 0, 255);
          this.session.input.mouseY = Phaser.Math.Clamp(world.y / 3, 16, 200);
        }
      };
      this.input.on('pointermove', point);
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        point(pointer);
        if (this.status !== 'playing') return;
        this.session.sound.init();
        const action =
          this.session.game.state === 'attract' ||
          this.session.game.state === 'missionSelect'
            ? 'START'
            : id === 'missile-command'
              ? 'DROP'
              : null;
        if (action) {
          this.controls.press(action, 'canvas');
          this.controls.release(action, 'canvas');
        }
      });
      this.events.once('shutdown', () => {
        reset();
        this.bridge.reset();
        this.soundHost.destroy();
        this.textures.remove(key);
      });
      this.draw();
    }
    update(_time: number, delta: number) {
      const playing = this.frame(delta);
      this.soundHost.setPaused(this.status === 'paused');
      if (!playing) {
        if (this.status === 'over' && this.controls.consume('START')) {
          this.scene.restart({ snapshot: null });
          return;
        }
        this.accumulator = 0;
        this.draw();
        return;
      }
      this.accumulator += Math.min(delta, 100);
      while (this.accumulator >= 1000 / 60) {
        this.bridge.tick(this.controls);
        if (id === 'missile-command') {
          const input = this.session.input;
          input.mouseX = Phaser.Math.Clamp(
            (input.mouseX ?? 128) +
              (Number(this.controls.down('RIGHT')) -
                Number(this.controls.down('LEFT'))) *
                3,
            0,
            255,
          );
          input.mouseY = Phaser.Math.Clamp(
            (input.mouseY ?? 100) +
              (Number(this.controls.down('DOWN')) -
                Number(this.controls.down('UP'))) *
                3,
            16,
            200,
          );
        }
        engine.step(this.session, 1000 / 60);
        this.accumulator -= 1000 / 60;
        if (this.session.game.state === 'gameOver') break;
      }
      const score = engine.score(this.session);
      if (score !== this.score) {
        this.score = score;
        this.publish();
      }
      this.draw();
      if (this.session.game.state === 'gameOver')
        this.finish('game.gameOver', false);
    }
    private draw() {
      engine.render(this.session);
      this.texture.refresh();
    }
    protected snapshot() {
      return checkpoint(id, this.session.game, engine.classes);
    }
  };
}

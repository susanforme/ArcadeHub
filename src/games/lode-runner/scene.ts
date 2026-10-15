import { Howl } from 'howler';
import Phaser from 'phaser';
import { useSettings } from '../../app/store';
import { SessionScene } from '../../core/session-scene';
import type { Action } from '../../core/types';
import { t } from '../../i18n';
import { images, sounds } from './assets';
import { levels } from './levels';
import { isLodeSnapshot } from './logic';
import { HEIGHT, LodeRenderer, WIDTH } from './render';
import { createLodeRunner, type LodeGame } from './vendor/engine';

const actions: [Action, number][] = [
  ['SPECIAL', 7],
  ['DROP', 8],
  ['UP', 3],
  ['DOWN', 4],
  ['LEFT', 1],
  ['RIGHT', 2],
];
export class LodeScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    ArrowUp: 'UP',
    KeyW: 'UP',
    ArrowDown: 'DOWN',
    KeyS: 'DOWN',
    KeyZ: 'SPECIAL',
    KeyJ: 'SPECIAL',
    KeyX: 'DROP',
    KeyK: 'DROP',
    Space: 'DROP',
    Enter: 'START',
    KeyR: 'SECONDARY',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  protected gamepadButtons = {
    0: 'DROP',
    1: 'SPECIAL',
    2: 'SECONDARY',
    9: 'PAUSE',
  } as const;
  private engine!: LodeGame;
  private boardRenderer!: LodeRenderer;
  private texture!: Phaser.Textures.CanvasTexture;
  private menu = true;
  private accumulator = 0;
  private audio = new Map<string, Howl>();
  private pausedSounds = new Set<string>();
  private soundPaused = false;
  preload() {
    for (const [name, source] of Object.entries(images))
      this.load.image(`lode-runner-${name}`, source);
  }
  create() {
    this.menu = true;
    this.accumulator = 0;
    this.audio.clear();
    this.pausedSounds.clear();
    this.soundPaused = false;
    const texture = this.textures.createCanvas(
      'lode-runner-screen',
      WIDTH,
      HEIGHT,
    );
    if (!texture) throw new Error('Cannot create Lode Runner canvas');
    this.texture = texture;
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, texture.key).setOrigin(0);
    this.boardRenderer = new LodeRenderer(
      texture.getContext(),
      Object.fromEntries(
        Object.keys(images).map((name) => [
          name,
          this.textures
            .get(`lode-runner-${name}`)
            .getSourceImage() as HTMLImageElement,
        ]),
      ),
    );
    this.engine = createLodeRunner({}, this.playSound);
    if (isLodeSnapshot(this.savedSnapshot)) {
      this.engine.restore(this.savedSnapshot);
      this.menu = false;
    }
    this.score = this.engine.score;
    this.begin();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.status !== 'playing' || !this.menu) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (point.y >= 345 && point.y <= 417) {
        if (point.x >= 240 && point.x <= 360) this.select(-1);
        if (point.x >= 760 && point.x <= 880) this.select(1);
      } else if (
        point.y >= 444 &&
        point.y <= 524 &&
        point.x >= 350 &&
        point.x <= 770
      ) {
        this.start();
      }
    });
    const stopLanguage = useSettings.subscribe((state, previous) => {
      if (state.language !== previous.language) this.draw();
    });
    this.events.once('shutdown', () => {
      stopLanguage();
      for (const sound of this.audio.values()) sound.unload();
      this.audio.clear();
      this.textures.remove(texture.key);
    });
    this.draw();
  }
  private playSound = (name: string, stop = false) => {
    if (!sounds[name]) return;
    if (stop) {
      this.audio.get(name)?.stop();
      return;
    }
    let sound = this.audio.get(name);
    if (!sound) {
      sound = new Howl({ src: [sounds[name]], volume: 0.65 });
      this.audio.set(name, sound);
    }
    sound.stop();
    sound.play();
  };
  private pauseSound(paused: boolean) {
    if (this.soundPaused === paused) return;
    this.soundPaused = paused;
    if (paused) {
      for (const [name, sound] of this.audio) {
        if (sound.playing()) {
          this.pausedSounds.add(name);
          sound.pause();
        }
      }
    } else {
      for (const name of this.pausedSounds) this.audio.get(name)?.play();
      this.pausedSounds.clear();
    }
  }
  private select(offset: number) {
    const level = (this.engine.level + offset + levels.length) % levels.length;
    this.engine = createLodeRunner({ level }, this.playSound);
    this.draw();
  }
  private start() {
    this.menu = false;
    this.controls.reset();
    this.publish(t('games.lodeRunner.instructions'));
    this.persist();
    this.draw();
  }
  update(_time: number, delta: number) {
    const playing = this.frame(delta);
    this.pauseSound(this.status === 'paused');
    if (!playing) {
      this.accumulator = 0;
      return;
    }
    if (this.menu) {
      if (this.controls.consume('LEFT')) this.select(-1);
      if (this.controls.consume('RIGHT')) this.select(1);
      if (
        this.controls.consume('DROP') ||
        this.controls.consume('START') ||
        this.controls.consume('SPECIAL')
      )
        this.start();
      return;
    }
    if (this.controls.consume('SECONDARY')) {
      this.engine.retry();
      this.draw();
      this.persist();
    }
    this.accumulator += Math.min(delta, 100);
    const phase = this.engine.phase;
    const level = this.engine.level;
    let stepped = false;
    while (this.accumulator >= 1000 / 23) {
      stepped = true;
      const action = actions.find(([key]) => this.controls.down(key))?.[1] ?? 0;
      this.engine.tick(action);
      this.accumulator -= 1000 / 23;
    }
    if (this.score !== this.engine.score || phase !== this.engine.phase) {
      this.score = this.engine.score;
      this.publish();
    }
    if (level !== this.engine.level || phase !== this.engine.phase)
      this.persist();
    if (stepped || phase !== this.engine.phase) this.draw();
    if (this.engine.phase === 'over' || this.engine.phase === 'won')
      this.finish(
        t(
          this.engine.phase === 'won'
            ? 'games.lodeRunner.won'
            : 'games.lodeRunner.gameOver',
        ),
        false,
      );
  }
  private draw() {
    this.boardRenderer.draw(this.engine, this.menu);
    this.texture.refresh();
  }
  protected snapshot() {
    return this.menu ? null : this.engine.snapshot();
  }
}

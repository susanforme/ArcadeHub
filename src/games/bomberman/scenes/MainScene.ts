import { Howl } from 'howler';
import Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import type { Action } from '../../../core/types';
import { t } from '../../../i18n';
import type { TranslationKey } from '../../../i18n/translate';
import { Audio } from '../../../shared/audio';
import { sprites } from '../assets';
import startSound from '../assets/apito.wav';
import bombSound from '../assets/Bomb2.wav';
import levelSound from '../assets/Level-1.mp3';
import placeSound from '../assets/Place Bomb2.wav';
import overSound from '../assets/Stage Complete.mp3';
import titleSound from '../assets/Title.mp3';
import { type BombermanEngine, createBomberman } from '../vendor/runtime';

const messages: Record<string, TranslationKey> = {
  start: 'games.bomberman.start',
  single: 'games.bomberman.single',
  multi: 'games.bomberman.multi',
  over: 'game.gameOver',
  winner: 'games.bomberman.winner',
  score: 'games.bomberman.finalScore',
  restart: 'games.bomberman.restart',
};
const actions: Action[] = [
  'LEFT',
  'RIGHT',
  'UP',
  'DOWN',
  'DROP',
  'MODE',
  'START',
  'P2_LEFT',
  'P2_RIGHT',
  'P2_UP',
  'P2_DOWN',
  'P2_FIRE',
];
export class MainScene extends SessionScene {
  private engine!: BombermanEngine;
  private texture!: Phaser.Textures.CanvasTexture;
  private accumulator = 0;
  private music!: Howl;
  private musicStarted = false;
  preload() {
    for (const [key, source] of Object.entries(sprites))
      this.load.image(`bomberman-${key}`, source);
  }
  create() {
    this.inputBindings = {
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      ArrowUp: 'UP',
      ArrowDown: 'DOWN',
      Space: 'DROP',
      Enter: 'START',
      KeyM: 'MODE',
      KeyA: 'P2_LEFT',
      KeyD: 'P2_RIGHT',
      KeyW: 'P2_UP',
      KeyS: 'P2_DOWN',
      KeyQ: 'P2_FIRE',
      Escape: 'PAUSE',
      KeyP: 'PAUSE',
    };
    this.gamepadButtons = { 0: 'DROP', 1: 'MODE', 9: 'START', 8: 'PAUSE' };
    this.accumulator = 0;
    this.musicStarted = false;
    const texture = this.textures.createCanvas('bomberman-screen', 750, 600);
    if (!texture) throw new Error('Cannot create Bomberman texture');
    this.texture = texture;
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, texture.key).setOrigin(0);
    const assets = Object.fromEntries(
      Object.keys(sprites).map((key) => [
        key,
        this.textures
          .get(`bomberman-${key}`)
          .getSourceImage() as CanvasImageSource,
      ]),
    );
    this.engine = createBomberman(
      texture.getCanvas(),
      assets,
      (key, values) => t(messages[key], values),
      (sound) => {
        const sources: Record<string, string> = {
          start: startSound,
          place: placeSound,
          explode: bombSound,
          over: overSound,
        };
        if (sources[sound]) Audio.playAsset(sources[sound]);
      },
    );
    this.engine.restore(this.savedSnapshot);
    this.score = this.engine.score;
    this.music = new Howl({
      src: [this.engine.phase === 'menu' ? titleSound : levelSound],
      loop: true,
    });
    this.begin();
    this.events.once('shutdown', () => {
      this.music.unload();
      this.textures.remove('bomberman-screen');
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.status !== 'playing' || this.engine.phase !== 'menu') return;
      const { y } = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const action = y >= 420 ? (y < 465 ? 'UP' : 'DOWN') : 'START';
      this.controls.press(action, 'canvas');
      this.controls.release(action, 'canvas');
    });
    this.draw();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.accumulator = 0;
      this.music.pause();
      this.draw();
      if (
        this.status === 'over' &&
        (this.controls.consume('START') || this.controls.consume('DROP'))
      )
        this.scene.restart({ snapshot: null });
      return;
    }
    const held: Partial<Record<Action, boolean>> = {};
    const pressed: Partial<Record<Action, boolean>> = {};
    for (const action of actions) {
      held[action] = this.controls.down(action);
      pressed[action] = this.controls.consume(action);
    }
    if (this.engine.players === 1 && this.engine.phase === 'playing') {
      for (const direction of ['LEFT', 'RIGHT', 'UP', 'DOWN'] as const)
        held[direction] ||= held[`P2_${direction}`];
      pressed.DROP ||= pressed.P2_FIRE;
    }
    if (
      Object.values(held).some(Boolean) ||
      Object.values(pressed).some(Boolean)
    )
      this.musicStarted = true;
    if (this.musicStarted && !this.music.playing()) this.music.play();
    const previous = this.engine.phase;
    // Process button edges once; movement, bombs and enemies all use the fixed simulation clock.
    this.accumulator += Math.min(delta, 100);
    this.engine.step({}, pressed, 0);
    while (this.accumulator >= 1000 / 60 && this.engine.phase !== 'over') {
      this.engine.step(held, {}, 1000 / 60);
      this.accumulator -= 1000 / 60;
    }
    if (previous === 'menu' && this.engine.phase === 'playing') {
      this.music.unload();
      this.music = new Howl({ src: [levelSound], loop: true });
      this.music.play();
    }
    if (this.score !== this.engine.score) {
      this.score = this.engine.score;
      this.publish();
    }
    this.draw();
    if (this.engine.phase === 'over') {
      this.music.stop();
      this.finish('game.gameOver', false);
    }
  }
  private draw() {
    this.engine.render();
    this.texture.refresh();
  }
  protected snapshot() {
    return this.engine.snapshot();
  }
}

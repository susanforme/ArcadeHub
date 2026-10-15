import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import type { Action } from '../../../core/types';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import boomSound from '../assets/boom.mp3';
import overSound from '../assets/over.mp3';
import sliceSound from '../assets/splatter.mp3';
import startSound from '../assets/start.mp3';
import throwSound from '../assets/throw.mp3';
import {
  type Fruit,
  type FruitKind,
  HEIGHT,
  intersects,
  isNinjaState,
  LIFE_SCORE,
  MAX_LIVES,
  type NinjaState,
  type NinjaSwipe,
  newNinja,
  newNinjaSwipe,
  type Point,
  sliceNinja,
  startNinja,
  stepNinja,
  WIDTH,
} from '../logic';

const files = import.meta.glob<string>('../assets/**/*.{png,jpg}', {
  eager: true,
  import: 'default',
  query: '?url',
});
const key = (name: string) => `fruit-ninja-${name}`;
const COLORS: Record<FruitKind, number> = {
  apple: 0xc8e925,
  banana: 0xffe269,
  basaha: 0xe43642,
  peach: 0xffb938,
  sandia: 0xe02d47,
};
type Effect = {
  object:
    | Phaser.GameObjects.Image
    | Phaser.GameObjects.Arc
    | Phaser.GameObjects.Text;
  vx: number;
  vy: number;
  gravity: number;
  spin: number;
  life: number;
  duration: number;
};
type Trail = Point & { life: number; pointer: number };

export class MainScene extends SessionScene {
  protected inputBindings = {
    Enter: 'START',
    Space: 'START',
    Escape: 'PAUSE',
    KeyP: 'PAUSE',
  } satisfies Record<string, Action>;
  protected gamepadButtons = {};
  private state!: NinjaState;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private effects: Effect[] = [];
  private contacts = new Map<number, { point: Point; swipe: NinjaSwipe }>();
  private trails: Trail[] = [];
  private blade!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private recoveryText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private misses: Phaser.GameObjects.Image[] = [];
  private panel!: Phaser.GameObjects.Container;
  private panelKey = '';
  private ring?: Phaser.GameObjects.Image;
  private flash = 0;
  private whiteout!: Phaser.GameObjects.Rectangle;

  preload() {
    for (const [path, url] of Object.entries(files)) {
      const name = path
        .split('/')
        .pop()
        ?.replace(/\.(png|jpg)$/, '');
      if (name) this.load.image(key(name), url);
    }
  }
  create() {
    this.state = isNinjaState(this.savedSnapshot)
      ? this.savedSnapshot
      : newNinja();
    this.state.combo = 0;
    this.score = this.state.score;
    this.sprites = new Map();
    this.effects = [];
    this.contacts = new Map();
    this.trails = [];
    this.misses = [];
    this.panelKey = '';
    this.flash = 0;
    this.add
      .image(WIDTH / 2, HEIGHT / 2, key('background'))
      .setDisplaySize(WIDTH, HEIGHT);
    this.add.rectangle(WIDTH / 2, 45, WIDTH, 90, 0x1c0d08, 0.3);
    this.add.image(38, 36, key('score')).setScale(1.25).setDepth(6);
    this.scoreText = this.text(68, 12, '', 45).setDepth(6);
    this.recoveryText = this.text(30, 66, '', 20, '#e7bf7e').setDepth(6);
    this.livesText = this.text(650, 25, '', 22, '#f4d68f')
      .setOrigin(1, 0)
      .setDepth(6);
    for (let i = 0; i < MAX_LIVES; i++) {
      this.misses.push(
        this.add
          .image(684 + i * 38, 35, key('x'))
          .setScale(1.5)
          .setDepth(6),
      );
    }
    this.hint = this.text(WIDTH / 2, HEIGHT - 28, '', 17, '#ead6ad')
      .setOrigin(0.5)
      .setDepth(6);
    this.blade = this.add.graphics().setDepth(12);
    this.whiteout = this.add
      .rectangle(400, 300, WIDTH, HEIGHT, 0xffffff)
      .setDepth(14)
      .setAlpha(0);
    this.panel = this.add.container(0, 0).setDepth(20);
    this.input.addPointer(2);
    this.input.on('pointerdown', this.down, this);
    this.input.on('pointermove', this.move, this);
    this.input.on('pointerup', this.up, this);
    this.input.on('pointerupoutside', this.up, this);
    this.input.on('gameout', this.resetBlade, this);
    this.game.canvas.addEventListener('pointercancel', this.resetBlade);
    this.game.canvas.addEventListener('touchcancel', this.resetBlade);
    this.begin();
    const offReset = this.controls.onReset(this.resetBlade);
    this.events.once('shutdown', () => {
      offReset();
      this.game.canvas.removeEventListener('pointercancel', this.resetBlade);
      this.game.canvas.removeEventListener('touchcancel', this.resetBlade);
      this.input.off('pointerdown', this.down, this);
      this.input.off('pointermove', this.move, this);
      this.input.off('pointerup', this.up, this);
      this.input.off('pointerupoutside', this.up, this);
      this.input.off('gameout', this.resetBlade, this);
    });
    this.draw();
  }
  update(_time: number, delta: number) {
    const active = this.frame(delta);
    if (this.controls.consume('START')) {
      if (this.status === 'over') this.scene.restart({ snapshot: null });
      else if (active) this.start();
    }
    const dt = Math.min(delta, 40) / 1000;
    if (active) {
      const wave = this.state.wave;
      const missed = stepNinja(this.state, dt);
      if (this.state.wave > wave) Audio.playAsset(throwSound);
      if (missed.length) {
        for (const fruit of missed) {
          this.effect(
            this.add
              .image(Math.max(35, Math.min(765, fruit.x)), 560, key('xf'))
              .setScale(2)
              .setDepth(7),
            0,
            -35,
            0,
            0,
            0.7,
          );
        }
      }
      if (this.ring?.active) this.ring.angle += dt * 20;
      this.settle();
    }
    if (this.status !== 'paused') {
      for (const effect of this.effects) {
        effect.life -= dt;
        effect.object.x += effect.vx * dt;
        effect.object.y += effect.vy * dt;
        effect.vy += effect.gravity * dt;
        effect.object.angle += effect.spin * dt;
        effect.object.setAlpha(
          Math.min(
            1,
            Math.max(0, effect.life / Math.min(0.4, effect.duration)),
          ),
        );
        if (effect.life <= 0) effect.object.destroy();
      }
      this.effects = this.effects.filter((effect) => effect.life > 0);
      for (const point of this.trails) point.life -= dt;
      this.trails = this.trails.filter((point) => point.life > 0);
      this.flash = Math.max(0, this.flash - dt * 2);
    }
    this.whiteout.setAlpha(this.flash);
    this.draw();
  }
  protected snapshot() {
    return this.state.phase === 'over' ? null : this.state;
  }
  private resetBlade = () => {
    this.contacts.clear();
    this.trails = [];
    this.state.combo = 0;
  };
  private start() {
    if (this.status !== 'playing' || !startNinja(this.state)) return;
    this.resetBlade();
    Audio.playAsset(startSound);
    this.persist();
    this.draw();
  }
  private down(pointer: Phaser.Input.Pointer) {
    if (this.status !== 'playing') return;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.contacts.set(pointer.id, { point, swipe: newNinjaSwipe() });
    this.trails.push({
      x: point.x,
      y: point.y,
      life: 0.16,
      pointer: pointer.id,
    });
  }
  private up(pointer: Phaser.Input.Pointer) {
    this.move(pointer);
    this.contacts.delete(pointer.id);
    if (!this.contacts.size) this.state.combo = 0;
  }
  private move(pointer: Phaser.Input.Pointer) {
    const contact = this.contacts.get(pointer.id);
    if (!contact || this.status !== 'playing') return;
    const from = contact.point;
    const to = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (
      !pointer.isDown &&
      pointer.event.type !== 'pointerup' &&
      pointer.event.type !== 'mouseup' &&
      pointer.event.type !== 'touchend'
    ) {
      this.contacts.delete(pointer.id);
      return;
    }
    contact.point = to;
    this.trails.push({ ...to, life: 0.16, pointer: pointer.id });
    if (this.trails.length > 120) this.trails.shift();
    if (this.state.phase === 'ready') {
      if (intersects(from, to, { x: 400, y: 333 }, 70)) this.start();
      return;
    }
    const result = sliceNinja(this.state, from, to, Math.random, contact.swipe);
    if (result.bomb) {
      Audio.playAsset(boomSound);
      this.flash = 1;
      this.cameras.main.shake(350, 0.015);
      this.settle();
      return;
    }
    if (!result.cut.length) return;
    Audio.playAsset(sliceSound);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    for (const fruit of result.cut) this.burst(fruit, angle);
    if (result.bonus) {
      const last = result.cut[result.cut.length - 1];
      this.floatText(
        last.x,
        last.y - 55,
        t('games.fruitNinja.combo', {
          count: result.combo,
          bonus: result.combo,
        }),
        '#ffdb57',
      );
    }
    for (const fruit of result.critical)
      this.floatText(
        fruit.x,
        fruit.y - 90,
        t('games.fruitNinja.critical'),
        '#ffac55',
      );
    if (result.recovered) {
      this.floatText(
        400,
        135,
        t('games.fruitNinja.recovered', { count: result.recovered }),
        '#b8ef80',
      );
      this.effect(
        this.add
          .image(400, 95, key('x'))
          .setTint(0xb8ef80)
          .setScale(2)
          .setDepth(11),
        0,
        -45,
        0,
        0,
        0.9,
      );
    }
    this.score = this.state.score;
    this.publish();
  }
  private settle() {
    if (this.state.phase !== 'over' || this.status === 'over') return;
    this.resetBlade();
    if (this.state.reason === 'miss') Audio.playAsset(overSound);
    this.finish(
      t(
        this.state.reason === 'bomb'
          ? 'games.fruitNinja.bombOver'
          : 'games.fruitNinja.missOver',
      ),
      false,
    );
  }
  private floatText(x: number, y: number, message: string, color: string) {
    this.effect(
      this.text(Math.max(130, Math.min(WIDTH - 130, x)), y, message, 27, color)
        .setOrigin(0.5)
        .setDepth(11),
      0,
      -45,
      0,
      0,
      0.9,
    );
  }
  private effect(
    object: Effect['object'],
    vx: number,
    vy: number,
    gravity: number,
    spin: number,
    duration: number,
  ) {
    this.effects.push({
      object,
      vx,
      vy,
      gravity,
      spin,
      duration,
      life: duration,
    });
  }
  private burst(fruit: Fruit, angle: number) {
    if (fruit.kind === 'boom') return;
    for (let side = 1; side <= 2; side++) {
      const sign = side === 1 ? -1 : 1;
      const half = this.add
        .image(fruit.x, fruit.y, key(`${fruit.kind}-${side}`))
        .setScale(1.25)
        .setRotation(angle + 0.7)
        .setDepth(5);
      this.effect(
        half,
        fruit.vx + sign * Math.sin(angle) * 140,
        -150 - sign * Math.cos(angle) * 100,
        750,
        sign * 130,
        1.1,
      );
    }
    const color = COLORS[fruit.kind];
    const stain = this.add
      .image(fruit.x, fruit.y, key('flash'))
      .setTint(color)
      .setRotation(angle)
      .setScale(1.5)
      .setAlpha(0.4)
      .setDepth(2);
    this.effect(stain, 0, 0, 0, 0, 0.3);
    for (let i = 0; i < 12; i++) {
      const direction = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 220;
      const drop = this.add
        .circle(fruit.x, fruit.y, 3 + Math.random() * 6, color)
        .setDepth(4);
      this.effect(
        drop,
        Math.cos(direction) * speed,
        Math.sin(direction) * speed,
        450,
        0,
        0.45 + Math.random() * 0.35,
      );
    }
  }
  private draw() {
    const ids = new Set(this.state.fruits.map((fruit) => fruit.id));
    for (const [id, sprite] of this.sprites) {
      if (!ids.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }
    for (const fruit of this.state.fruits) {
      let sprite = this.sprites.get(fruit.id);
      if (!sprite) {
        sprite = this.add
          .image(fruit.x, fruit.y, key(fruit.kind))
          .setScale(1.25)
          .setDepth(5);
        this.sprites.set(fruit.id, sprite);
      }
      sprite.setPosition(fruit.x, fruit.y).setAngle(fruit.angle);
    }
    this.scoreText.setText(`${this.state.score}`);
    this.recoveryText.setText(
      this.state.misses > 0 && this.state.phase !== 'over'
        ? t('games.fruitNinja.recoveryProgress', {
            points: LIFE_SCORE - (this.state.score % LIFE_SCORE),
          })
        : t('games.fruitNinja.recoveryRule'),
    );
    this.livesText.setText(
      t('games.fruitNinja.lives', {
        count: this.state.reason === 'bomb' ? 0 : MAX_LIVES - this.state.misses,
        max: MAX_LIVES,
      }),
    );
    this.hint.setText(t('games.fruitNinja.playHint'));
    this.hint.setAlpha(this.state.elapsed < 8 ? 0.85 : 0.35);
    this.misses.forEach((icon, i) => {
      icon.setTexture(key(i < this.state.misses ? 'xf' : 'x'));
    });
    this.blade.clear();
    const previous = new Map<number, Trail>();
    for (const point of this.trails) {
      const from = previous.get(point.pointer);
      if (from) {
        const alpha = point.life / 0.16;
        this.blade
          .lineStyle(12 * alpha, 0x85e8ff, alpha * 0.25)
          .lineBetween(from.x, from.y, point.x, point.y);
        this.blade
          .lineStyle(5 * alpha, 0xffffff, alpha)
          .lineBetween(from.x, from.y, point.x, point.y);
      }
      previous.set(point.pointer, point);
    }
    const language = t('games.fruitNinja.classic');
    const panelKey = `${this.state.phase}:${this.status}:${language}`;
    if (this.panelKey === panelKey) return;
    this.panelKey = panelKey;
    this.panel.removeAll(true);
    this.ring = undefined;
    if (this.state.phase === 'playing') return;
    this.panel.add(
      this.add.rectangle(
        400,
        300,
        WIDTH,
        HEIGHT,
        0x1d100b,
        this.state.phase === 'over' ? 0.82 : 0.12,
      ),
    );
    if (this.state.phase === 'ready') {
      this.panel.add(this.add.image(277, 135, key('logo')).setScale(0.95));
      this.panel.add(this.add.image(522, 148, key('ninja')).setScale(0.85));
      this.panel.add(
        this.text(400, 224, language, 20, '#f4d68f').setOrigin(0.5),
      );
      this.ring = this.add.image(400, 333, key('new-game'));
      this.panel.add(this.ring);
      this.panel.add(this.add.image(400, 333, key('sandia')).setScale(1.15));
      const button = this.add
        .zone(400, 333, 190, 190)
        .setInteractive({ useHandCursor: true });
      button.on('pointerup', () => this.start());
      this.panel.add(button);
      this.panel.add(
        this.text(400, 457, t('games.fruitNinja.startHint'), 21).setOrigin(0.5),
      );
      const examples: [string, number, string][] = [
        ['apple', 192, t('games.fruitNinja.ruleFruit')],
        ['boom', 400, t('games.fruitNinja.ruleBomb')],
        ['xf', 608, t('games.fruitNinja.ruleMiss')],
      ];
      for (const [image, x, label] of examples) {
        this.panel.add(
          this.add
            .image(x - 52, 531, key(image))
            .setScale(image === 'xf' ? 1.7 : 0.6),
        );
        this.panel.add(
          this.text(x - 22, 531, label, 16, '#f6dfb8').setOrigin(0, 0.5),
        );
      }
    } else {
      this.panel.add(
        this.text(
          400,
          175,
          t('games.fruitNinja.gameOver'),
          51,
          '#ffcd75',
        ).setOrigin(0.5),
      );
      this.panel.add(
        this.text(
          400,
          246,
          t(
            this.state.reason === 'bomb'
              ? 'games.fruitNinja.bombOver'
              : 'games.fruitNinja.missOver',
          ),
          22,
        ).setOrigin(0.5),
      );
      this.panel.add(this.add.image(340, 324, key('score')).setScale(1.7));
      this.panel.add(
        this.text(380, 323, `${this.state.score}`, 55).setOrigin(0, 0.5),
      );
      const button = this.add
        .rectangle(400, 430, 292, 62, 0x496c31)
        .setStrokeStyle(2, 0xb9ce78)
        .setInteractive({ useHandCursor: true });
      button.on('pointerup', () => this.scene.restart({ snapshot: null }));
      this.panel.add(button);
      this.panel.add(
        this.text(400, 430, t('games.fruitNinja.again'), 24).setOrigin(0.5),
      );
      this.panel.add(
        this.text(
          400,
          493,
          t('games.fruitNinja.restartHint'),
          17,
          '#d4bb93',
        ).setOrigin(0.5),
      );
    }
  }
  private text(
    x: number,
    y: number,
    text: string,
    size: number,
    color = '#fff2d4',
  ) {
    return this.add.text(x, y, text, {
      fontFamily: '"Noto Sans SC", system-ui, sans-serif',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      stroke: '#29150e',
      strokeThickness: 3,
      align: 'center',
    });
  }
}

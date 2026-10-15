import Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import arcade from '../assets/arcade.png';
import bubbles from '../assets/bubbles.png';
import characters from '../assets/characters.png';
import blue from '../assets/characters-blue.png';
import { LEVELS } from '../levels';
import {
  aimPath,
  type BubbleState,
  type Burst,
  fire,
  isBubbleState,
  LAUNCHER,
  LEFT,
  MAX_ANGLE,
  newBubbleState,
  PRESSURE_SHOTS,
  position,
  RIGHT,
  ROW_HEIGHT,
  stepBubble,
  swap,
  TOP,
} from '../logic';

const BUBBLES = 'puzzle-bobble-bubbles';
const CHARACTERS = 'puzzle-bobble-characters';
const BLUE = 'puzzle-bobble-blue';
const ARCADE = 'puzzle-bobble-arcade';
export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    Space: 'DROP',
    ArrowUp: 'DROP',
    KeyW: 'DROP',
    Enter: 'DROP',
    KeyX: 'SPECIAL',
    Escape: 'PAUSE',
    KeyP: 'PAUSE',
  } as const;
  protected gamepadButtons = { 0: 'DROP', 1: 'SPECIAL', 9: 'PAUSE' } as const;
  private state!: BubbleState;
  private pieces = new Map<number, Phaser.GameObjects.Image>();
  private current!: Phaser.GameObjects.Image;
  private next!: Phaser.GameObjects.Image;
  private projectile!: Phaser.GameObjects.Image;
  private arrow!: Phaser.GameObjects.Image;
  private base!: Phaser.GameObjects.Image;
  private bub!: Phaser.GameObjects.Image;
  private bob!: Phaser.GameObjects.Image;
  private guide!: Phaser.GameObjects.Graphics;
  private ceiling!: Phaser.GameObjects.TileSprite;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private nextLabel!: Phaser.GameObjects.Text;
  private pressure!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private panelKey = '';
  private elapsed = 0;
  private shotPose = 0;
  private flash = 0;
  private effects: {
    image: Phaser.GameObjects.Image;
    vx: number;
    vy: number;
    age: number;
    falling: boolean;
  }[] = [];

  preload() {
    this.load.image(BUBBLES, bubbles);
    this.load.image(CHARACTERS, characters);
    this.load.image(BLUE, blue);
    this.load.image(ARCADE, arcade);
  }
  create() {
    this.state = isBubbleState(this.savedSnapshot)
      ? this.savedSnapshot
      : newBubbleState();
    this.score = this.state.score;
    this.pieces = new Map();
    this.effects = [];
    this.panelKey = '';
    this.elapsed = this.shotPose = this.flash = 0;
    for (let color = 1; color <= 8; color++) {
      this.textures
        .get(BUBBLES)
        .add(`color-${color}`, 0, 11, 16 + (color - 1) * 26, 16, 16);
    }
    for (const texture of [CHARACTERS, BLUE]) {
      const atlas = this.textures.get(texture);
      for (let i = 0; i < 4; i++)
        atlas.add(`idle-${i}`, 0, 11 + i * 27, 42, 26, 28);
      atlas.add('shoot', 0, 200, 42, 26, 28);
      atlas.add('base', 0, 87, 213, 56, 24);
      atlas.add('arrow', 0, 15, 320, 22, 55);
      atlas.add('bag', 0, 358, 233, 56, 24);
    }
    this.textures.get(ARCADE).add('panel', 0, 0, 0, 160, 224);
    this.textures.get(ARCADE).add('metal', 0, 16, 0, 128, 16);
    for (const texture of [BUBBLES, CHARACTERS, BLUE, ARCADE])
      this.textures.get(texture).setFilter(Phaser.Textures.NEAREST);
    this.add.image(0, 48, ARCADE, 'panel').setOrigin(0).setScale(3);
    this.add.rectangle(240, 30, 480, 60, 0x091629);
    this.hud = this.text(24, 14, '', 20, '#fff49a');
    this.pressure = this.text(240, 98, '', 15, '#daeaff').setOrigin(0.5);
    this.ceiling = this.add
      .tileSprite(LEFT, TOP, RIGHT - LEFT, 1, ARCADE, 'metal')
      .setOrigin(0)
      .setTileScale(3);
    this.guide = this.add.graphics().setDepth(2);
    this.add.image(96, 670, CHARACTERS, 'bag').setScale(2.3);
    this.base = this.add.image(240, 667, CHARACTERS, 'base').setScale(3);
    this.arrow = this.add
      .image(LAUNCHER.x, LAUNCHER.y + 16, CHARACTERS, 'arrow')
      .setOrigin(0.5, 0.9)
      .setScale(2.25);
    this.bub = this.add.image(342, 670, CHARACTERS, 'idle-0').setScale(2.1);
    this.bob = this.add
      .image(408, 670, BLUE, 'idle-0')
      .setScale(2.1)
      .setFlipX(true);
    this.current = this.bubble(
      LAUNCHER.x,
      LAUNCHER.y,
      this.state.current,
    ).setDepth(4);
    this.next = this.bubble(100, 625, this.state.next)
      .setScale(2)
      .setDepth(4)
      .setInteractive({ useHandCursor: true });
    this.next.on('pointerdown', () => {
      if (this.status === 'playing') swap(this.state);
    });
    this.nextLabel = this.text(100, 591, '', 14, '#fff49a').setOrigin(0.5);
    this.projectile = this.bubble(0, 0, 1).setVisible(false).setDepth(4);
    this.hint = this.text(240, 707, '', 13).setOrigin(0.5);
    this.panel = this.add.container(0, 0).setDepth(20);
    const aim = (pointer: Phaser.Input.Pointer) => {
      if (
        this.status !== 'playing' ||
        this.state.phase !== 'playing' ||
        pointer.y > LAUNCHER.y - 20
      )
        return;
      this.state.angle = Phaser.Math.Clamp(
        Math.atan2(pointer.x - LAUNCHER.x, LAUNCHER.y - pointer.y),
        -MAX_ANGLE,
        MAX_ANGLE,
      );
    };
    this.input.on('pointermove', aim);
    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        objects: Phaser.GameObjects.GameObject[],
      ) => {
        if (
          objects.length ||
          this.status !== 'playing' ||
          this.state.phase !== 'playing' ||
          pointer.y < TOP ||
          pointer.y >= LAUNCHER.y - 20
        )
          return;
        aim(pointer);
        this.shoot();
      },
    );
    this.begin();
    this.draw();
  }
  update(_time: number, delta: number) {
    const active = this.frame(delta);
    const shoot = this.controls.consume('DROP');
    const exchange = this.controls.consume('SPECIAL');
    if (this.status === 'over') {
      if (shoot) this.scene.restart({ snapshot: null });
      return;
    }
    if (!active) return;
    const s = this.state;
    const dt = Math.min(delta, 100) / 1000;
    this.elapsed += dt;
    this.shotPose = Math.max(0, this.shotPose - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.updateEffects(dt);
    if (s.phase === 'clear') {
      if (shoot) this.nextLevel();
    } else {
      const direction =
        Number(this.controls.down('RIGHT')) -
        Number(this.controls.down('LEFT'));
      s.angle = Phaser.Math.Clamp(
        s.angle + direction * dt * 1.55,
        -MAX_ANGLE,
        MAX_ANGLE,
      );
      if (exchange) swap(s);
      if (shoot) this.shoot();
      const oldCeiling = s.ceiling;
      const wasFlying = !!s.shot;
      const bursts = stepBubble(s, dt);
      if (bursts.length) {
        this.burst(bursts, oldCeiling);
        Audio.play('eat');
      }
      if (wasFlying && !s.shot) {
        if (s.ceiling !== oldCeiling) {
          this.flash = 0.5;
          Audio.play('click');
        }
        this.score = s.score;
        this.publish();
        if (this.state.phase === 'clear') Audio.play('clear');
        if (s.phase === 'won') {
          Audio.play('clear');
          this.finish(t('games.puzzleBobble.won'), false);
        }
        if (s.phase === 'over') this.finish(t('games.puzzleBobble.over'));
        this.persist();
      }
    }
    this.draw();
  }
  protected snapshot() {
    return this.state.phase === 'over' || this.state.phase === 'won'
      ? null
      : this.state;
  }
  private shoot() {
    if (fire(this.state)) {
      Audio.play('click');
      this.shotPose = 0.3;
    }
  }
  private nextLevel() {
    this.state = newBubbleState(this.state.level + 1, this.state.score);
    this.persist();
    this.draw();
  }
  private text(
    x: number,
    y: number,
    value: string,
    size: number,
    color = '#eaf4ff',
  ) {
    return this.add.text(x, y, value, {
      fontFamily: 'monospace, "PingFang SC", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      stroke: '#11142e',
      strokeThickness: 2,
    });
  }
  private bubble(x: number, y: number, color: number) {
    return this.add.image(x, y, BUBBLES, `color-${color}`).setScale(3);
  }
  private burst(bursts: Burst[], ceiling: number) {
    for (const burst of bursts) {
      const p = position(burst.index, ceiling);
      const image = this.bubble(p.x, p.y, burst.color).setDepth(6);
      this.effects.push({
        image,
        vx: (Math.random() - 0.5) * 120,
        vy: burst.falling ? 60 : -70,
        age: 0,
        falling: burst.falling,
      });
    }
  }
  private updateEffects(dt: number) {
    this.effects = this.effects.filter((effect) => {
      effect.age += dt;
      effect.vy += dt * 900;
      effect.image.x += effect.vx * dt;
      effect.image.y += effect.vy * dt;
      if (!effect.falling)
        effect.image
          .setAlpha(Math.max(0, 1 - effect.age / 0.3))
          .setScale(3 + effect.age * 5);
      if (effect.age > (effect.falling ? 1 : 0.3)) {
        effect.image.destroy();
        return false;
      }
      return true;
    });
  }
  private draw() {
    const s = this.state;
    this.hud.setText(
      t('games.puzzleBobble.hud', {
        level: s.level,
        total: LEVELS.length,
        score: s.score,
      }),
    );
    this.pressure.setText(
      t('games.puzzleBobble.pressure', {
        shots: PRESSURE_SHOTS - (s.shots % PRESSURE_SHOTS),
      }),
    );
    this.pressure.setColor(
      this.flash > 0 || s.shots % PRESSURE_SHOTS >= 6 ? '#ffbd8f' : '#daeaff',
    );
    this.nextLabel.setText(t('games.puzzleBobble.next'));
    this.hint.setText(t('games.puzzleBobble.hint'));
    this.ceiling
      .setSize(RIGHT - LEFT, Math.max(1, s.ceiling * ROW_HEIGHT))
      .setVisible(s.ceiling > 0);
    for (const [index, piece] of this.pieces) {
      if (!s.board[index]) {
        piece.destroy();
        this.pieces.delete(index);
      }
    }
    s.board.forEach((color, index) => {
      if (!color) return;
      const p = position(index, s.ceiling);
      let piece = this.pieces.get(index);
      if (!piece) {
        piece = this.bubble(p.x, p.y, color).setDepth(3);
        this.pieces.set(index, piece);
      }
      piece.setFrame(`color-${color}`).setPosition(p.x, p.y);
    });
    this.current
      .setFrame(`color-${s.current}`)
      .setVisible(!s.shot && s.phase === 'playing');
    this.next.setFrame(`color-${s.next}`);
    this.projectile.setVisible(!!s.shot);
    if (s.shot)
      this.projectile
        .setFrame(`color-${s.shot.color}`)
        .setPosition(s.shot.x, s.shot.y);
    this.arrow.setRotation(s.angle);
    this.base.setAngle(
      this.shotPose > 0 ? Math.sin(this.shotPose * 40) * 3 : 0,
    );
    const frame =
      this.shotPose > 0 ? 'shoot' : `idle-${Math.floor(this.elapsed * 5) % 4}`;
    this.bub.setFrame(frame);
    this.bob.setFrame(frame);
    this.guide.clear();
    if (!s.shot && s.phase === 'playing') {
      const points = aimPath(s);
      points.forEach((p, i) => {
        if (i > 3 && i % 2 === 0)
          this.guide.fillStyle(0xfff2ad, 0.5).fillCircle(p.x, p.y, 2);
      });
    }
    const panelKey = `${s.phase}:${t('games.puzzleBobble.name')}`;
    if (this.panelKey !== panelKey) {
      this.panelKey = panelKey;
      this.drawPanel();
    }
  }
  private drawPanel() {
    this.panel.removeAll(true);
    const s = this.state;
    if (s.phase === 'playing') return;
    this.panel.add(this.add.rectangle(240, 400, 432, 552, 0x071329, 0.8));
    this.panel.add(
      this.add
        .rectangle(240, 388, 360, 238, 0x18234b)
        .setStrokeStyle(3, 0xffdb69),
    );
    const title =
      s.phase === 'clear'
        ? 'games.puzzleBobble.clear'
        : s.phase === 'won'
          ? 'games.puzzleBobble.won'
          : 'games.puzzleBobble.over';
    this.panel.add(this.text(240, 324, t(title), 28, '#fff49a').setOrigin(0.5));
    this.panel.add(
      this.text(
        240,
        378,
        t('games.puzzleBobble.result', { score: s.score }),
        20,
      ).setOrigin(0.5),
    );
    const button = this.text(
      240,
      448,
      t(
        s.phase === 'clear'
          ? 'games.puzzleBobble.continue'
          : 'games.puzzleBobble.restart',
      ),
      22,
      '#18234b',
    )
      .setStroke('#18234b', 0)
      .setPadding(22, 15)
      .setBackgroundColor('#ffdc72')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      if (this.status === 'paused') return;
      if (s.phase === 'clear') this.nextLevel();
      else this.scene.restart({ snapshot: null });
    });
    this.panel.add(button);
  }
}

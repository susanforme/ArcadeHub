import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import type { TranslationKey } from '../../../i18n/translate';
import { Audio } from '../../../shared/audio';
import clickSound from '../assets/audio/click.ogg';
import fireSound from '../assets/audio/fire.ogg';
import matchSound from '../assets/audio/match.ogg';
import claw from '../assets/claw.jpg';
import frog from '../assets/frog.png';
import objects from '../assets/objects.png';
import spiral from '../assets/spiral.jpg';
import tiltspiral from '../assets/tiltspiral.jpg';
import {
  BALL_SIZE,
  LEVEL_COUNT,
  lengthOf,
  MAPS,
  mapFor,
  pointAt,
} from '../levels';
import {
  fire,
  isZumaState,
  newZuma,
  stepZuma,
  swapBalls,
  type ZumaState,
} from '../logic';

const key = (name: string) => `zuma-${name}`;
const INK = '#fff1c6';
const COLORS = [0x42bfff, 0x7bd63d, 0xffd43b, 0xff5041, 0xdb67ff, 0xfff0d2];
const mapNames: TranslationKey[] = [
  'games.zuma.spiral',
  'games.zuma.claw',
  'games.zuma.tiltspiral',
];

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    Space: 'DROP',
    Enter: 'DROP',
    KeyX: 'SPECIAL',
    Escape: 'PAUSE',
    KeyP: 'PAUSE',
  } as const;
  protected gamepadButtons = { 0: 'DROP', 1: 'SPECIAL', 9: 'PAUSE' } as const;
  private state!: ZumaState;
  private background!: Phaser.GameObjects.Image;
  private skull!: Phaser.GameObjects.Image;
  private skullMouth!: Phaser.GameObjects.Image;
  private idol!: Phaser.GameObjects.Container;
  private loaded!: Phaser.GameObjects.Image;
  private reserve!: Phaser.GameObjects.Image;
  private projectile!: Phaser.GameObjects.Image;
  private marbles = new Map<number, Phaser.GameObjects.Image>();
  private aim!: Phaser.GameObjects.Graphics;
  private progress!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private swapText!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private panelToken = '';
  private levelDrawn = 0;
  private hearts: Phaser.GameObjects.Image[] = [];

  preload() {
    for (const [name, url] of Object.entries({
      frog,
      objects,
      spiral,
      claw,
      tiltspiral,
    }))
      this.load.image(key(name), url);
  }

  create() {
    this.state = isZumaState(this.savedSnapshot)
      ? this.savedSnapshot
      : newZuma();
    this.score = this.state.score;
    this.marbles = new Map();
    this.hearts = [];
    this.panelToken = '';
    this.levelDrawn = 0;
    const atlas = this.textures.get(key('objects'));
    for (let color = 0; color < 6; color++)
      for (let frame = 0; frame < 47; frame++)
        if (!atlas.has(`ball-${color}-${frame}`))
          atlas.add(
            `ball-${color}-${frame}`,
            0,
            color * 48,
            frame * 48,
            48,
            48,
          );
    for (const [name, x, y, width, height] of [
      ['sun', 629, 0, 132, 132],
      ['skull', 629, 132, 132, 132],
    ] as const)
      if (!atlas.has(name)) atlas.add(name, 0, x, y, width, height);
    const texture = this.textures.get(key('frog'));
    for (const [name, x, y] of [
      ['body', 0, 0],
      ['eyes', 0, 162],
    ] as const)
      if (!texture.has(name)) texture.add(name, 0, x, y, 162, 162);

    this.background = this.add
      .image(424, 304, key('spiral'))
      .setDisplaySize(848, 480);
    this.skull = this.add
      .image(0, 0, key('objects'), 'sun')
      .setDisplaySize(76, 76);
    this.skullMouth = this.add
      .image(0, 0, key('objects'), 'skull')
      .setDisplaySize(64, 64);
    this.aim = this.add.graphics().setDepth(2);
    const body = this.add
      .image(0, 0, key('frog'), 'body')
      .setDisplaySize(96, 96);
    this.loaded = this.add
      .image(0, 28, key('objects'), 'ball-0-24')
      .setDisplaySize(BALL_SIZE, BALL_SIZE);
    const eyes = this.add
      .image(0, 0, key('frog'), 'eyes')
      .setDisplaySize(96, 96);
    this.reserve = this.add
      .image(0, -31, key('objects'), 'ball-1-24')
      .setDisplaySize(15, 15);
    this.idol = this.add
      .container(0, 0, [body, this.loaded, eyes, this.reserve])
      .setDepth(4);
    this.projectile = this.add
      .image(0, 0, key('objects'), 'ball-0-24')
      .setDisplaySize(BALL_SIZE, BALL_SIZE)
      .setDepth(5)
      .setVisible(false);

    const bars = this.add.graphics().setDepth(10);
    bars.fillStyle(0x142c29).fillRect(0, 0, 848, 64).fillRect(0, 544, 848, 32);
    bars
      .lineStyle(1, 0xc99b50)
      .lineBetween(0, 63, 848, 63)
      .lineBetween(0, 544, 848, 544);
    this.hud = this.text(22, 12, '', 19).setDepth(11);
    this.scoreText = this.text(826, 12, '', 20).setOrigin(1, 0).setDepth(11);
    for (let i = 0; i < 3; i++)
      this.hearts.push(
        this.add
          .image(566 + i * 27, 26, key('frog'), 'body')
          .setDisplaySize(25, 25)
          .setDepth(11),
      );
    this.progress = this.add.graphics().setDepth(11);
    this.hint = this.text(22, 554, '', 13).setDepth(11);
    this.swapText = this.text(816, 552, '', 15)
      .setOrigin(1, 0)
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.status === 'playing') swapBalls(this.state);
      });
    this.panel = this.add.container(0, 0).setDepth(20);
    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) =>
      this.point(pointer),
    );
    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        targets: Phaser.GameObjects.GameObject[],
      ) => {
        const position = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        if (
          this.status !== 'playing' ||
          targets.length ||
          this.state.phase !== 'playing' ||
          position.y < 64 ||
          position.y > 544
        )
          return;
        if (pointer.rightButtonDown()) swapBalls(this.state);
        else {
          this.point(pointer);
          this.shoot();
        }
      },
    );
    this.begin();
    this.draw();
  }

  private point(pointer: Phaser.Input.Pointer) {
    const position = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (
      this.status !== 'playing' ||
      this.state.phase !== 'playing' ||
      position.y < 64 ||
      position.y > 544
    )
      return;
    const origin = mapFor(this.state.level).frog;
    if (Math.hypot(position.x - origin.x, position.y - origin.y) > 12)
      this.state.angle = Math.atan2(
        position.y - origin.y,
        position.x - origin.x,
      );
  }

  private shoot() {
    if (fire(this.state)) {
      Audio.playAsset(fireSound);
      this.tweens.add({
        targets: this.idol,
        scaleX: 0.94,
        scaleY: 0.94,
        duration: 65,
        yoyo: true,
      });
    }
  }

  update(_time: number, delta: number) {
    const active = this.frame(delta);
    const drop = this.controls.consume('DROP');
    const swap = this.controls.consume('SPECIAL');
    if (this.status === 'over') {
      if (drop) this.scene.restart({ snapshot: null });
      return;
    }
    if (!active) {
      this.draw();
      return;
    }
    if (this.state.phase !== 'playing') {
      if (drop) this.advance();
      this.draw();
      return;
    }
    const dt = Math.min(delta / 1000, 0.05);
    if (this.controls.down('LEFT')) this.state.angle -= dt * 2.5;
    if (this.controls.down('RIGHT')) this.state.angle += dt * 2.5;
    if (swap) swapBalls(this.state);
    if (drop) this.shoot();
    const events = stepZuma(this.state, dt);
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      this.publish();
    }
    for (const event of events) {
      if (event.type === 'insert') Audio.playAsset(clickSound);
      if (event.type === 'pop') {
        Audio.playAsset(matchSound);
        for (const ball of event.balls) {
          const p = pointAt(this.state.level, ball.distance);
          const sprite = this.add
            .image(p.x, p.y, key('objects'), `ball-${ball.color}-24`)
            .setDisplaySize(BALL_SIZE, BALL_SIZE)
            .setDepth(6);
          this.tweens.add({
            targets: sprite,
            scaleX: 1.25,
            scaleY: 1.25,
            alpha: 0,
            duration: 230,
            onComplete: () => sprite.destroy(),
          });
        }
        const p = pointAt(this.state.level, event.balls[0].distance);
        const label = this.text(
          p.x,
          p.y - 18,
          event.combo > 1
            ? t('games.zuma.combo', {
                combo: event.combo,
                points: event.points,
              })
            : `+${event.points}`,
          22,
        )
          .setOrigin(0.5)
          .setDepth(8);
        this.tweens.add({
          targets: label,
          y: label.y - 45,
          alpha: 0,
          duration: 900,
          onComplete: () => label.destroy(),
        });
      }
      if (event.type === 'lost') {
        Audio.play('over');
        this.cameras.main.shake(250, 0.005);
        if (!this.state.lives) this.finish('games.zuma.over', false);
        else this.persist();
      }
      if (event.type === 'clear') {
        Audio.play('clear');
        if (this.state.level === LEVEL_COUNT)
          this.finish('games.zuma.won', false);
        else this.persist();
      }
    }
    this.draw();
  }

  private advance() {
    if (this.status === 'paused') return;
    if (this.state.phase === 'over' || this.state.phase === 'won') {
      this.scene.restart({ snapshot: null });
      return;
    }
    if (this.state.phase === 'clear' || this.state.phase === 'lost') {
      this.state = newZuma(
        this.state.level + (this.state.phase === 'clear' ? 1 : 0),
        this.state.score,
        this.state.lives,
      );
    }
    this.state.phase = 'playing';
    this.persist();
    this.draw();
  }

  private draw() {
    const s = this.state;
    const map = mapFor(s.level);
    if (this.levelDrawn !== s.level) {
      this.background.setTexture(key(map.id));
      const end = pointAt(s.level, lengthOf(s.level));
      this.skull.setPosition(end.x, end.y);
      this.skullMouth.setPosition(end.x, end.y);
      this.idol.setPosition(map.frog.x, map.frog.y);
      this.levelDrawn = s.level;
    }
    const danger = (s.balls[0]?.distance ?? 0) / lengthOf(s.level) > 0.82;
    this.skullMouth.setTint(danger ? 0xff7755 : 0xffffff);
    this.hud.setText(
      `${t('games.zuma.level', { level: s.level, total: LEVEL_COUNT })}  ·  ${t(mapNames[(s.level - 1) % MAPS.length])}`,
    );
    this.scoreText.setText(t('games.zuma.score', { score: s.score }));
    this.hearts.forEach((heart, index) => {
      heart.setAlpha(index < s.lives ? 1 : 0.16);
    });
    this.progress
      .clear()
      .fillStyle(0x071e1b)
      .fillRoundedRect(22, 43, 804, 7, 3);
    const progress = Math.max(
      0,
      Math.min(1, 1 - (s.remaining + s.balls.length) / (48 + s.level * 4)),
    );
    if (progress > 0)
      this.progress
        .fillStyle(0xd9b65e)
        .fillRoundedRect(22, 43, Math.max(7, 804 * progress), 7, 3);
    this.hint.setText(
      danger
        ? t('games.zuma.danger')
        : t('games.zuma.hint', { count: s.remaining + s.balls.length }),
    );
    this.swapText.setText(t('games.zuma.swapButton'));
    this.idol.setRotation(s.angle - Math.PI / 2);
    this.loaded.setFrame(`ball-${s.current}-24`);
    this.reserve.setFrame(`ball-${s.next}-24`);
    const present = new Set<number>();
    for (const ball of s.balls) {
      present.add(ball.id);
      let image = this.marbles.get(ball.id);
      if (!image) {
        image = this.add
          .image(0, 0, key('objects'))
          .setDisplaySize(BALL_SIZE, BALL_SIZE)
          .setDepth(3);
        this.marbles.set(ball.id, image);
      }
      const p = pointAt(s.level, ball.distance);
      image
        .setFrame(
          `ball-${ball.color}-${Math.floor(Math.abs(ball.distance) / 2) % 47}`,
        )
        .setDisplaySize(BALL_SIZE, BALL_SIZE)
        .setPosition(p.x, p.y)
        .setVisible(p.y >= 78 && p.y <= 529 && p.x >= 15 && p.x <= 833);
    }
    for (const [id, image] of this.marbles)
      if (!present.has(id)) {
        image.destroy();
        this.marbles.delete(id);
      }
    this.projectile.setVisible(!!s.shot);
    if (s.shot)
      this.projectile
        .setPosition(s.shot.x, s.shot.y)
        .setFrame(`ball-${s.shot.color}-24`);
    this.aim.clear();
    if (s.phase === 'playing' && this.status === 'playing') {
      for (let distance = 58; distance < 220; distance += 16) {
        const x = map.frog.x + Math.cos(s.angle) * distance;
        const y = map.frog.y + Math.sin(s.angle) * distance;
        if (y > 70 && y < 538)
          this.aim
            .fillStyle(COLORS[s.current], 0.65 * (1 - distance / 240))
            .fillCircle(x, y, 2);
      }
    }
    this.drawPanel();
  }

  private drawPanel() {
    const phase = this.status === 'paused' ? 'paused' : this.state.phase;
    const token = `${phase}:${t('games.zuma.name')}:${this.state.score}:${this.state.level}`;
    if (this.panelToken === token) return;
    this.panelToken = token;
    this.panel.removeAll(true);
    if (phase === 'playing' || phase === 'paused') return;
    const shade = this.add.rectangle(424, 304, 848, 480, 0x081c18, 0.67);
    const box = this.add.graphics();
    box.fillStyle(0x183b32, 0.98).fillRoundedRect(204, 155, 440, 292, 18);
    box.lineStyle(2, 0xd1aa59).strokeRoundedRect(204, 155, 440, 292, 18);
    const badge = this.add
      .image(424, 183, key('frog'), 'body')
      .setDisplaySize(74, 74);
    const titleKeys = {
      ready: 'games.zuma.name',
      clear: 'games.zuma.clear',
      lost: 'games.zuma.lost',
      over: 'games.zuma.over',
      won: 'games.zuma.won',
    } as const;
    const titleText = t(titleKeys[phase]);
    const title = this.text(
      424,
      236,
      titleText,
      titleText.length > 22 ? 21 : 29,
    ).setOrigin(0.5);
    const message = this.text(
      424,
      288,
      phase === 'ready'
        ? t('games.zuma.rules')
        : t('games.zuma.result', {
            score: this.state.score,
            lives: this.state.lives,
          }),
      15,
    )
      .setOrigin(0.5)
      .setWordWrapWidth(396)
      .setAlign('center')
      .setLineSpacing(10);
    this.panel.add([shade, box, badge, title, message]);
    const action =
      phase === 'ready'
        ? 'games.zuma.start'
        : phase === 'clear'
          ? 'games.zuma.nextLevel'
          : phase === 'lost'
            ? 'games.zuma.retry'
            : 'games.zuma.restart';
    const button = this.text(424, 364, t(action), 20, '#183328')
      .setOrigin(0.5)
      .setPadding(42, 12)
      .setBackgroundColor('#e3bc6d')
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => this.advance());
    const hint = this.text(
      424,
      418,
      t('games.zuma.enter'),
      13,
      '#b4c6af',
    ).setOrigin(0.5);
    this.panel.add([button, hint]);
  }

  private text(x: number, y: number, content: string, size = 18, color = INK) {
    return this.add.text(x, y, content, {
      fontFamily: 'Arial, "PingFang SC", sans-serif',
      fontSize: size,
      color,
      fontStyle: 'bold',
    });
  }

  protected snapshot() {
    return this.state;
  }
}

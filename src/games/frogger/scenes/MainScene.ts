import Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import board from '../assets/board.gif';
import sprites from '../assets/sprites.png';
import {
  CELL,
  type Facing,
  type FrogEvent,
  type FrogState,
  HEIGHT,
  HOMES,
  hop,
  isFrogState,
  LANES,
  newFrog,
  obstacles,
  stepFrog,
  WIDTH,
} from '../logic';

const ATLAS = 'frogger-sprites';
const DIRECTIONS: Facing[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowUp: 'UP',
    KeyW: 'UP',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    ArrowDown: 'DOWN',
    KeyS: 'DOWN',
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    Space: 'DROP',
    Enter: 'DROP',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  protected gamepadButtons = { 0: 'DROP', 9: 'PAUSE' } as const;
  private state!: FrogState;
  private frog!: Phaser.GameObjects.Image;
  private pieces: Phaser.GameObjects.Image[][] = [];
  private homes: Phaser.GameObjects.Image[] = [];
  private lives: Phaser.GameObjects.Image[] = [];
  private scoreLabel!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private timeLabel!: Phaser.GameObjects.Text;
  private timer!: Phaser.GameObjects.Graphics;
  private panel!: Phaser.GameObjects.Container;
  private panelTitle!: Phaser.GameObjects.Text;
  private panelBody!: Phaser.GameObjects.Text;
  private panelButton!: Phaser.GameObjects.Text;
  private offset = { x: 0, y: 0 };
  private pointerStart: { x: number; y: number; id: number } | null = null;

  preload() {
    this.load.image(ATLAS, sprites);
    this.load.image('frogger-board', board);
  }
  create() {
    this.state = isFrogState(this.savedSnapshot)
      ? this.savedSnapshot
      : newFrog();
    this.score = this.state.score;
    this.offset = { x: 0, y: 0 };
    this.pointerStart = null;
    this.pieces = [];
    const texture = this.textures.get(ATLAS);
    texture.setFilter(Phaser.Textures.NEAREST);
    this.textures.get('frogger-board').setFilter(Phaser.Textures.NEAREST);
    const frame = (name: string, x: number, y: number, w = 80, h = 80) => {
      if (!texture.has(name)) texture.add(name, 0, x, y, w, h);
    };
    DIRECTIONS.forEach((direction, index) => {
      frame(direction, index * 160, 0);
      frame(`${direction}-hop`, index * 160 + 80, 0);
    });
    for (let i = 0; i < 3; i++) frame(`death-${i}`, 640 + i * 80, 0);
    frame('car-yellow', 0, 80);
    frame('bulldozer', 80, 80);
    frame('car-fast', 160, 80);
    frame('car-purple', 240, 80);
    frame('truck', 320, 80, 122);
    frame('log-short', 0, 160, 190);
    frame('log-medium', 0, 240, 254);
    frame('log-long', 240, 160, 392);
    frame('home', 640, 80);
    frame('life', 720, 80, 40, 40);
    for (let i = 0; i < 3; i++) {
      frame(`turtle-two-${i}`, 320 + i * 130, 240, 130);
      frame(`turtle-three-${i}`, i * 200, 320, 200);
    }
    this.add
      .image(0, 0, 'frogger-board')
      .setOrigin(0)
      .setDisplaySize(WIDTH, HEIGHT);
    this.pieces = LANES.map((lane) =>
      lane.starts.map(() =>
        this.add
          .image(
            0,
            lane.row * CELL,
            ATLAS,
            lane.kind === 'turtle' ? `${lane.frame}-0` : lane.frame,
          )
          .setOrigin(0)
          .setDisplaySize(lane.width, CELL),
      ),
    );
    this.homes = HOMES.map((x) =>
      this.add.image(x, 100, ATLAS, 'home').setScale(0.5),
    );
    this.frog = this.add.image(240, 580, ATLAS, 'UP').setScale(0.5);
    this.lives = Array.from({ length: 4 }, (_, i) =>
      this.add.image(20 + i * 26, 620, ATLAS, 'life').setScale(0.5),
    );
    this.scoreLabel = this.text(16, 10, '', 18, '#ffffff');
    this.text(240, 12, 'FROGGER', 22, '#71ff12').setOrigin(0.5, 0);
    this.levelLabel = this.text(WIDTH - 16, 10, '', 16, '#ffffff').setOrigin(
      1,
      0,
    );
    this.timeLabel = this.text(WIDTH - 12, 611, '', 14, '#ffff00').setOrigin(
      1,
      0,
    );
    this.timer = this.add.graphics();
    this.panel = this.add.container(0, 0).setDepth(20);
    const shade = this.add
      .rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.58)
      .setOrigin(0);
    const box = this.add
      .rectangle(240, 290, 440, 256, 0x030326, 0.97)
      .setStrokeStyle(2, 0x71ff12);
    this.panelTitle = this.text(240, 184, '', 30, '#71ff12').setOrigin(0.5, 0);
    this.panelBody = this.text(240, 239, '', 17, '#ffffff').setOrigin(0.5, 0);
    this.panelBody.setStyle({
      align: 'center',
      lineSpacing: 10,
      wordWrap: { width: 396 },
    });
    this.panelButton = this.text(240, 370, '', 20, '#ffff00')
      .setPadding(18, 12)
      .setBackgroundColor('#173c13')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.panelButton.on('pointerdown', () => {
      if (this.status === 'paused') this.controls.press('PAUSE');
      else if (this.status === 'over') this.scene.restart({ snapshot: null });
      else if (this.state.phase === 'ready') {
        this.state.phase = 'playing';
        this.controls.reset();
        this.persist();
      }
    });
    this.panel.add([
      shade,
      box,
      this.panelTitle,
      this.panelBody,
      this.panelButton,
    ]);
    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        targets: Phaser.GameObjects.GameObject[],
      ) => {
        if (
          targets.length ||
          this.status !== 'playing' ||
          this.state.phase !== 'playing'
        )
          return;
        this.pointerStart = { x: pointer.x, y: pointer.y, id: pointer.id };
      },
    );
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const start = this.pointerStart;
      this.pointerStart = null;
      if (!start || start.id !== pointer.id || this.status !== 'playing')
        return;
      const dx = pointer.x - start.x;
      const dy = pointer.y - start.y;
      const action =
        Math.max(Math.abs(dx), Math.abs(dy)) < 16
          ? 'UP'
          : Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? 'RIGHT'
              : 'LEFT'
            : dy > 0
              ? 'DOWN'
              : 'UP';
      this.controls.press(action, 'frogger-touch');
      this.controls.release(action, 'frogger-touch');
    });
    this.input.on('pointerupoutside', () => {
      this.pointerStart = null;
    });
    this.input.on('gameout', () => {
      this.pointerStart = null;
    });
    this.begin();
    this.controls.onReset(() => {
      this.pointerStart = null;
    });
    this.draw();
  }
  update(_time: number, delta: number) {
    const active = this.frame(delta);
    const forward = this.controls.consume('DROP');
    let direction: Facing | undefined;
    for (const action of DIRECTIONS)
      if (this.controls.consume(action)) direction ??= action;
    if (this.status === 'over') {
      if (forward || direction) this.scene.restart({ snapshot: null });
      else this.draw();
      return;
    }
    if (!active) {
      this.draw();
      return;
    }
    this.react(stepFrog(this.state, delta / 1000));
    if (this.state.phase === 'over') {
      this.finish(t('game.gameOver'), false);
    } else {
      direction ??= forward
        ? 'UP'
        : DIRECTIONS.find((action) => this.controls.down(action));
      if (!direction && this.controls.down('DROP')) direction = 'UP';
      if (direction) {
        const previous = { ...this.state.frog };
        const event = hop(this.state, direction);
        if (event === 'hop')
          this.offset = {
            x: this.state.frog.x - previous.x,
            y: (this.state.frog.row - previous.row) * CELL,
          };
        this.react(event);
      }
    }
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      this.publish();
    }
    this.draw();
  }
  protected snapshot() {
    return this.state;
  }
  private react(event?: FrogEvent) {
    if (!event) return;
    if (event === 'hop') {
      Audio.play('click');
      return;
    }
    this.offset = { x: 0, y: 0 };
    this.controls.reset();
    if (event === 'death') Audio.play('over');
    if (event === 'home') Audio.play('eat');
    if (event === 'clear') Audio.play('clear');
    this.score = this.state.score;
    this.publish();
    this.persist();
  }
  private draw() {
    const s = this.state;
    LANES.forEach((lane, i) =>
      obstacles(s, lane).forEach((piece, j) => {
        this.pieces[i][j].setX(piece.x).setVisible(!piece.submerged);
        if (lane.kind === 'turtle')
          this.pieces[i][j].setFrame(`${lane.frame}-${piece.animation}`);
      }),
    );
    this.homes.forEach((image, i) => image.setVisible(s.homes[i]));
    this.lives.forEach((image, i) => image.setVisible(i < s.lives));
    const progress = Math.max(0, (s.cooldown - 0.06) / 0.12);
    this.frog.setPosition(
      s.frog.x - this.offset.x * progress,
      s.frog.row * CELL + CELL / 2 - this.offset.y * progress,
    );
    this.frog.setVisible(s.phase !== 'clear' && s.phase !== 'over');
    this.frog.setFrame(
      s.phase === 'dying'
        ? `death-${Math.min(2, Math.floor((1.15 - s.delay) / 0.32))}`
        : `${s.frog.facing}${s.cooldown > 0.07 ? '-hop' : ''}`,
    );
    this.scoreLabel.setText(
      t('games.frogger.score', { score: String(s.score).padStart(6, '0') }),
    );
    this.levelLabel.setText(t('games.frogger.level', { level: s.level }));
    this.timeLabel.setText(
      t('games.frogger.time', { time: Math.ceil(s.remaining) }),
    );
    this.timer
      .clear()
      .fillStyle(0x303030)
      .fillRect(132, 616, 230, 10)
      .fillStyle(s.remaining < 8 ? 0xff3939 : 0x71ff12)
      .fillRect(132, 616, (230 * s.remaining) / 30, 10);
    const show =
      s.phase === 'ready' ||
      s.phase === 'clear' ||
      this.status === 'paused' ||
      this.status === 'over';
    this.panel.setVisible(show);
    if (!show) return;
    const paused = this.status === 'paused';
    const over = this.status === 'over';
    const clear = s.phase === 'clear';
    this.panelTitle.setText(
      t(
        paused
          ? 'games.frogger.paused'
          : over
            ? 'game.gameOver'
            : clear
              ? 'games.frogger.clear'
              : 'games.frogger.name',
      ),
    );
    this.panelBody.setText(
      paused
        ? t('games.frogger.pauseHint')
        : over
          ? `${t(`games.frogger.death.${s.death}`)}\n${t('games.frogger.score', { score: s.score })}`
          : clear
            ? t('games.frogger.next', { level: s.level + 1 })
            : t('games.frogger.instructions'),
    );
    this.panelButton
      .setVisible(!clear || paused || over)
      .setText(
        t(
          paused
            ? 'game.resume'
            : over
              ? 'game.restart'
              : 'games.frogger.start',
        ),
      );
  }
  private text(
    x: number,
    y: number,
    value: string,
    size: number,
    color: string,
  ) {
    return this.add.text(x, y, value, {
      fontFamily: 'monospace',
      fontSize: size,
      color,
    });
  }
}

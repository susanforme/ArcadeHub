import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import type { TranslationKey } from '../../../i18n/translate';
import { Audio } from '../../../shared/audio';
import { images, numbers, sounds } from '../assets';
import {
  type Difficulty,
  flag,
  isMineState,
  levels,
  type MineState,
  newBoard,
  reveal,
} from '../logic';

const VIEW = { x: 24, y: 216, width: 592, height: 480 };
export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    Enter: 'DROP',
    Space: 'DROP',
    KeyF: 'SPECIAL',
    KeyR: 'START',
    KeyZ: 'MODE',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  private state!: MineState;
  private difficulty: Difficulty = 'beginner';
  private tiles: Phaser.GameObjects.Image[] = [];
  private board!: Phaser.GameObjects.Container;
  private cursorGraphic!: Phaser.GameObjects.Graphics;
  private cursor: number | null = null;
  private tileSize = 42;
  private flagMode = false;
  private offsetX = 0;
  private offsetY = 0;
  private press: {
    id: number;
    x: number;
    y: number;
    ox: number;
    oy: number;
    time: number;
    right: boolean;
    moved: boolean;
  } | null = null;
  private counter!: Phaser.GameObjects.Text;
  private timer!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private modeLabel!: Phaser.GameObjects.Text;
  private zoomLabel!: Phaser.GameObjects.Text;
  preload() {
    for (const [name, url] of Object.entries(images))
      this.load.image(`ms-${name}`, url);
  }
  create() {
    this.state = isMineState(this.savedSnapshot)
      ? structuredClone(this.savedSnapshot)
      : newBoard(this.difficulty);
    this.difficulty = this.state.difficulty;
    this.score = this.state.marks.filter((n) => n === 1).length * 10;
    this.tiles = [];
    this.cursor = null;
    this.press = null;
    this.flagMode = false;
    this.tileSize = this.difficulty === 'beginner' ? 42 : 32;
    this.offsetX = 0;
    this.offsetY = 0;
    this.cameras.main.setBackgroundColor('#132a32');
    this.label(32, 30, t('games.minesweeper.name'), 30).setColor('#eef6d7');
    this.label(32, 72, t('games.minesweeper.tagline'), 15);
    const difficulties = Object.keys(levels) as Difficulty[];
    difficulties.forEach((level, i) => {
      const { cols, rows, mines } = levels[level];
      const label = this.button(
        123 + i * 197,
        123,
        185,
        `${t(`games.minesweeper.${level}`)}  ${cols}×${rows} / ${mines}`,
        () => {
          this.difficulty = level;
          this.scene.restart({ snapshot: null });
        },
      );
      if (level === this.difficulty) label.setColor('#f8d378');
    });
    this.add.rectangle(320, 180, 592, 52, 0x0c1c25).setStrokeStyle(2, 0x42616b);
    this.add.image(54, 180, 'ms-mine').setDisplaySize(30, 30);
    this.counter = this.label(78, 180, '', 26)
      .setOrigin(0, 0.5)
      .setColor('#f8d378');
    this.button(320, 180, 142, t('games.minesweeper.newGame'), () =>
      this.scene.restart({ snapshot: null }),
    );
    this.add.image(514, 180, 'ms-clock').setDisplaySize(30, 30);
    this.timer = this.label(544, 180, '', 26)
      .setOrigin(0, 0.5)
      .setColor('#f8d378');
    this.add
      .rectangle(320, 456, VIEW.width + 4, VIEW.height + 4, 0x091820)
      .setStrokeStyle(2, 0x42616b);
    this.board = this.add.container(0, 0);
    const { cols, rows } = levels[this.difficulty];
    for (let i = 0; i < cols * rows; i++) {
      const tile = this.add.image(0, 0, 'ms-covered').setOrigin(0);
      this.board.add(tile);
      this.tiles.push(tile);
    }
    this.cursorGraphic = this.add.graphics();
    this.modeLabel = this.button(180, 732, 300, '', () => {
      if (this.status !== 'playing') return;
      this.flagMode = !this.flagMode;
      this.drawHud();
    });
    this.add.image(61, 732, 'ms-flag').setDisplaySize(28, 28);
    this.zoomLabel = this.button(478, 732, 264, '', () => this.zoom());
    this.message = this.label(320, 778, '', 15).setOrigin(0.5);
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const point = this.cameras.main.getWorldPoint(p.x, p.y);
      if (
        this.status !== 'playing' ||
        this.press ||
        !this.inside(point.x, point.y)
      )
        return;
      this.press = {
        id: p.id,
        x: point.x,
        y: point.y,
        ox: this.offsetX,
        oy: this.offsetY,
        time: this.time.now,
        right: p.rightButtonDown(),
        moved: false,
      };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const press = this.press;
      if (!press || press.id !== p.id || this.status !== 'playing') return;
      const point = this.cameras.main.getWorldPoint(p.x, p.y);
      const dx = point.x - press.x,
        dy = point.y - press.y;
      if (Math.hypot(dx, dy) > 8) press.moved = true;
      if (press.moved) {
        this.offsetX = press.ox + dx;
        this.offsetY = press.oy + dy;
        this.layoutBoard();
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const press = this.press;
      if (!press || press.id !== p.id) return;
      this.press = null;
      const point = this.cameras.main.getWorldPoint(p.x, p.y);
      if (press.moved || !this.inside(point.x, point.y)) return;
      const x = Math.floor((point.x - this.board.x) / this.tileSize);
      const y = Math.floor((point.y - this.board.y) / this.tileSize);
      if (x < 0 || x >= cols || y < 0 || y >= rows) return;
      this.cursor = null;
      this.act(
        y * cols + x,
        press.right ||
          this.flagMode ||
          (p.wasTouch && this.time.now - press.time >= 450),
      );
    });
    this.input.on('pointerupoutside', () => {
      this.press = null;
    });
    this.begin();
    this.controls.onReset(() => {
      this.press = null;
    });
    this.drawBoard();
    this.drawHud();
  }
  update(_time: number, delta: number) {
    if (this.controls.consume('START')) {
      this.scene.restart({ snapshot: null });
      return;
    }
    if (!this.frame(delta)) {
      this.press = null;
      return;
    }
    if (this.state.outcome === 'playing') this.state.seconds += delta / 1000;
    this.drawHud();
    const { cols, rows } = levels[this.difficulty];
    for (const [action, dx, dy] of [
      ['LEFT', -1, 0],
      ['RIGHT', 1, 0],
      ['UP', 0, -1],
      ['DOWN', 0, 1],
    ] as const) {
      if (!this.controls.consume(action)) continue;
      const current = this.cursor ?? 0;
      const x = Math.max(0, Math.min(cols - 1, (current % cols) + dx));
      const y = Math.max(
        0,
        Math.min(rows - 1, Math.floor(current / cols) + dy),
      );
      this.cursor = y * cols + x;
      this.focusCursor();
    }
    if (this.controls.consume('DROP')) this.act(this.cursor ?? 0, false);
    if (this.controls.consume('SPECIAL')) this.act(this.cursor ?? 0, true);
    if (this.controls.consume('MODE')) this.zoom();
  }
  protected snapshot() {
    return this.state.outcome === 'ready' || this.state.outcome === 'playing'
      ? this.state
      : null;
  }
  private label(x: number, y: number, text: string, size: number) {
    return this.add
      .text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: `${size}px`,
        color: '#aac5c3',
      })
      .setResolution(
        Math.max(1, this.cameras.main.zoomX, this.cameras.main.zoomY),
      );
  }
  private button(
    x: number,
    y: number,
    width: number,
    text: string,
    callback: () => void,
  ) {
    this.add
      .rectangle(x, y, width, 42, 0x23434b)
      .setStrokeStyle(2, 0x50747a)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', callback);
    return this.label(x, y, text, 17).setOrigin(0.5).setColor('#e4efda');
  }
  private inside(x: number, y: number) {
    return (
      x >= VIEW.x &&
      x < VIEW.x + VIEW.width &&
      y >= VIEW.y &&
      y < VIEW.y + VIEW.height
    );
  }
  private act(index: number, marking: boolean) {
    if (this.status !== 'playing') return;
    if (!(marking ? flag(this.state, index) : reveal(this.state, index)))
      return;
    this.score =
      this.state.marks.filter((n, i) => n === 1 && this.state.cells[i] !== -1)
        .length * 10;
    this.drawBoard();
    this.drawHud();
    if (this.state.outcome === 'won' || this.state.outcome === 'lost') {
      Audio.playAsset(sounds[this.state.outcome === 'won' ? 'win' : 'lose']);
      this.finish(`games.minesweeper.${this.state.outcome}`, false);
    } else {
      Audio.playAsset(sounds[marking ? 'flag' : 'reveal']);
      this.publish();
      this.persist();
    }
  }
  private layoutBoard() {
    const { cols, rows } = levels[this.difficulty];
    const width = cols * this.tileSize,
      height = rows * this.tileSize;
    this.offsetX =
      width <= VIEW.width
        ? (VIEW.width - width) / 2
        : Math.max(VIEW.width - width, Math.min(0, this.offsetX));
    this.offsetY =
      height <= VIEW.height
        ? (VIEW.height - height) / 2
        : Math.max(VIEW.height - height, Math.min(0, this.offsetY));
    this.board.setPosition(VIEW.x + this.offsetX, VIEW.y + this.offsetY);
    this.tiles.forEach((tile, i) => {
      tile
        .setPosition(
          (i % cols) * this.tileSize,
          Math.floor(i / cols) * this.tileSize,
        )
        .setDisplaySize(this.tileSize, this.tileSize);
      const x = this.board.x + tile.x,
        y = this.board.y + tile.y;
      const left = Math.max(0, VIEW.x - x),
        top = Math.max(0, VIEW.y - y);
      const right = Math.min(this.tileSize, VIEW.x + VIEW.width - x);
      const bottom = Math.min(this.tileSize, VIEW.y + VIEW.height - y);
      tile.setVisible(right > left && bottom > top);
      if (tile.visible)
        tile.setCrop(
          (left * 21) / this.tileSize,
          (top * 21) / this.tileSize,
          ((right - left) * 21) / this.tileSize,
          ((bottom - top) * 21) / this.tileSize,
        );
    });
    this.cursorGraphic.clear();
    if (
      this.cursor !== null &&
      this.inside(
        this.board.x + (this.cursor % cols) * this.tileSize,
        this.board.y + Math.floor(this.cursor / cols) * this.tileSize,
      ) &&
      this.inside(
        this.board.x + ((this.cursor % cols) + 1) * this.tileSize - 1,
        this.board.y + (Math.floor(this.cursor / cols) + 1) * this.tileSize - 1,
      )
    )
      this.cursorGraphic
        .lineStyle(3, 0xffd36e)
        .strokeRect(
          this.board.x + (this.cursor % cols) * this.tileSize + 2,
          this.board.y + Math.floor(this.cursor / cols) * this.tileSize + 2,
          this.tileSize - 4,
          this.tileSize - 4,
        );
  }
  private drawBoard() {
    this.tiles.forEach((tile, i) => {
      const value = this.state.cells[i],
        mark = this.state.marks[i];
      let texture: string =
        mark === 2 ? 'flag' : mark === 1 ? numbers[value] : 'covered';
      if (this.state.outcome === 'lost' && value === -1)
        texture = i === this.state.exploded ? 'hit' : 'mine';
      tile.setTexture(`ms-${texture}`);
      tile.setTint(
        this.state.outcome === 'lost' && mark === 2 && value !== -1
          ? 0xff7777
          : 0xffffff,
      );
    });
    this.layoutBoard();
  }
  private drawHud() {
    this.counter.setText(
      String(
        levels[this.difficulty].mines -
          this.state.marks.filter((n) => n === 2).length,
      ).padStart(3, '0'),
    );
    this.timer.setText(
      String(Math.min(999, Math.floor(this.state.seconds))).padStart(3, '0'),
    );
    this.modeLabel
      .setText(
        t(
          this.flagMode
            ? 'games.minesweeper.flagMode'
            : 'games.minesweeper.revealMode',
        ),
      )
      .setColor(this.flagMode ? '#f8d378' : '#e4efda');
    this.zoomLabel.setText(
      t(
        this.tileSize === 42
          ? 'games.minesweeper.fit'
          : 'games.minesweeper.zoom',
      ),
    );
    const key: TranslationKey =
      this.state.outcome === 'won' || this.state.outcome === 'lost'
        ? `games.minesweeper.${this.state.outcome}`
        : 'games.minesweeper.footer';
    this.message.setText(t(key));
  }
  private zoom() {
    if (this.status !== 'playing') return;
    const { cols, rows } = levels[this.difficulty];
    this.tileSize =
      this.tileSize === 42
        ? Math.min(42, VIEW.width / cols, VIEW.height / rows)
        : 42;
    this.offsetX = 0;
    this.offsetY = 0;
    this.layoutBoard();
    this.focusCursor();
    this.drawHud();
  }
  private focusCursor() {
    if (this.cursor === null) return;
    const { cols } = levels[this.difficulty];
    const x = (this.cursor % cols) * this.tileSize,
      y = Math.floor(this.cursor / cols) * this.tileSize;
    this.offsetX = Math.min(
      -x + VIEW.width - this.tileSize,
      Math.max(-x, this.offsetX),
    );
    this.offsetY = Math.min(
      -y + VIEW.height - this.tileSize,
      Math.max(-y, this.offsetY),
    );
    this.layoutBoard();
  }
}

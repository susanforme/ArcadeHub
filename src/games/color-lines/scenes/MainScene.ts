import type Phaser from 'phaser';
import { useSettings } from '../../../app/store';
import { SessionScene } from '../../../core/session-scene';
import type { Direction } from '../../../core/types';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import balls from '../assets/balls.svg';
import {
  isLinesState,
  type LinesState,
  moveBall,
  newLines,
  SIZE,
} from '../logic';

const CELL = 62;
const LEFT = 41;
const TOP = 162;
const DIRECTIONS = ['LEFT', 'RIGHT', 'UP', 'DOWN'] as const;

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    ArrowUp: 'UP',
    KeyW: 'UP',
    ArrowDown: 'DOWN',
    KeyS: 'DOWN',
    Space: 'START',
    Enter: 'START',
    KeyZ: 'SPECIAL',
    Escape: 'PAUSE',
    KeyP: 'PAUSE',
  } as const;
  protected gamepadButtons = { 0: 'START', 1: 'SPECIAL', 9: 'PAUSE' } as const;
  private state!: LinesState;
  private selected = -1;
  private cursor = 40;
  private clock = 0;
  private repeat = 0;
  private held: Direction | null = null;
  private pieces: Phaser.GameObjects.Image[] = [];
  private preview: Phaser.GameObjects.Image[] = [];
  private traveling!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Graphics;
  private scoreLabel!: Phaser.GameObjects.Text;
  private movesLabel!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private replay!: Phaser.GameObjects.Text;
  private feedback: 'hint' | 'blocked' | 'clear' = 'hint';
  private cleared = 0;
  private moving: {
    board: number[];
    path: number[];
    elapsed: number;
    color: number;
  } | null = null;

  preload() {
    this.load.svg('color-lines-balls', balls, { width: 400, height: 700 });
  }

  create() {
    this.state = isLinesState(this.savedSnapshot)
      ? this.savedSnapshot
      : newLines();
    this.score = this.state.score;
    this.selected = -1;
    this.cursor = 40;
    this.clock = 0;
    this.repeat = 0;
    this.held = null;
    this.feedback = 'hint';
    this.moving = null;
    this.pieces = [];
    this.preview = [];
    this.cameras.main.setBackgroundColor('#bfc3c9');
    const texture = this.textures.get('color-lines-balls');
    for (let color = 1; color <= 7; color++)
      for (let frame = 0; frame < 4; frame++)
        if (!texture.has(`${color}-${frame}`))
          texture.add(
            `${color}-${frame}`,
            0,
            frame * 100,
            (color - 1) * 100,
            100,
            100,
          );

    this.add.rectangle(320, 38, 622, 58, 0x173784);
    this.add.text(28, 18, t('games.colorLines.name'), {
      fontFamily: 'Arial',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    this.add.text(28, 76, t('games.colorLines.instructions'), {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#273348',
    });
    this.scoreLabel = this.add.text(30, 113, '', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#172c65',
      fontStyle: 'bold',
    });
    this.add.text(338, 119, t('games.colorLines.next'), {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#273348',
    });
    const g = this.add.graphics();
    g.fillStyle(0x767c86).fillRect(
      LEFT - 5,
      TOP - 5,
      CELL * SIZE + 10,
      CELL * SIZE + 10,
    );
    for (let index = 0; index < SIZE * SIZE; index++) {
      const x = LEFT + (index % SIZE) * CELL;
      const y = TOP + Math.floor(index / SIZE) * CELL;
      g.fillStyle(0xd4d7dc).fillRect(x, y, CELL - 1, CELL - 1);
      g.lineStyle(2, 0xf6f7fa)
        .lineBetween(x + 1, y + CELL - 2, x + 1, y + 1)
        .lineBetween(x + 1, y + 1, x + CELL - 2, y + 1);
      g.lineStyle(2, 0x9a9ea8)
        .lineBetween(x + CELL - 2, y + 1, x + CELL - 2, y + CELL - 2)
        .lineBetween(x + 1, y + CELL - 2, x + CELL - 2, y + CELL - 2);
      this.pieces.push(
        this.add
          .image(x + CELL / 2, y + CELL / 2, 'color-lines-balls', '1-0')
          .setDisplaySize(60, 60),
      );
    }
    this.marker = this.add.graphics();
    this.traveling = this.add
      .image(0, 0, 'color-lines-balls', '1-0')
      .setDisplaySize(60, 60)
      .setVisible(false);
    for (let index = 0; index < 3; index++)
      this.preview.push(
        this.add
          .image(464 + index * 54, 128, 'color-lines-balls', '1-0')
          .setDisplaySize(48, 48),
      );
    this.movesLabel = this.add.text(30, 736, '', {
      fontFamily: 'Arial',
      fontSize: '17px',
      color: '#3c4658',
    });
    this.message = this.add
      .text(320, 795, '', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#172c65',
        align: 'center',
        wordWrap: { width: 600 },
      })
      .setOrigin(0.5, 1);
    this.replay = this.add
      .text(320, 444, t('games.colorLines.replay'), {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#173784',
        padding: { x: 26, y: 20 },
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.replay.on('pointerdown', () => {
      if (this.status === 'over') this.scene.restart({ snapshot: null });
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.status !== 'playing' || this.moving) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const x = Math.floor((point.x - LEFT) / CELL);
      const y = Math.floor((point.y - TOP) / CELL);
      if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
      this.cursor = y * SIZE + x;
      this.select(this.cursor);
    });
    this.begin();
    const unsubscribe = useSettings.subscribe((state, previous) => {
      if (state.language !== previous.language) this.draw();
    });
    this.events.once('shutdown', unsubscribe);
    this.draw();
    if (this.state.over) this.endGame();
  }

  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.held = null;
      this.repeat = 0;
      if (this.status === 'over' && this.controls.consume('START'))
        this.scene.restart({ snapshot: null });
      return;
    }
    this.clock += Math.min(delta, 100);
    if (this.moving) {
      this.moving.elapsed += Math.min(delta, 100);
      if (this.moving.elapsed >= (this.moving.path.length - 1) * 30 + 80) {
        this.moving = null;
        Audio.play(this.cleared ? 'clear' : 'eat');
        if (this.state.over) this.endGame();
      }
      this.draw();
      return;
    }
    if (this.controls.consume('SPECIAL')) {
      this.selected = -1;
      this.feedback = 'hint';
    }
    for (const direction of DIRECTIONS) {
      if (this.controls.consume(direction)) {
        this.moveCursor(direction);
        this.held = direction;
        this.repeat = -140;
      }
    }
    if (this.held && this.controls.down(this.held)) {
      this.repeat += delta;
      if (this.repeat >= 130) {
        this.repeat = 0;
        this.moveCursor(this.held);
      }
    } else this.held = null;
    if (this.controls.consume('START')) this.select(this.cursor);
    this.draw();
  }

  protected snapshot() {
    return this.state;
  }

  private moveCursor(direction: Direction) {
    const x = this.cursor % SIZE;
    const y = Math.floor(this.cursor / SIZE);
    this.cursor =
      Math.max(
        0,
        Math.min(
          SIZE - 1,
          y + (direction === 'DOWN' ? 1 : direction === 'UP' ? -1 : 0),
        ),
      ) *
        SIZE +
      Math.max(
        0,
        Math.min(
          SIZE - 1,
          x + (direction === 'RIGHT' ? 1 : direction === 'LEFT' ? -1 : 0),
        ),
      );
  }

  private select(index: number) {
    if (this.state.over || this.moving) return;
    if (this.state.board[index]) {
      this.selected = this.selected === index ? -1 : index;
      this.feedback = 'hint';
      Audio.play('click');
      return;
    }
    if (this.selected < 0) return;
    const result = moveBall(this.state, this.selected, index);
    if (!result.path.length) {
      this.feedback = 'blocked';
      return;
    }
    this.moving = {
      board: this.state.board,
      color: this.state.board[this.selected],
      path: result.path,
      elapsed: 0,
    };
    this.state = result.state;
    this.selected = -1;
    this.cleared = result.cleared.length;
    this.feedback = this.cleared ? 'clear' : 'hint';
    this.score = this.state.score;
    this.publish();
    this.persist();
  }

  private endGame() {
    this.replay.setVisible(true);
    this.finish(t('games.colorLines.over', { score: this.state.score }));
  }

  private point(index: number) {
    return {
      x: LEFT + ((index % SIZE) + 0.5) * CELL,
      y: TOP + (Math.floor(index / SIZE) + 0.5) * CELL,
    };
  }

  private draw() {
    const board = this.moving?.board ?? this.state.board;
    this.pieces.forEach((sprite, index) => {
      const color = board[index];
      sprite.setVisible(Boolean(color) && index !== this.moving?.path[0]);
      if (!color) return;
      const point = this.point(index);
      sprite.setPosition(
        point.x,
        point.y -
          (index === this.selected
            ? 4 + Math.abs(Math.sin(this.clock / 90)) * 5
            : 0),
      );
      sprite.setFrame(
        `${color}-${index === this.selected ? Math.floor(this.clock / 120) % 4 : 0}`,
      );
    });
    this.preview.forEach((sprite, index) => {
      sprite.setFrame(`${this.state.next[index]}-0`);
    });
    const marker = this.marker.clear();
    const cursor = this.point(this.cursor);
    marker
      .lineStyle(2, 0x173784, 0.7)
      .strokeRect(
        cursor.x - CELL / 2 + 4,
        cursor.y - CELL / 2 + 4,
        CELL - 9,
        CELL - 9,
      );
    if (this.selected >= 0) {
      const point = this.point(this.selected);
      marker
        .lineStyle(3, 0xf8f3a5)
        .strokeRect(
          point.x - CELL / 2 + 3,
          point.y - CELL / 2 + 3,
          CELL - 7,
          CELL - 7,
        );
    }
    this.traveling.setVisible(Boolean(this.moving));
    if (this.moving) {
      const step = Math.min(
        this.moving.path.length - 1,
        this.moving.elapsed / 30,
      );
      const from = this.point(this.moving.path[Math.floor(step)]);
      const to = this.point(
        this.moving.path[
          Math.min(this.moving.path.length - 1, Math.floor(step) + 1)
        ],
      );
      const fraction = step - Math.floor(step);
      this.traveling
        .setFrame(`${this.moving.color}-0`)
        .setPosition(
          from.x + (to.x - from.x) * fraction,
          from.y + (to.y - from.y) * fraction,
        );
    }
    this.scoreLabel.setText(
      t('games.colorLines.score', { score: this.state.score }),
    );
    this.movesLabel.setText(
      t('games.colorLines.moves', {
        moves: this.state.moves,
        empty: this.state.board.filter((n) => !n).length,
      }),
    );
    this.message.setText(
      this.state.over
        ? t('games.colorLines.over', { score: this.state.score })
        : t(`games.colorLines.${this.feedback}`, { count: this.cleared }),
    );
  }
}

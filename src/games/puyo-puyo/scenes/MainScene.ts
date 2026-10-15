import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import sheet from '../assets/puyo-sheet.png';
import {
  advanceResolution,
  COLORS,
  COLS,
  clearGroups,
  fallDelay,
  fits,
  isPuyoState,
  landingPair,
  lockPair,
  newPuyo,
  type PuyoState,
  pairCells,
  ROWS,
  rotatePair,
} from '../logic';

const CELL = 36;
const LEFT = 34;
const TOP = 100;
const TEXTURE = 'puyo-community-blobs';

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    ArrowDown: 'DOWN',
    KeyS: 'DOWN',
    ArrowUp: 'DROP',
    KeyW: 'DROP',
    Space: 'DROP',
    Enter: 'START',
    KeyX: 'SPECIAL',
    KeyE: 'SPECIAL',
    KeyZ: 'SECONDARY',
    KeyQ: 'SECONDARY',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  protected gamepadButtons = {
    0: 'SPECIAL',
    1: 'SECONDARY',
    2: 'DROP',
    9: 'PAUSE',
  } as const;
  private state!: PuyoState;
  private tiles: Phaser.GameObjects.Image[] = [];
  private active: Phaser.GameObjects.Image[] = [];
  private ghosts: Phaser.GameObjects.Image[] = [];
  private preview: Phaser.GameObjects.Image[] = [];
  private scoreLabel!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private chainLabel!: Phaser.GameObjects.Text;
  private bestLabel!: Phaser.GameObjects.Text;
  private messageLabel!: Phaser.GameObjects.Text;
  private elapsed = 0;
  private grounded = 0;
  private repeat = 0;
  private phaseElapsed = 0;

  preload() {
    this.load.image(TEXTURE, sheet);
  }
  create() {
    const saved = this.savedSnapshot;
    this.state = isPuyoState(saved)
      ? {
          ...saved,
          board: [...saved.board],
          next: [...saved.next],
          pair: saved.pair
            ? { ...saved.pair, colors: [...saved.pair.colors] }
            : null,
        }
      : newPuyo();
    this.score = this.state.score;
    this.elapsed = 0;
    this.grounded = 0;
    this.repeat = 0;
    this.phaseElapsed = 0;
    this.tiles = [];
    this.active = [];
    this.ghosts = [];
    this.preview = [];
    const texture = this.textures.get(TEXTURE);
    for (let color = 1; color <= COLORS; color++) {
      for (let mask = 0; mask < 16; mask++) {
        const name = `${color}-${mask}`;
        if (!texture.has(name))
          texture.add(
            name,
            0,
            (mask === 0 ? 0 : 3 + mask) * 18,
            (color - 1) * 18,
            16,
            16,
          );
      }
    }
    this.cameras.main.setBackgroundColor('#171a39');
    const decor = this.add.graphics();
    decor.fillStyle(0x24264a).fillRoundedRect(16, 20, 448, 542, 24);
    decor
      .fillStyle(0x8776bf)
      .fillRoundedRect(LEFT - 6, TOP - 6, COLS * CELL + 12, 12 * CELL + 12, 8);
    decor.fillStyle(0x15182e).fillRect(LEFT, TOP, COLS * CELL, 12 * CELL);
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0)
          decor
            .fillStyle(0x1a1d38)
            .fillRect(LEFT + x * CELL, TOP + y * CELL, CELL, CELL);
      }
    }
    decor.lineStyle(2, 0xd47f9a, 0.6);
    const dangerX = LEFT + CELL * 2.5;
    decor.lineBetween(dangerX - 8, TOP + 10, dangerX + 8, TOP + 26);
    decor.lineBetween(dangerX + 8, TOP + 10, dangerX - 8, TOP + 26);
    decor.fillStyle(0x181b35).fillRoundedRect(274, 100, 174, 153, 14);
    this.label(34, 33, t('games.puyoPuyo.name'), 26, '#f9e9bb');
    this.label(36, 69, t('games.puyoPuyo.mode'), 12, '#b1a4d1');
    this.label(361, 112, t('games.puyoPuyo.next'), 15, '#c1b3e1').setOrigin(
      0.5,
      0,
    );
    this.label(282, 276, t('game.currentScore'), 13, '#b1a4d1');
    this.scoreLabel = this.label(282, 299, '', 25, '#fff0bc');
    this.levelLabel = this.label(282, 351, '', 18, '#d8d2ec');
    this.bestLabel = this.label(282, 388, '', 15, '#b1a4d1');
    this.chainLabel = this.label(361, 465, '', 25, '#ffd774').setOrigin(0.5);
    this.messageLabel = this.label(240, 547, '', 13, '#e5d9f6').setOrigin(0.5);
    this.label(240, 587, t('games.puyoPuyo.hint'), 15, '#b4a8cf').setOrigin(
      0.5,
    );
    this.label(240, 613, t('games.puyoPuyo.dropHint'), 13, '#9388b0').setOrigin(
      0.5,
    );
    this.label(240, 693, 'ART · MARIE_ISKANDAR / CC0', 10, '#6d6485').setOrigin(
      0.5,
    );
    for (let index = 0; index < COLS * ROWS; index++) {
      this.tiles.push(this.add.image(0, 0, TEXTURE, '1-0').setVisible(false));
    }
    for (let index = 0; index < 2; index++) {
      this.ghosts.push(
        this.add.image(0, 0, TEXTURE, '1-0').setDepth(1).setAlpha(0.22),
      );
      this.active.push(this.add.image(0, 0, TEXTURE, '1-0').setDepth(2));
      this.preview.push(
        this.add
          .image(361, 211 - index * 40, TEXTURE, '1-0')
          .setDisplaySize(40, 40),
      );
    }
    this.begin();
    this.draw();
  }
  update(_time: number, delta: number) {
    const playing = this.frame(delta);
    const start = this.controls.consume('START');
    if (this.status === 'over') {
      const drop = this.controls.consume('DROP');
      const confirm = this.controls.consume('SPECIAL');
      if (start || drop || confirm) this.scene.restart({ snapshot: null });
      return;
    }
    if (!playing) {
      this.draw();
      return;
    }
    const dt = Math.min(delta, 100);
    const left = this.controls.consume('LEFT');
    const right = this.controls.consume('RIGHT');
    const clockwise = this.controls.consume('SPECIAL');
    const counterclockwise = this.controls.consume('SECONDARY');
    const drop = this.controls.consume('DROP');
    const up = this.controls.consume('UP');
    if (this.state.phase !== 'falling') {
      this.phaseElapsed += dt;
      if (this.phaseElapsed >= (this.state.phase === 'clearing' ? 360 : 55)) {
        this.phaseElapsed = 0;
        const previous = this.state.phase;
        this.state = advanceResolution(this.state);
        if (this.state.phase === 'clearing' && previous !== 'clearing')
          Audio.play('clear');
        this.syncScore();
        if (this.state.phase === 'over') {
          this.finish('games.puyoPuyo.gameOver');
          this.endCard();
        }
      }
      this.draw();
      return;
    }
    this.repeat += dt;
    const direction = left
      ? -1
      : right
        ? 1
        : this.repeat >= 135
          ? this.controls.down('LEFT')
            ? -1
            : this.controls.down('RIGHT')
              ? 1
              : 0
          : 0;
    if (direction) {
      this.move(direction, 0);
      this.repeat = left || right ? -110 : 0;
    }
    if (this.state.pair && (clockwise || counterclockwise)) {
      const rotated = rotatePair(
        this.state.board,
        this.state.pair,
        clockwise ? 1 : -1,
      );
      if (rotated !== this.state.pair) Audio.play('click');
      this.state.pair = rotated;
    }
    if ((drop || up) && this.state.pair) {
      const landed = landingPair(this.state.board, this.state.pair);
      this.state.score += (landed.y - this.state.pair.y) * 2;
      this.state.pair = landed;
      this.lock();
    } else if (this.state.pair) {
      const soft = this.controls.down('DOWN');
      this.elapsed += dt;
      if (this.elapsed >= (soft ? 45 : fallDelay(this.state.dropped))) {
        this.elapsed = 0;
        if (this.move(0, 1) && soft) this.state.score++;
      }
      if (
        this.state.pair &&
        !fits(this.state.board, {
          ...this.state.pair,
          y: this.state.pair.y + 1,
        })
      ) {
        this.grounded += dt;
        if (this.grounded >= 330) this.lock();
      } else this.grounded = 0;
    }
    this.syncScore();
    this.draw();
  }
  protected snapshot() {
    return this.state;
  }
  private label(
    x: number,
    y: number,
    text: string,
    size: number,
    color: string,
  ) {
    return this.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
    });
  }
  private move(dx: number, dy: number) {
    if (!this.state.pair) return false;
    const candidate = {
      ...this.state.pair,
      x: this.state.pair.x + dx,
      y: this.state.pair.y + dy,
    };
    if (!fits(this.state.board, candidate)) return false;
    this.state.pair = candidate;
    return true;
  }
  private lock() {
    this.state = lockPair(this.state);
    this.elapsed = 0;
    this.grounded = 0;
    this.phaseElapsed = 0;
    Audio.play('eat');
    this.syncScore();
    this.persist();
  }
  private syncScore() {
    if (this.score === this.state.score) return;
    this.score = this.state.score;
    this.publish();
  }
  private place(
    image: Phaser.GameObjects.Image,
    x: number,
    y: number,
    color: number,
    mask = 0,
  ) {
    image
      .setVisible(y >= 1 && y < ROWS)
      .setPosition(LEFT + (x + 0.5) * CELL, TOP + (y - 0.5) * CELL)
      .setFrame(`${color}-${mask}`)
      .setDisplaySize(CELL, CELL);
  }
  private draw() {
    const board = this.state.board;
    const clearing = new Set(
      this.state.phase === 'clearing' ? clearGroups(board).flat() : [],
    );
    this.tiles.forEach((image, index) => {
      const color = board[index];
      if (!color) {
        image.setVisible(false);
        return;
      }
      const x = index % COLS;
      const y = Math.floor(index / COLS);
      let mask = 0;
      if (y < ROWS - 1 && board[index + COLS] === color) mask += 1;
      if (y > 1 && board[index - COLS] === color) mask += 2;
      if (x < COLS - 1 && board[index + 1] === color) mask += 4;
      if (x > 0 && board[index - 1] === color) mask += 8;
      this.place(image, x, y, color, mask);
      image.setAlpha(
        clearing.has(index) && Math.floor(this.phaseElapsed / 70) % 2 === 1
          ? 0.25
          : 1,
      );
    });
    this.active.forEach((image) => {
      image.setVisible(false);
    });
    this.ghosts.forEach((image) => {
      image.setVisible(false);
    });
    if (this.state.pair) {
      pairCells(landingPair(board, this.state.pair)).forEach(
        ({ x, y, color }, index) => {
          this.place(this.ghosts[index], x, y, color);
        },
      );
      pairCells(this.state.pair).forEach(({ x, y, color }, index) => {
        this.place(this.active[index], x, y, color);
      });
    }
    this.preview.forEach((image, index) => {
      image.setFrame(`${this.state.next[index]}-0`);
    });
    this.scoreLabel.setText(String(this.score));
    this.levelLabel.setText(
      t('games.puyoPuyo.level', {
        level: 1 + Math.floor(this.state.dropped / 12),
      }),
    );
    this.bestLabel.setText(
      t('games.puyoPuyo.best', { count: this.state.maxChain }),
    );
    this.chainLabel.setText(
      this.state.chain
        ? t('games.puyoPuyo.chain', { count: this.state.chain })
        : '',
    );
    this.messageLabel.setText(
      t(
        this.state.chain && !board.some(Boolean)
          ? 'games.puyoPuyo.allClear'
          : 'games.puyoPuyo.rule',
      ),
    );
  }
  private endCard() {
    this.add
      .rectangle(240, 307, 410, 230, 0x15182e, 0.97)
      .setStrokeStyle(3, 0x8776bf)
      .setDepth(10);
    this.label(240, 247, t('games.puyoPuyo.gameOver'), 26, '#ffda86')
      .setOrigin(0.5)
      .setDepth(11);
    this.label(
      240,
      300,
      `${t('game.currentScore')}  ${this.score}`,
      22,
      '#e5d9f6',
    )
      .setOrigin(0.5)
      .setDepth(11);
    this.label(240, 364, t('game.playAgainAction'), 20, '#ffffff')
      .setOrigin(0.5)
      .setPadding(22, 12)
      .setBackgroundColor('#69579b')
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.restart({ snapshot: null }));
    this.label(240, 406, t('games.puyoPuyo.restartHint'), 12, '#b1a4d1')
      .setOrigin(0.5)
      .setDepth(11);
  }
}

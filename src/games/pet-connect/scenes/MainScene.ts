import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import type { TranslationKey } from '../../../i18n/translate';
import { Audio } from '../../../shared/audio';
import { petImages } from '../assets';
import {
  COLS,
  findMove,
  isPetState,
  matchPets,
  newPetState,
  type PetState,
  type Point,
  ROWS,
  shuffleBoard,
  TIME_LIMIT,
} from '../logic';

const STEP = 72;
const position = (point: Point) => ({
  x: 90 + point.x * STEP,
  y: 184 + point.y * STEP,
});
const tilePosition = (index: number) =>
  position({ x: index % COLS, y: Math.floor(index / COLS) });

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    Enter: 'DROP',
    Space: 'DROP',
    KeyH: 'SPECIAL',
    KeyR: 'SECONDARY',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  private state!: PetState;
  private selected: number | null = null;
  private cursor: number | null = null;
  private hinted: number[] = [];
  private busy = false;
  private tiles: Phaser.GameObjects.Container[] = [];
  private highlights!: Phaser.GameObjects.Graphics;
  private connection!: Phaser.GameObjects.Graphics;
  private timerBar!: Phaser.GameObjects.Graphics;
  private timerLabel!: Phaser.GameObjects.Text;
  private scoreLabel!: Phaser.GameObjects.Text;
  private remainingLabel!: Phaser.GameObjects.Text;
  private messageLabel!: Phaser.GameObjects.Text;
  private message: TranslationKey = 'games.petConnect.footer';
  preload() {
    petImages.forEach((image, i) => {
      this.load.image(`pet-${i + 1}`, image);
    });
  }
  create() {
    this.state = isPetState(this.savedSnapshot)
      ? { ...this.savedSnapshot, board: [...this.savedSnapshot.board] }
      : newPetState();
    this.score = this.state.score;
    this.selected = null;
    this.cursor = null;
    this.hinted = [];
    this.busy = false;
    this.message = 'games.petConnect.footer';
    this.tiles = [];
    this.cameras.main.setBackgroundColor('#e6f3ed');
    this.label(34, 25, t('games.petConnect.name'), 32, true);
    this.label(36, 71, t('games.petConnect.instructions'), 17);
    this.scoreLabel = this.label(505, 29, '', 25, true).setOrigin(1, 0);
    this.timerLabel = this.label(505, 70, '', 20, true).setOrigin(1, 0);
    this.timerBar = this.add.graphics();
    this.add
      .graphics()
      .fillStyle(0xd0e7dc)
      .fillRoundedRect(44, 140, 452, 586, 22);
    for (let index = 0; index < COLS * ROWS; index++) {
      const { x, y } = tilePosition(index);
      const card = this.add
        .graphics()
        .fillStyle(0xb9d3c6)
        .fillRoundedRect(-32, -29, 64, 64, 12)
        .fillStyle(0xfffcf3)
        .fillRoundedRect(-32, -32, 64, 64, 12);
      const image = this.add
        .image(0, 0, `pet-${this.state.board[index] || 1}`)
        .setDisplaySize(51, 51);
      const tile = this.add
        .container(x, y, [card, image])
        .setSize(64, 64)
        .setInteractive({ useHandCursor: true });
      tile.on('pointerdown', () => this.select(index));
      this.tiles.push(tile);
    }
    this.highlights = this.add.graphics().setDepth(3);
    this.connection = this.add.graphics().setDepth(4);
    this.remainingLabel = this.label(270, 738, '', 18, true).setOrigin(0.5);
    this.button(155, 'games.petConnect.hint', () => this.hint());
    this.button(385, 'games.petConnect.shuffle', () => this.shuffle());
    this.messageLabel = this.label(270, 817, '', 16).setOrigin(0.5);
    this.begin();
    if (!findMove(this.state.board)) this.shuffle(true);
    this.drawBoard();
    this.drawHud();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.tweens.pauseAll();
      return;
    }
    this.tweens.resumeAll();
    this.state.seconds = Math.max(0, this.state.seconds - delta / 1000);
    this.drawHud();
    if (this.state.seconds === 0) {
      this.endRound('games.petConnect.timeout');
      return;
    }
    if (this.busy) return;
    for (const [action, offset] of [
      ['LEFT', -1],
      ['RIGHT', 1],
      ['UP', -COLS],
      ['DOWN', COLS],
    ] as const) {
      if (this.controls.consume(action)) {
        this.cursor =
          ((this.cursor ?? 0) + offset + COLS * ROWS) % (COLS * ROWS);
        this.drawHighlights();
      }
    }
    if (this.controls.consume('DROP')) this.select(this.cursor ?? 0);
    if (this.controls.consume('SPECIAL')) this.hint();
    if (this.controls.consume('SECONDARY')) this.shuffle();
  }
  protected snapshot() {
    return this.state.seconds > 0 && this.state.board.some(Boolean)
      ? this.state
      : null;
  }
  private label(
    x: number,
    y: number,
    text: string,
    size: number,
    bold = false,
  ) {
    return this.add
      .text(x, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${size}px`,
        fontStyle: bold ? 'bold' : 'normal',
        color: '#285747',
      })
      .setResolution(
        Math.max(1, this.cameras.main.zoomX, this.cameras.main.zoomY),
      );
  }
  private button(x: number, key: TranslationKey, callback: () => void) {
    this.add
      .rectangle(x, 781, 192, 44, 0x2b7d61)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', callback);
    this.label(x, 781, t(key), 21, true).setColor('#ffffff').setOrigin(0.5);
  }
  private select(index: number) {
    if (this.status !== 'playing' || this.busy || !this.state.board[index])
      return;
    this.hinted = [];
    this.cursor = null;
    if (this.selected === index) this.selected = null;
    else if (this.selected === null) {
      this.selected = index;
      Audio.play('click');
    } else {
      const first = this.selected,
        result = matchPets(this.state, first, index);
      if (!result) {
        this.selected = index;
        this.message = 'games.petConnect.noMatch';
        Audio.play('click');
      } else {
        this.state = result.state;
        this.score = this.state.score;
        this.selected = null;
        this.message = 'games.petConnect.footer';
        this.busy = true;
        this.persist();
        this.publish();
        Audio.play('eat');
        this.connection.lineStyle(5, 0xe5a63b, 1).beginPath();
        result.path.forEach((point, i) => {
          const { x, y } = position(point);
          if (i === 0) this.connection.moveTo(x, y);
          else this.connection.lineTo(x, y);
        });
        this.connection.strokePath();
        this.tweens.add({
          targets: [this.tiles[first], this.tiles[index]],
          alpha: 0,
          scaleX: 0.65,
          scaleY: 0.65,
          duration: 240,
          onComplete: () => {
            this.connection.clear();
            this.busy = false;
            this.drawBoard();
            if (this.status !== 'playing') return;
            if (!this.state.board.some(Boolean)) {
              this.endRound('games.petConnect.win');
            } else if (!findMove(this.state.board)) this.shuffle(true);
          },
        });
      }
    }
    this.drawHighlights();
    this.drawHud();
  }
  private endRound(key: TranslationKey) {
    const won = key === 'games.petConnect.win';
    Audio.play(won ? 'clear' : 'over');
    this.finish(key, false);
    this.add
      .graphics()
      .fillStyle(0xe6f3ed, 0.94)
      .fillRoundedRect(36, 312, 468, 230, 22)
      .setDepth(10);
    this.label(270, 354, t(key), 26, true).setOrigin(0.5).setDepth(11);
    this.label(270, 410, `${t('game.currentScore')}  ${this.score}`, 24)
      .setOrigin(0.5)
      .setDepth(11);
    this.label(270, 480, t('game.playAgainAction'), 23, true)
      .setOrigin(0.5)
      .setColor('#ffffff')
      .setBackgroundColor('#2b7d61')
      .setPadding(24, 12)
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.restart({ snapshot: null }));
  }
  private hint() {
    if (this.status !== 'playing' || this.busy) return;
    const pair = findMove(this.state.board);
    if (!pair) {
      this.shuffle(true);
      return;
    }
    this.selected = null;
    this.hinted = pair;
    this.message = 'games.petConnect.footer';
    this.drawHighlights();
    Audio.play('click');
  }
  private shuffle(automatic = false) {
    if (this.status !== 'playing' || this.busy) return;
    this.state.board = shuffleBoard(this.state.board);
    this.selected = null;
    this.hinted = [];
    this.message = automatic
      ? 'games.petConnect.autoShuffle'
      : 'games.petConnect.footer';
    this.drawBoard();
    this.drawHud();
    this.persist();
    Audio.play('click');
  }
  private drawBoard() {
    this.tiles.forEach((tile, index) => {
      const value = this.state.board[index];
      tile.setVisible(Boolean(value)).setAlpha(1).setScale(1);
      (tile.list[1] as Phaser.GameObjects.Image)
        .setTexture(`pet-${value || 1}`)
        .setDisplaySize(51, 51);
    });
    this.drawHighlights();
  }
  private drawHighlights() {
    this.highlights.clear();
    for (const index of [
      ...this.hinted,
      ...(this.selected === null ? [] : [this.selected]),
      ...(this.cursor === null ? [] : [this.cursor]),
    ]) {
      const { x, y } = tilePosition(index);
      this.highlights
        .lineStyle(4, this.hinted.includes(index) ? 0xe5a63b : 0x2b7d61)
        .strokeRoundedRect(x - 33, y - 33, 66, 66, 13);
    }
  }
  private drawHud() {
    this.scoreLabel.setText(String(this.score));
    const seconds = Math.ceil(this.state.seconds);
    this.timerLabel.setText(
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    );
    this.timerBar
      .clear()
      .fillStyle(0xc7dfd2)
      .fillRoundedRect(36, 109, 468, 10, 5);
    if (this.state.seconds > 0)
      this.timerBar
        .fillStyle(seconds <= 30 ? 0xd97457 : 0x419d7c)
        .fillRoundedRect(
          36,
          109,
          (468 * this.state.seconds) / TIME_LIMIT,
          10,
          5,
        );
    this.remainingLabel.setText(
      t('games.petConnect.remaining', {
        count: this.state.board.filter(Boolean).length / 2,
      }),
    );
    this.messageLabel.setText(t(this.message));
  }
}

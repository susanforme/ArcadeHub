import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { Audio } from '../../../shared/audio';
import {
  COLS,
  fits,
  isTetrisState,
  lockPiece,
  newTetris,
  ROWS,
  rotate,
  type TetrisState,
} from '../logic';

const COLORS = [
  0x15222f, 0x72d6e4, 0xf5cd75, 0xbba0ee, 0x7cd6a0, 0xee8294, 0x7aabed,
  0xf0ad79,
];
export class MainScene extends SessionScene {
  private state!: TetrisState;
  private graphics!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private elapsed = 0;
  private repeat = 0;
  create() {
    this.state = isTetrisState(this.savedSnapshot)
      ? this.savedSnapshot
      : newTetris();
    this.score = this.state.score;
    this.elapsed = 0;
    this.repeat = 0;
    this.graphics = this.add.graphics();
    this.label = this.add.text(280, 35, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#b3c3d4',
      lineSpacing: 12,
    });
    this.begin();
    this.draw();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.elapsed = 0;
      return;
    }
    this.repeat += delta;
    const left = this.controls.consume('LEFT');
    const right = this.controls.consume('RIGHT');
    if (left || (this.controls.down('LEFT') && this.repeat > 140)) {
      this.move(-1, 0);
      this.repeat = 0;
    }
    if (right || (this.controls.down('RIGHT') && this.repeat > 140)) {
      this.move(1, 0);
      this.repeat = 0;
    }
    if (this.controls.consume('UP'))
      this.state.piece = rotate(this.state.board, this.state.piece);
    if (this.controls.consume('DROP')) {
      while (this.move(0, 1)) this.state.score += 2;
      this.lock();
      this.draw();
      return;
    }
    this.elapsed += Math.min(delta, 100);
    const delay = this.controls.down('DOWN')
      ? 45
      : Math.max(90, 700 - Math.floor(this.state.lines / 10) * 65);
    if (this.elapsed >= delay) {
      this.elapsed = 0;
      if (!this.move(0, 1)) this.lock();
      else if (this.controls.down('DOWN')) this.state.score++;
    }
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      this.publish();
    }
    this.draw();
  }
  private move(x: number, y: number) {
    const piece = {
      ...this.state.piece,
      x: this.state.piece.x + x,
      y: this.state.piece.y + y,
    };
    if (!fits(this.state.board, piece)) return false;
    this.state.piece = piece;
    return true;
  }
  private lock() {
    const result = lockPiece(this.state);
    this.state = result.state;
    this.score = this.state.score;
    this.elapsed = 0;
    if (result.cleared) Audio.play('clear');
    this.publish();
    if (result.over) this.finish('方块堆满了，再挑战一次？');
  }
  protected snapshot() {
    return this.state;
  }
  private draw() {
    const g = this.graphics.clear();
    const size = 23;
    const ox = 20;
    const oy = 20;
    const cell = (x: number, y: number, color: number, alpha = 1) => {
      g.fillStyle(COLORS[color], alpha).fillRoundedRect(
        ox + x * size + 1,
        oy + y * size + 1,
        size - 2,
        size - 2,
        3,
      );
    };
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) cell(x, y, this.state.board[y][x]);
    let ghost = { ...this.state.piece };
    while (fits(this.state.board, { ...ghost, y: ghost.y + 1 }))
      ghost = { ...ghost, y: ghost.y + 1 };
    ghost.cells.forEach((row, y) => {
      row.forEach((n, x) => {
        if (n) cell(ghost.x + x, ghost.y + y, n, 0.2);
      });
    });
    this.state.piece.cells.forEach((row, y) => {
      row.forEach((n, x) => {
        if (n) cell(this.state.piece.x + x, this.state.piece.y + y, n);
      });
    });
    this.label.setText(
      `NEXT\n\n\n\n\nLEVEL\n${Math.floor(this.state.lines / 10) + 1}\n\nLINES\n${this.state.lines}`,
    );
    this.state.next.forEach((row, y) => {
      row.forEach((n, x) => {
        if (n)
          g.fillStyle(COLORS[n]).fillRoundedRect(
            280 + x * 20,
            75 + y * 20,
            18,
            18,
            3,
          );
      });
    });
  }
}

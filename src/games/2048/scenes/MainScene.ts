import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { Audio } from '../../../shared/audio';
import {
  continueGrid,
  type Direction,
  type GridState,
  isGridState,
  moveGrid,
  newGrid,
} from '../logic';
import { tileColor } from '../palette';

const BOARD_X = 20,
  BOARD_Y = 125,
  SIZE = 480,
  GAP = 12,
  CELL = 105;
interface TileVisual {
  background: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}
const position = (index: number) => ({
  x: BOARD_X + GAP + CELL / 2 + (index % 4) * (CELL + GAP),
  y: BOARD_Y + GAP + CELL / 2 + Math.floor(index / 4) * (CELL + GAP),
});

export class MainScene extends SessionScene {
  private state!: GridState;
  private tiles = new Map<number, TileVisual>();
  private scoreLabel!: Phaser.GameObjects.Text;
  private victory: (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] =
    [];
  private animating = false;
  private swipe: { x: number; y: number; pointer: number } | null = null;
  create() {
    this.state = isGridState(this.savedSnapshot)
      ? this.savedSnapshot
      : newGrid();
    this.score = this.state.score;
    this.tiles = new Map();
    this.victory = [];
    this.animating = false;
    this.swipe = null;
    this.cameras.main.setBackgroundColor('#faf8ef');
    this.add.text(22, 22, '2048', {
      fontFamily: 'Arial',
      fontSize: '62px',
      fontStyle: 'bold',
      color: '#776e65',
    });
    this.add.text(24, 97, '合并相同数字，挑战 2048。', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#776e65',
    });
    this.add
      .graphics()
      .fillStyle(0xbbada0)
      .fillRoundedRect(345, 26, 155, 62, 6);
    this.add
      .text(422, 39, '本局得分', {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#eee4da',
      })
      .setOrigin(0.5);
    this.scoreLabel = this.add
      .text(422, 65, String(this.score), {
        fontFamily: 'Arial',
        fontSize: '27px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const background = this.add
      .graphics()
      .fillStyle(0xbbada0)
      .fillRoundedRect(BOARD_X, BOARD_Y, SIZE, SIZE, 10);
    for (let index = 0; index < 16; index++) {
      const { x, y } = position(index);
      background
        .fillStyle(0xcdc1b4)
        .fillRoundedRect(x - CELL / 2, y - CELL / 2, CELL, CELL, 5);
    }
    const shade = this.add
      .graphics()
      .fillStyle(0xedc22e, 0.92)
      .fillRoundedRect(BOARD_X, BOARD_Y, SIZE, SIZE, 10)
      .setDepth(20);
    const title = this.add
      .text(260, 310, '合成 2048！', {
        fontFamily: 'Arial',
        fontSize: '43px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(21);
    const hint = this.add
      .text(260, 362, '目标达成，继续挑战更大的数字？', {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(21);
    const keepPlaying = this.add
      .text(260, 424, '继续挑战 →', {
        fontFamily: 'Arial',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#f9f6f2',
        backgroundColor: '#8f7a66',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    keepPlaying.on('pointerdown', () => {
      if (this.status === 'playing') {
        this.state = continueGrid(this.state);
        this.persist();
        this.showVictory();
        Audio.play('click');
      }
    });
    const restart = this.add
      .text(260, 485, '重新开始', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });
    restart.on('pointerdown', () => {
      if (this.status === 'playing') this.scene.restart({ snapshot: null });
    });
    this.victory = [shade, title, hint, keepPlaying, restart];
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (
        this.status !== 'playing' ||
        this.animating ||
        (this.state.won && !this.state.keepPlaying)
      )
        return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (
        point.x >= BOARD_X &&
        point.x <= BOARD_X + SIZE &&
        point.y >= BOARD_Y &&
        point.y <= BOARD_Y + SIZE
      )
        this.swipe = { ...point, pointer: pointer.id };
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const start = this.swipe;
      this.swipe = null;
      if (!start || pointer.id !== start.pointer || this.status !== 'playing')
        return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y),
        dx = point.x - start.x,
        dy = point.y - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 20)
        this.move(
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? 'RIGHT'
              : 'LEFT'
            : dy > 0
              ? 'DOWN'
              : 'UP',
        );
    });
    this.input.on('pointerupoutside', () => {
      this.swipe = null;
    });
    this.begin();
    this.drawTiles();
    this.showVictory();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.swipe = null;
      this.tweens.pauseAll();
      return;
    }
    this.tweens.resumeAll();
    for (const action of ['LEFT', 'RIGHT', 'UP', 'DOWN'] as const)
      if (this.controls.consume(action)) this.move(action);
  }
  protected snapshot() {
    return this.state.over ? null : this.state;
  }
  private move(direction: Direction) {
    if (this.animating || this.status !== 'playing') return;
    const result = moveGrid(this.state, direction);
    if (!result.moved) return;
    const won = !this.state.won && result.state.won;
    this.state = result.state;
    this.score = this.state.score;
    this.persist();
    this.publish();
    this.scoreLabel.setText(String(this.score));
    Audio.play(won ? 'clear' : result.merged.length ? 'eat' : 'click');
    this.animating = true;
    for (const motion of result.motions) {
      const tile = this.tiles.get(motion.from);
      if (tile)
        this.tweens.add({
          targets: [tile.background, tile.label],
          ...position(motion.to),
          duration: 100,
          ease: 'Quad.easeInOut',
        });
    }
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 110,
      onComplete: () => {
        this.drawTiles();
        for (const index of [
          ...result.merged,
          ...(result.spawned === null ? [] : [result.spawned]),
        ]) {
          const tile = this.tiles.get(index);
          if (!tile) continue;
          tile.background.setScale(0.85);
          tile.label.setScale(0.85);
          this.tweens.add({
            targets: [tile.background, tile.label],
            scaleX: 1,
            scaleY: 1,
            duration: 110,
            ease: 'Back.easeOut',
          });
        }
        this.animating = false;
        this.showVictory();
        if (this.state.over) this.finish('棋盘已满，已经没有可移动的方向了。');
      },
    });
  }
  private drawTiles() {
    for (const tile of this.tiles.values()) {
      tile.background.destroy();
      tile.label.destroy();
    }
    this.tiles.clear();
    this.state.board.forEach((value, index) => {
      if (!value) return;
      const { x, y } = position(index);
      const background = this.add
        .graphics()
        .fillStyle(tileColor(value))
        .fillRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 5)
        .setPosition(x, y)
        .setDepth(2);
      const label = this.add
        .text(x, y, String(value), {
          fontFamily: 'Arial',
          fontSize: `${Math.min(48, 150 / String(value).length)}px`,
          fontStyle: 'bold',
          color: value <= 4 ? '#776e65' : '#f9f6f2',
        })
        .setOrigin(0.5)
        .setDepth(3)
        .setResolution(
          Math.max(1, this.cameras.main.zoomX, this.cameras.main.zoomY),
        );
      this.tiles.set(index, { background, label });
    });
  }
  private showVictory() {
    for (const object of this.victory)
      object.setVisible(this.state.won && !this.state.keepPlaying);
  }
}

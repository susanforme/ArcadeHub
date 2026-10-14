import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import {
  isSnakeState,
  newSnake,
  SIZE,
  type SnakeState,
  stepSnake,
} from '../logic';

export class MainScene extends SessionScene {
  private state!: SnakeState;
  private graphics!: Phaser.GameObjects.Graphics;
  private elapsed = 0;
  private direction = { x: 1, y: 0 };
  create() {
    this.state = isSnakeState(this.savedSnapshot)
      ? this.savedSnapshot
      : newSnake();
    this.score = this.state.score;
    this.direction = this.state.direction;
    this.elapsed = 0;
    this.graphics = this.add.graphics();
    this.begin();
    this.draw();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.elapsed = 0;
      return;
    }
    const choices = [
      ['LEFT', -1, 0],
      ['RIGHT', 1, 0],
      ['UP', 0, -1],
      ['DOWN', 0, 1],
    ] as const;
    for (const [action, x, y] of choices)
      if (this.controls.consume(action)) {
        if (x !== -this.state.direction.x || y !== -this.state.direction.y)
          this.direction = { x, y };
      }
    this.elapsed += Math.min(delta, 150);
    if (this.elapsed < Math.max(65, 160 - this.score / 5)) return;
    this.elapsed = 0;
    const result = stepSnake(this.state, this.direction);
    this.state = result.state;
    this.score = this.state.score;
    if (result.ate) {
      Audio.play('eat');
      this.publish();
    }
    this.draw();
    if (result.over)
      this.finish(
        this.state.food === null
          ? t('games.snake.boardCompleted')
          : t('games.snake.gameOver'),
      );
  }
  protected snapshot() {
    return this.state;
  }
  private draw() {
    const g = this.graphics.clear();
    const size = 24;
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        g.fillStyle((x + y) % 2 ? 0x15222f : 0x13202c).fillRect(
          x * size,
          y * size,
          size,
          size,
        );
      }
    this.state.body.forEach((cell, index) => {
      g.fillStyle(index ? 0x73c997 : 0xb4f5c5).fillRoundedRect(
        cell.x * size + 2,
        cell.y * size + 2,
        size - 4,
        size - 4,
        5,
      );
    });
    const head = this.state.body[0];
    g.fillStyle(0x162b22).fillCircle(head.x * size + 15, head.y * size + 8, 2);
    if (this.state.food)
      g.fillStyle(0xffaa72).fillRoundedRect(
        this.state.food.x * size + 4,
        this.state.food.y * size + 4,
        size - 8,
        size - 8,
        6,
      );
  }
}

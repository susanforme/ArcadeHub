import Phaser from 'phaser';
import { SessionScene } from '../../core/session-scene';
import { t } from '../../i18n';
import sprites from './assets/sprites.png';
import {
  COLS,
  type DigState,
  type Direction,
  isDigState,
  newDig,
  ROWS,
  STEP,
  stepDig,
} from './logic';

const CELL = 30,
  TOP = 58,
  WIDTH = 450,
  HEIGHT = 640;
export class DigScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    ArrowUp: 'UP',
    KeyW: 'UP',
    ArrowDown: 'DOWN',
    KeyS: 'DOWN',
    Space: 'DROP',
    KeyJ: 'DROP',
    Enter: 'START',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  private state!: DigState;
  private accumulator = 0;
  private texture!: Phaser.Textures.CanvasTexture;
  private label!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private tap = false;
  preload() {
    this.load.image('dig-dug-sprites', sprites);
  }
  create() {
    this.state = isDigState(this.savedSnapshot)
      ? structuredClone(this.savedSnapshot)
      : newDig();
    this.score = this.state.score;
    this.accumulator = 0;
    this.tap = false;
    const texture = this.textures.createCanvas('dig-dug-board', WIDTH, HEIGHT);
    if (!texture) throw new Error('Cannot create Dig Dug canvas');
    this.texture = texture;
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, texture.key).setOrigin(0);
    this.label = this.add.text(14, 12, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#ffffff',
    });
    this.hint = this.add
      .text(WIDTH / 2, HEIGHT - 24, '', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#b9d5df',
      })
      .setOrigin(0.5);
    this.input.on('pointerdown', () => {
      if (this.status === 'playing') this.tap = true;
    });
    this.events.once('shutdown', () => this.textures.remove(texture.key));
    this.begin();
    this.draw();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.accumulator = 0;
      this.tap = false;
      return;
    }
    this.accumulator += Math.min(delta, 200);
    while (this.accumulator >= STEP) {
      const direction = (
        [
          ['RIGHT', 0],
          ['DOWN', 1],
          ['LEFT', 2],
          ['UP', 3],
        ] as const
      ).find(([key]) => this.controls.down(key))?.[1] as Direction | undefined;
      stepDig(this.state, {
        direction,
        pump: this.controls.down('DROP') || this.tap,
        start: this.controls.consume('START'),
      });
      this.tap = false;
      this.accumulator -= STEP;
    }
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      this.publish();
    }
    this.draw();
    if (this.state.phase === 'over') this.finish(t('game.gameOver'));
  }
  private draw() {
    const s = this.state,
      c = this.texture.getContext(),
      sheet = this.textures
        .get('dig-dug-sprites')
        .getSourceImage() as HTMLImageElement;
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#030c16';
    c.fillRect(0, 0, WIDTH, HEIGHT);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        c.fillStyle =
          y < 2
            ? '#143c56'
            : ['#bc7429', '#bd5630', '#93351e'][
                Math.min(2, Math.floor((y - 2) / 6))
              ];
        if (!s.dirt[y * COLS + x]) continue;
        c.fillRect(x * CELL, TOP + y * CELL, CELL, CELL);
        c.fillStyle = '#e6ad53';
        for (let i = 0; i < 4; i++)
          c.fillRect(
            x * CELL + ((x * 7 + i * 11) % 27),
            TOP + y * CELL + ((y * 7 + i * 13) % 27),
            2,
            2,
          );
      }
    const sprite = (
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      x: number,
      y: number,
      size = 30,
    ) =>
      c.drawImage(
        sheet,
        sx,
        sy,
        sw,
        sh,
        x * CELL + (CELL - size) / 2,
        TOP + y * CELL + (CELL - size) / 2,
        size,
        size,
      );
    for (const r of s.rocks) {
      sprite(280, 122, 18, 18, r.x, r.y, 32);
      if (r.timer > 0 && !r.falling) {
        c.strokeStyle = '#ffcc33';
        c.strokeRect(r.x * CELL, TOP + r.y * CELL, CELL, CELL);
      }
    }
    if (s.dropped >= 2 && !s.bonus) sprite(199, 141, 17, 18, 7, 9, 28);
    for (const e of s.enemies) {
      sprite(
        e.kind ? 181 : 182,
        e.kind ? 91 : 59,
        23,
        24,
        e.x,
        e.y,
        28 + e.air * 6,
      );
      if (e.fire) {
        c.fillStyle = '#ffac18';
        c.fillRect(
          (e.dir === 0 ? e.x + 1 : e.x - 3) * CELL,
          TOP + e.y * CELL + 10,
          CELL * 3,
          10,
        );
      }
    }
    const p = s.player;
    if (s.hose) {
      const [dx, dy] = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ][p.dir];
      c.strokeStyle = '#f7f7fa';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(p.x * CELL + 15, TOP + p.y * CELL + 15);
      c.lineTo(
        (p.x + dx * s.hose) * CELL + 15,
        TOP + (p.y + dy * s.hose) * CELL + 15,
      );
      c.stroke();
    }
    if (p.invincible % 4 < 2)
      sprite(10 + (s.ticks % 2) * 20, 18, 19, 19, p.x, p.y, 31);
    for (let i = 0; i < s.lives; i++)
      c.drawImage(sheet, 10, 18, 19, 19, 345 + i * 30, 10, 25, 25);
    this.label.setText(
      `${String(s.score).padStart(6, '0')}  ·  ${t('games.digDug.round')} ${s.level}`,
    );
    this.hint.setText(
      t(
        s.phase === 'ready'
          ? 'games.digDug.ready'
          : s.phase === 'clear'
            ? 'games.digDug.clear'
            : 'games.digDug.hint',
      ),
    );
    this.texture.refresh();
  }
  protected snapshot() {
    return this.state;
  }
}

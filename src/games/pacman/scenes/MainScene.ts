// SPDX-License-Identifier: GPL-3.0-only
import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import fruitSound from '../assets/eating-fruit.mp3';
import ghostSound from '../assets/eating-ghost.mp3';
import extraSound from '../assets/extend.mp3';
import deathSound from '../assets/miss.mp3';
import startSound from '../assets/start-music.mp3';
import {
  actorPosition,
  DIRECTIONS,
  type GameEvent,
  isPacmanState,
  newPacman,
  type PacmanState,
  stepPacman,
  VECTOR,
} from '../logic';
import { COLS, MAZE, ROWS, TOTAL_DOTS } from '../map';

const TILE = 16,
  TOP = 58,
  WIDTH = COLS * TILE;
const COLORS = [0xff3030, 0xffb8de, 0x00e5ff, 0xffb852];
const ANGLES = { RIGHT: 0, DOWN: Math.PI / 2, LEFT: Math.PI, UP: -Math.PI / 2 };
export class MainScene extends SessionScene {
  private state!: PacmanState;
  private maze!: Phaser.GameObjects.Graphics;
  private dots!: Phaser.GameObjects.Graphics;
  private actors!: Phaser.GameObjects.Graphics;
  private info!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private footer!: Phaser.GameObjects.Text;
  private notice!: Phaser.GameObjects.Text;
  private accumulator = 0;
  private animation = 0;
  private swipe: { x: number; y: number; id: number } | null = null;
  create() {
    const resumed = isPacmanState(this.savedSnapshot);
    this.state = resumed ? (this.savedSnapshot as PacmanState) : newPacman();
    this.score = this.state.score;
    this.accumulator = 0;
    this.animation = 0;
    this.swipe = null;
    this.cameras.main.setBackgroundColor('#000000');
    this.maze = this.add.graphics();
    this.dots = this.add.graphics();
    this.actors = this.add.graphics();
    this.add.text(14, 9, t('games.pacman.subtitle'), {
      fontFamily: 'monospace',
      fontSize: '23px',
      fontStyle: 'bold',
      color: '#ffe600',
    });
    this.info = this.add.text(14, 37, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    });
    this.prompt = this.add
      .text(WIDTH / 2, TOP + 17 * TILE + 8, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffe600',
        backgroundColor: '#000000',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.notice = this.add
      .text(WIDTH / 2, TOP + 10 * TILE, '', {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#00ffff',
        backgroundColor: '#000000',
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.footer = this.add.text(95, TOP + ROWS * TILE + 15, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffb8ae',
    });
    this.add
      .text(14, 597, t('games.pacman.license'), {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#858595',
        padding: { y: 4 },
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        window.open('/licenses/pacman.txt', '_blank', 'noopener');
      });
    this.add
      .text(
        WIDTH - 14,
        597,
        import.meta.env.DEV ? t('game.referenceSource') : t('game.source'),
        {
          fontFamily: 'Arial',
          fontSize: '10px',
          color: '#858595',
          padding: { y: 4 },
        },
      )
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        window.open(
          import.meta.env.DEV
            ? 'https://github.com/masonicGIT/pacman'
            : '/sources/arcadehub.tar.gz',
          '_blank',
          'noopener',
        );
      });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.status !== 'playing') return;
      const point = this.cameras.main.getWorldPoint(p.x, p.y);
      if (point.y >= TOP && point.y < TOP + ROWS * TILE)
        this.swipe = { ...point, id: p.id };
    });
    const steer = (p: Phaser.Input.Pointer) => {
      if (!this.swipe || this.swipe.id !== p.id || this.status !== 'playing')
        return;
      const point = this.cameras.main.getWorldPoint(p.x, p.y),
        dx = point.x - this.swipe.x,
        dy = point.y - this.swipe.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
      this.state.wanted =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? 'RIGHT'
            : 'LEFT'
          : dy > 0
            ? 'DOWN'
            : 'UP';
      this.swipe = { ...point, id: p.id };
    };
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) steer(p);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      steer(p);
      this.swipe = null;
    });
    this.input.on('pointerupoutside', () => {
      this.swipe = null;
    });
    this.begin();
    this.drawMaze();
    this.drawDots();
    this.draw();
    if (!resumed) Audio.playAsset(startSound);
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.accumulator = 0;
      this.swipe = null;
      return;
    }
    for (const dir of DIRECTIONS)
      if (this.controls.consume(dir)) this.state.wanted = dir;
    this.accumulator += Math.min(delta, 100) / 1000;
    const events: GameEvent[] = [];
    while (this.accumulator >= 1 / 120) {
      events.push(...stepPacman(this.state, 1 / 120));
      this.accumulator -= 1 / 120;
    }
    this.animation += Math.min(delta, 100) / 1000;
    if (events.length) {
      this.score = this.state.score;
      this.publish();
      if (
        events.includes('pellet') ||
        events.includes('power') ||
        events.includes('level')
      )
        this.drawDots();
      const sounds: Partial<Record<GameEvent, string>> = {
        death: deathSound,
        ghost: ghostSound,
        fruit: fruitSound,
        extra: extraSound,
      };
      for (const event of new Set(events)) {
        if (sounds[event]) Audio.playAsset(sounds[event]);
        else if (event === 'power' || event === 'level') Audio.play('clear');
        else if (event === 'pellet') Audio.play('eat');
      }
      if (events.includes('death') || events.includes('level')) this.persist();
    }
    if (this.state.phase === 'ready') this.drawDots();
    this.draw();
    if (this.state.phase === 'over')
      this.finish(
        t('games.pacman.gameOver', { level: this.state.level }),
        false,
      );
  }
  protected snapshot() {
    return this.state.phase === 'over' ? null : this.state;
  }
  private drawMaze() {
    const g = this.maze.clear().lineStyle(2, 0x2121ff);
    g.beginPath();
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        if (MAZE[y][x] !== '|') continue;
        const left = x * TILE,
          right = left + TILE,
          top = TOP + y * TILE,
          bottom = top + TILE;
        if (MAZE[y - 1]?.[x] !== '|') {
          g.moveTo(left, top);
          g.lineTo(right, top);
        }
        if (MAZE[y + 1]?.[x] !== '|') {
          g.moveTo(left, bottom);
          g.lineTo(right, bottom);
        }
        if (MAZE[y][x - 1] !== '|') {
          g.moveTo(left, top);
          g.lineTo(left, bottom);
        }
        if (MAZE[y][x + 1] !== '|') {
          g.moveTo(right, top);
          g.lineTo(right, bottom);
        }
      }
    g.strokePath();
    g.lineStyle(3, 0xffb8de).lineBetween(
      13 * TILE,
      TOP + 12 * TILE + 8,
      15 * TILE,
      TOP + 12 * TILE + 8,
    );
  }
  private drawDots() {
    const g = this.dots.clear().fillStyle(0xffb8ae);
    this.state.pellets.forEach((present, i) => {
      if (!present || MAZE[Math.floor(i / COLS)][i % COLS] === 'o') return;
      g.fillRect(
        ((i % COLS) + 0.5) * TILE - 1.5,
        TOP + (Math.floor(i / COLS) + 0.5) * TILE - 1.5,
        3,
        3,
      );
    });
  }
  private pacman(
    x: number,
    y: number,
    angle: number,
    mouth: number,
    radius = 8.5,
  ) {
    this.actors
      .fillStyle(0xffe600)
      .slice(x, y, radius, angle + mouth, angle - mouth, false)
      .fillPath();
  }
  private draw() {
    const s = this.state,
      g = this.actors.clear();
    const eaten = TOTAL_DOTS - s.pellets.filter(Boolean).length;
    this.info.setText(
      t('games.pacman.hud', {
        score: s.score,
        level: s.level,
        eaten: eaten,
        total: TOTAL_DOTS,
      }),
    );
    this.footer.setText(
      `${t('games.pacman.lives', { lives: s.lives })}     ${s.power > 0 ? t('games.pacman.power', { seconds: s.power.toFixed(1) }) : t('games.pacman.nextLevelHint')}`,
    );
    this.prompt
      .setVisible(s.phase === 'ready' || s.phase === 'clear')
      .setText(s.phase === 'clear' ? t('game.levelCleared') : t('game.ready'));
    this.notice.setVisible(s.noticeTime > 0).setText(s.notice);
    this.maze.setAlpha(
      s.phase === 'clear' && Math.floor(this.animation * 6) % 2 ? 0.35 : 1,
    );
    if (Math.floor(this.animation * 4) % 2 === 0)
      s.pellets.forEach((present, i) => {
        if (present && MAZE[Math.floor(i / COLS)][i % COLS] === 'o')
          g.fillStyle(0xffb8ae).fillCircle(
            ((i % COLS) + 0.5) * TILE,
            TOP + (Math.floor(i / COLS) + 0.5) * TILE,
            5,
          );
      });
    if (s.fruitTime > 0) {
      const x = 14 * TILE,
        y = TOP + 17.5 * TILE;
      g.lineStyle(2, 0x53d36e)
        .lineBetween(x - 6, y, x + 2, y - 9)
        .lineBetween(x + 6, y + 1, x + 2, y - 9);
      g.fillStyle(s.level === 1 ? 0xf52c41 : 0xff8b38)
        .fillCircle(x - 6, y + 4, 5)
        .fillCircle(x + 6, y + 5, 5);
    }
    const p = actorPosition(s.player),
      death = s.phase === 'dying' ? 1 - s.wait / 1.4 : 0;
    const mouth = death
      ? Math.min(Math.PI - 0.01, death * Math.PI)
      : 0.12 + Math.abs(Math.sin(this.animation * 18)) * 0.55;
    if (s.phase !== 'over')
      for (const offset of [-WIDTH, 0, WIDTH])
        this.pacman(
          (p.x + 0.5) * TILE + offset,
          TOP + (p.y + 0.5) * TILE,
          ANGLES[s.player.dir],
          mouth,
        );
    if (s.phase !== 'dying' && s.phase !== 'over')
      s.ghosts.forEach((ghost, i) => {
        const pos = actorPosition(ghost);
        for (const offset of [-WIDTH, 0, WIDTH]) {
          const x = (pos.x + 0.5) * TILE + offset,
            y = TOP + (pos.y + 0.5) * TILE;
          const scared = ghost.scared && s.power > 0,
            flash = scared && s.power < 2 && Math.floor(this.animation * 8) % 2;
          if (ghost.mode !== 'eyes') {
            g.fillStyle(scared ? (flash ? 0xffffff : 0x2121ff) : COLORS[i]);
            g.fillCircle(x, y - 1, 8).fillRect(x - 8, y - 1, 16, 9);
            g.fillStyle(0x000000);
            for (let j = 0; j < 3; j++)
              g.fillTriangle(
                x - 8 + j * 5.5,
                y + 8,
                x - 5.25 + j * 5.5,
                y + (Math.floor(this.animation * 10) % 2 ? 4 : 5),
                x - 2.5 + j * 5.5,
                y + 8,
              );
          }
          if (scared) {
            g.fillStyle(flash ? 0xff3030 : 0xffb8ae)
              .fillRect(x - 4, y - 3, 2, 2)
              .fillRect(x + 2, y - 3, 2, 2);
            g.lineStyle(1, flash ? 0xff3030 : 0xffb8ae)
              .lineBetween(x - 5, y + 3, x - 2, y + 1)
              .lineBetween(x - 2, y + 1, x + 1, y + 3)
              .lineBetween(x + 1, y + 3, x + 4, y + 1);
          } else {
            const v = VECTOR[ghost.dir];
            g.fillStyle(0xffffff)
              .fillEllipse(x - 4, y - 2, 6, 8)
              .fillEllipse(x + 4, y - 2, 6, 8);
            g.fillStyle(0x2121ff)
              .fillRect(x - 5 + v.x * 2, y - 3 + v.y * 2, 3, 3)
              .fillRect(x + 3 + v.x * 2, y - 3 + v.y * 2, 3, 3);
          }
        }
      });
    for (let i = 0; i < Math.max(0, s.lives - 1); i++)
      this.pacman(18 + i * 23, TOP + ROWS * TILE + 22, Math.PI, 0.45, 7);
  }
}

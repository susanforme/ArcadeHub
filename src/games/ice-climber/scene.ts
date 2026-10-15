import Phaser from 'phaser';
import { SessionScene } from '../../core/session-scene';
import { t } from '../../i18n';
import sprites from './assets/sprites.png';
import {
  BASE,
  HEIGHT,
  type IceState,
  isIceState,
  newIce,
  STEP,
  stepIce,
  WIDTH,
} from './logic';
export class IceScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    ArrowUp: 'UP',
    Space: 'UP',
    KeyJ: 'DROP',
    KeyX: 'DROP',
    KeyA: 'P2_LEFT',
    KeyD: 'P2_RIGHT',
    KeyW: 'P2_UP',
    KeyF: 'P2_FIRE',
    Digit2: 'MODE',
    Enter: 'START',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  protected gamepadButtons = { 0: 'UP', 1: 'DROP', 9: 'PAUSE' } as const;
  private state!: IceState;
  private accumulator = 0;
  private texture!: Phaser.Textures.CanvasTexture;
  private label!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private join!: Phaser.GameObjects.Text;
  private tap = false;
  preload() {
    this.load.image('ice-climber-sprites', sprites);
  }
  create() {
    this.state = isIceState(this.savedSnapshot)
      ? structuredClone(this.savedSnapshot)
      : newIce();
    this.score = this.state.score;
    this.accumulator = 0;
    this.tap = false;
    const texture = this.textures.createCanvas(
      'ice-climber-board',
      WIDTH,
      HEIGHT,
    );
    if (!texture) throw new Error('Cannot create Ice Climber canvas');
    this.texture = texture;
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, texture.key).setOrigin(0);
    this.label = this.add.text(12, 12, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#ffffff',
    });
    this.hint = this.add
      .text(WIDTH / 2, HEIGHT - 22, '', {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#c5e7fa',
      })
      .setOrigin(0.5);
    this.join = this.add
      .text(WIDTH - 12, 44, t('games.iceClimber.join'), {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#ffc7db',
        backgroundColor: '#23364d',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(1, 0)
      .setInteractive();
    this.join.on('pointerdown', () => {
      if (this.status === 'playing') {
        stepIce(this.state, [{ join: true }]);
        this.draw();
      }
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const point = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.status === 'playing' && point.y > 90) this.tap = true;
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
    this.accumulator += Math.min(100, delta);
    while (this.accumulator >= STEP) {
      const jump = this.controls.consume('UP') || this.tap,
        hit = this.controls.consume('DROP'),
        p2Jump = this.controls.consume('P2_UP'),
        p2Hit = this.controls.consume('P2_FIRE'),
        join = this.controls.consume('MODE'),
        start = this.controls.consume('START');
      stepIce(this.state, [
        {
          left: this.controls.down('LEFT'),
          right: this.controls.down('RIGHT'),
          jump,
          hit,
          join,
          start,
        },
        {
          left: this.controls.down('P2_LEFT'),
          right: this.controls.down('P2_RIGHT'),
          jump: p2Jump,
          hit: p2Hit,
        },
      ]);
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
        .get('ice-climber-sprites')
        .getSourceImage() as HTMLImageElement;
    c.imageSmoothingEnabled = false;
    const gradient = c.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, '#071124');
    gradient.addColorStop(1, '#153a56');
    c.fillStyle = gradient;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 50; i++) {
      c.fillStyle = i % 2 ? '#6a90b1' : '#d1eaff';
      c.fillRect((i * 83) % WIDTH, (i * 61 + s.camera * 0.1) % HEIGHT, 2, 2);
    }
    const sprite = (
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      x: number,
      y: number,
      w = sw,
      h = sh,
    ) => c.drawImage(sheet, sx, sy, sw, sh, x, y - s.camera, w, h);
    for (let f = 0; f < 15; f++) {
      const y = BASE - f * 100;
      if (y - s.camera > HEIGHT || y - s.camera < 0) continue;
      for (let x = 0; x < 16; x++)
        if (s.floors[f][x])
          sprite(
            s.floors[f][x] === 2 ? 208 : 0,
            s.floors[f][x] === 2 ? 232 : 232,
            16,
            16,
            x * 30,
            y,
            30,
            18,
          );
      if (f > 0 && !s.fruit[f])
        sprite(
          112 + (f % 4) * 32,
          352,
          32,
          32,
          60 + ((f * 73) % 320),
          y - 29,
          28,
          28,
        );
      c.fillStyle = '#698ba6';
      c.font = '12px monospace';
      c.fillText(String(f), 6, y - s.camera - 6);
    }
    for (const cloud of s.clouds)
      sprite(96, 216, 86, 16, cloud.x, cloud.y, 86, 16);
    for (const e of s.enemies)
      if (e.alive)
        sprite(
          304 + (Math.floor(s.ticks / 10) % 3) * 32,
          e.dir > 0 ? 112 : 80,
          32,
          32,
          e.x - 16,
          e.y - 30,
          32,
          30,
        );
    s.players.forEach((p, i) => {
      if (s.phase === 'playing' && p.invincible % 8 >= 4) return;
      c.save();
      if (i === 1) c.filter = 'hue-rotate(115deg)';
      if (p.dir < 0) {
        c.translate(p.x * 2, 0);
        c.scale(-1, 1);
      }
      if (p.hammer) sprite(40, 0, 40, 57, p.x - 20, p.y - 46, 40, 46);
      else
        sprite(
          p.grounded ? 64 + (Math.floor(s.ticks / 8) % 4) * 32 : 0,
          168,
          32,
          48,
          p.x - 16,
          p.y - 39,
          32,
          39,
        );
      c.restore();
    });
    c.fillStyle = '#09172c';
    c.fillRect(0, 0, WIDTH, 43);
    for (let i = 0; i < s.lives; i++)
      c.drawImage(sheet, 0, 168, 32, 48, WIDTH - 86 + i * 25, 7, 20, 29);
    this.label.setText(
      `${String(s.score).padStart(6, '0')}  ·  ${t('games.iceClimber.mountain')} ${s.level}`,
    );
    this.hint.setText(
      t(
        s.phase === 'ready'
          ? 'games.iceClimber.ready'
          : s.phase === 'clear'
            ? 'games.iceClimber.clear'
            : 'games.iceClimber.hint',
      ),
    );
    this.join.setVisible(s.players.length === 1);
    this.texture.refresh();
  }
  protected snapshot() {
    return this.state;
  }
}

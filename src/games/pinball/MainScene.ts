import type Phaser from 'phaser';
import { SessionScene } from '../../core/session-scene';
import { t } from '../../i18n';
import { Audio } from '../../shared/audio';
import ball from './assets/ball.png';
import bumper from './assets/bumper.png';
import flipperImage from './assets/flipper.png';
import wall from './assets/wall.png';
import {
  BUMPERS,
  flipper,
  isPinballState,
  launchBall,
  newPinball,
  type PinballState,
  RAILS,
  stepPinball,
  TARGETS,
} from './logic';
export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT' as const,
    KeyA: 'LEFT' as const,
    ArrowRight: 'RIGHT' as const,
    KeyD: 'RIGHT' as const,
    Space: 'DROP' as const,
    Enter: 'START' as const,
    KeyP: 'PAUSE' as const,
    Escape: 'PAUSE' as const,
  };
  private state!: PinballState;
  private ball!: Phaser.GameObjects.Image;
  private paddles: Phaser.GameObjects.Image[] = [];
  private targets: Phaser.GameObjects.Image[] = [];
  private bumpers: Phaser.GameObjects.Image[] = [];
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private serve!: Phaser.GameObjects.Text;
  private end!: Phaser.GameObjects.Container;
  preload() {
    this.load.image('pb-ball', ball);
    this.load.image('pb-bumper', bumper);
    this.load.image('pb-flipper', flipperImage);
    this.load.image('pb-wall', wall);
  }
  create() {
    this.state = isPinballState(this.savedSnapshot)
      ? this.savedSnapshot
      : newPinball();
    this.score = this.state.score;
    this.paddles = [];
    this.targets = [];
    this.bumpers = [];
    this.cameras.main.setBackgroundColor('#141d32');
    const g = this.add.graphics();
    g.fillStyle(0x243451);
    g.fillRoundedRect(18, 94, 444, 588, 28);
    g.lineStyle(3, 0x526b91);
    g.strokeRoundedRect(18, 94, 444, 588, 28);
    for (let y = 165; y < 580; y += 40) {
      g.lineStyle(1, 0x354766, 0.45);
      g.lineBetween(40, y, 390, y);
    }
    for (const [ax, ay, bx, by] of RAILS) {
      const len = Math.hypot(bx - ax, by - ay);
      this.add
        .image((ax + bx) / 2, (ay + by) / 2, 'pb-wall')
        .setDisplaySize(len + 8, 12)
        .setRotation(Math.atan2(by - ay, bx - ax))
        .setTint(0xa6c4df);
    }
    this.add
      .text(224, 404, 'ARCADE', {
        fontFamily: 'Arial',
        fontSize: '37px',
        fontStyle: 'bold',
        color: '#364f73',
      })
      .setOrigin(0.5);
    for (const b of BUMPERS)
      this.bumpers.push(
        this.add
          .image(b.x, b.y, 'pb-bumper')
          .setDisplaySize(b.r * 2, b.r * 2)
          .setTint(0x5be4dc),
      );
    for (const target of TARGETS)
      this.targets.push(
        this.add
          .image(target.x, target.y, 'pb-bumper')
          .setDisplaySize(target.r * 2, target.r * 2),
      );
    for (let i = 0; i < 2; i++)
      this.paddles.push(
        this.add
          .image(0, 0, 'pb-flipper')
          .setDisplaySize(113, 31)
          .setOrigin(0.854, 0.5)
          .setTint(0xff8baf),
      );
    this.ball = this.add
      .image(this.state.x, this.state.y, 'pb-ball')
      .setDisplaySize(20, 20);
    const style = {
      fontFamily: 'Arial, "PingFang SC", sans-serif',
      fontSize: '19px',
      color: '#e9f1ff',
    };
    this.hud = this.add.text(240, 25, '', style).setOrigin(0.5);
    this.hint = this.add
      .text(240, 62, '', { ...style, fontSize: '13px', color: '#a4bddb' })
      .setOrigin(0.5);
    this.add
      .text(240, 697, t('games.pinball.hint'), { ...style, fontSize: '13px' })
      .setOrigin(0.5);
    this.serve = this.add
      .text(240, 480, t('games.pinball.ready'), {
        ...style,
        color: '#142139',
        backgroundColor: '#66dbd3',
        padding: { x: 14, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.serve.on('pointerdown', () => {
      if (this.status === 'playing' && launchBall(this.state))
        Audio.play('click');
    });
    this.end = this.add.container(0, 0).setDepth(10).setVisible(false);
    this.end.add(this.add.rectangle(240, 350, 390, 210, 0x111a2d, 0.97));
    this.end.add(
      this.add
        .text(240, 302, t('games.pinball.over'), { ...style, fontSize: '29px' })
        .setOrigin(0.5),
    );
    const restart = this.add
      .text(240, 382, t('games.pinball.again'), {
        ...style,
        backgroundColor: '#b64668',
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    restart.on('pointerdown', () => {
      if (this.status === 'over') this.scene.restart({ snapshot: null });
    });
    this.end.add(restart);
    this.begin();
    this.input.addPointer(1);
    const down = (p: Phaser.Input.Pointer) => {
      if (this.status !== 'playing') return;
      const point = this.cameras.main.getWorldPoint(p.x, p.y);
      this.controls.press(point.x < 240 ? 'LEFT' : 'RIGHT', `pinball:${p.id}`);
    };
    const up = (p: Phaser.Input.Pointer) => {
      this.controls.release('LEFT', `pinball:${p.id}`);
      this.controls.release('RIGHT', `pinball:${p.id}`);
    };
    this.input.on('pointerdown', down);
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', down);
      this.input.off('pointerup', up);
      this.input.off('pointerupoutside', up);
    });
    this.draw();
  }
  update(_time: number, delta: number) {
    if (this.status === 'over') {
      this.controls.poll();
      if (this.controls.consume('START') || this.controls.consume('DROP'))
        this.scene.restart({ snapshot: null });
      return;
    }
    if (!this.frame(delta)) return;
    const drop = this.controls.consume('DROP'),
      start = this.controls.consume('START');
    if ((drop || start) && launchBall(this.state)) Audio.play('click');
    // Consume the press edges while keeping the held state, so a held flipper cannot restart a finished game.
    this.controls.consume('LEFT');
    this.controls.consume('RIGHT');
    stepPinball(this.state, delta / 1000, {
      left: this.controls.down('LEFT'),
      right: this.controls.down('RIGHT'),
    });
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      Audio.play('eat');
      this.publish();
    }
    this.draw();
    if (this.state.phase === 'over') this.finish('games.pinball.over');
  }
  protected snapshot() {
    return this.state.phase === 'over' ? null : this.state;
  }
  private draw() {
    const s = this.state;
    this.ball.setPosition(s.x, s.y);
    [s.left, s.right].forEach((angle, i) => {
      const f = flipper(i, angle);
      this.paddles[i].setPosition(f.x, f.y).setRotation(angle - Math.PI);
    });
    this.targets.forEach((image, i) => {
      image.setTint(s.lit[i] ? 0xffe78b : 0x7c8cab);
    });
    this.bumpers.forEach((image, i) => {
      image.setTint(s.cooldowns[i] > 0 ? 0xffffff : 0x5be4dc);
    });
    this.hud.setText(
      t('games.pinball.score', { score: s.score, balls: s.balls }),
    );
    this.hint.setText(
      t(s.bonus > 0 ? 'games.pinball.bonus' : 'games.pinball.targets'),
    );
    this.serve.setVisible(s.phase === 'ready');
    this.end.setVisible(s.phase === 'over');
  }
}

import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import { isHexSnapshot } from '../state';
import { createEngine, type HexEngine } from '../vendor/engine';

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    ArrowDown: 'DOWN',
    KeyS: 'DOWN',
    Space: 'DOWN',
    Enter: 'START',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  protected gamepadButtons = { 0: 'DOWN', 9: 'PAUSE' } as const;
  private engine!: HexEngine;
  private texture!: Phaser.Textures.CanvasTexture;
  private title!: Phaser.GameObjects.Text;
  private help!: Phaser.GameObjects.Text;
  private combo!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Text;
  private ready = true;
  private accumulator = 0;
  create() {
    this.accumulator = 0;
    const texture = this.textures.createCanvas('hextris-screen', 800, 800);
    if (!texture) throw new Error('Cannot create Hextris texture');
    this.texture = texture;
    this.engine = createEngine(texture.context, this.savedSnapshot);
    this.ready = !isHexSnapshot(this.savedSnapshot);
    this.score = this.engine.score;
    this.add.image(0, 0, 'hextris-screen').setOrigin(0);
    this.engine.drawInitial();
    texture.refresh();
    const style = {
      fontFamily: 'Trebuchet MS, sans-serif',
      color: '#2c3e50',
      fontSize: '28px',
    };
    this.title = this.add
      .text(400, 38, '', { ...style, fontSize: '42px' })
      .setOrigin(0.5);
    this.help = this.add
      .text(400, 744, '', {
        ...style,
        fontSize: '21px',
        align: 'center',
        wordWrap: { width: 730 },
      })
      .setOrigin(0.5);
    this.combo = this.add.text(400, 82, '', style).setOrigin(0.5);
    this.overlay = this.add
      .text(400, 650, '', {
        ...style,
        backgroundColor: '#ecf0f1',
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.status === 'over') {
        this.scene.restart({ snapshot: null });
        return;
      }
      if (this.status !== 'playing') return;
      const { x } = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.ready) {
        this.ready = false;
        return;
      }
      this.engine.rotate(x < 400 ? 1 : -1);
    });
    this.begin();
    this.events.once('shutdown', () => this.textures.remove('hextris-screen'));
    this.drawLabels();
  }
  update(_time: number, delta: number) {
    const running = this.frame(delta);
    const left = this.controls.consume('LEFT');
    const right = this.controls.consume('RIGHT');
    const start =
      this.controls.consume('START') || this.controls.consume('DOWN');
    if (this.status === 'over' && (start || left || right)) {
      this.scene.restart({ snapshot: null });
      return;
    }
    this.drawLabels();
    if (!running) {
      this.accumulator = 0;
      return;
    }
    if (this.ready) {
      if (left || right || start) this.ready = false;
      else return;
    }
    if (left) this.engine.rotate(1);
    if (right) this.engine.rotate(-1);
    this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= 1000 / 60) {
      this.engine.tick(this.controls.down('DOWN'));
      this.accumulator -= 1000 / 60;
      if (this.engine.over) break;
    }
    this.texture.refresh();
    if (this.engine.score !== this.score) {
      this.score = this.engine.score;
      Audio.play('clear');
      this.publish();
    }
    if (this.engine.over) this.finish();
  }
  private drawLabels() {
    this.title.setText(t('games.hextris.name'));
    this.help.setText(t('games.hextris.instructions'));
    this.combo.setText(this.engine.combo > 1 ? `× ${this.engine.combo}` : '');
    this.overlay.setText(
      this.status === 'over'
        ? t('games.hextris.over')
        : this.status === 'paused'
          ? t('games.hextris.paused')
          : this.ready
            ? t('games.hextris.start')
            : '',
    );
    this.overlay.setVisible(Boolean(this.overlay.text));
  }
  protected snapshot() {
    return this.ready ? null : this.engine.snapshot();
  }
}

import type Phaser from 'phaser';
import { useSettings } from '../../app/store';
import { SessionScene } from '../../core/session-scene';
import { t } from '../../i18n';
import { Audio } from '../../shared/audio';
import ceiling from './assets/ceiling.png';
import conveyorLeft from './assets/conveyor_left.png';
import conveyorRight from './assets/conveyor_right.png';
import flip from './assets/fake.png';
import hit from './assets/hit.wav';
import jump from './assets/jump.ogg';
import nails from './assets/nails.png';
import normal from './assets/normal.png';
import player from './assets/player.png';
import spring from './assets/trampoline.png';
import wall from './assets/wall.png';
import {
  CEILING,
  HEIGHT,
  isShaftState,
  newShaft,
  type ShaftState,
  stepShaft,
  WIDTH,
} from './logic';

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT' as const,
    KeyA: 'LEFT' as const,
    ArrowRight: 'RIGHT' as const,
    KeyD: 'RIGHT' as const,
    Enter: 'START' as const,
    Space: 'START' as const,
    Escape: 'PAUSE' as const,
    KeyP: 'PAUSE' as const,
  };
  protected gamepadButtons = { 0: 'START' as const, 9: 'PAUSE' as const };
  private state!: ShaftState;
  private player!: Phaser.GameObjects.Image;
  private floors = new Map<number, Phaser.GameObjects.Image>();
  private walls!: Phaser.GameObjects.TileSprite[];
  private life!: Phaser.GameObjects.Graphics;
  private depth!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private instructions!: Phaser.GameObjects.Text;
  private button!: Phaser.GameObjects.Text;
  private tapStart = false;

  preload() {
    this.load.image('shaft-wall', wall);
    this.load.image('shaft-ceiling', ceiling);
    this.load.image('shaft-normal', normal);
    this.load.image('shaft-nails', nails);
    this.load.spritesheet('shaft-player', player, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('shaft-left', conveyorLeft, {
      frameWidth: 96,
      frameHeight: 16,
    });
    this.load.spritesheet('shaft-right', conveyorRight, {
      frameWidth: 96,
      frameHeight: 16,
    });
    this.load.spritesheet('shaft-spring', spring, {
      frameWidth: 96,
      frameHeight: 22,
    });
    this.load.spritesheet('shaft-flip', flip, {
      frameWidth: 96,
      frameHeight: 36,
    });
  }

  create() {
    this.state = isShaftState(this.savedSnapshot)
      ? this.savedSnapshot
      : newShaft();
    this.score = this.state.score;
    this.floors = new Map();
    this.tapStart = false;
    this.cameras.main.setBackgroundColor('#171717');
    this.walls = [18, WIDTH - 18].map((x, index) =>
      this.add
        .tileSprite(x, CEILING, 18, HEIGHT - CEILING, 'shaft-wall')
        .setOrigin(index === 0 ? 1 : 0, 0)
        .setDepth(3),
    );
    this.add
      .image(0, CEILING - 16, 'shaft-ceiling')
      .setOrigin(0)
      .setDepth(4);
    this.player = this.add
      .image(this.state.x, this.state.y, 'shaft-player', 8)
      .setOrigin(0.5, 1)
      .setDepth(2);
    this.add
      .rectangle(0, 0, WIDTH, CEILING - 16, 0x292a2b)
      .setOrigin(0)
      .setDepth(5);
    const style = {
      fontFamily: '"Courier New", "PingFang SC", monospace',
      fontSize: '14px',
      color: '#f7f3d0',
    };
    this.add.text(14, 9, t('games.nsShaft.health'), style).setDepth(6);
    this.life = this.add.graphics().setDepth(6);
    this.depth = this.add
      .text(WIDTH - 14, 15, '', {
        ...style,
        fontSize: '17px',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(6);
    this.overlay = this.add
      .rectangle(WIDTH / 2, HEIGHT / 2 + 3, WIDTH - 42, 215, 0x101010, 0.93)
      .setStrokeStyle(2, 0xbcbca8)
      .setDepth(7);
    this.title = this.add
      .text(WIDTH / 2, 172, 'NS-SHAFT', {
        ...style,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#e8dc8a',
      })
      .setOrigin(0.5)
      .setDepth(8);
    this.instructions = this.add
      .text(WIDTH / 2, 241, '', {
        ...style,
        fontSize: '13px',
        align: 'center',
        lineSpacing: 12,
      })
      .setOrigin(0.5)
      .setDepth(8);
    this.button = this.add
      .text(WIDTH / 2, 317, '', {
        ...style,
        fontSize: '16px',
        color: '#181b15',
        backgroundColor: '#ddd78d',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.button.on('pointerdown', () => {
      if (this.state.phase === 'over') this.scene.restart({ snapshot: null });
      else this.tapStart = true;
    });
    this.begin();
    const unsubscribeLanguage = useSettings.subscribe((state, previous) => {
      if (state.language !== previous.language) this.draw();
    });
    this.events.once('shutdown', unsubscribeLanguage);
    const steer = (pointer: Phaser.Input.Pointer) => {
      if (this.status !== 'playing' || !pointer.isDown) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const source = `shaft:${pointer.id}`;
      this.controls.release('LEFT', source);
      this.controls.release('RIGHT', source);
      if (this.state.phase === 'ready') {
        this.tapStart = true;
        return;
      }
      this.controls.press(point.x < WIDTH / 2 ? 'LEFT' : 'RIGHT', source);
    };
    const release = (pointer: Phaser.Input.Pointer) => {
      this.controls.release('LEFT', `shaft:${pointer.id}`);
      this.controls.release('RIGHT', `shaft:${pointer.id}`);
    };
    this.input.on('pointerdown', steer);
    this.input.on('pointermove', steer);
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    const reset = this.controls.onReset(() => {
      this.tapStart = false;
    });
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', steer);
      this.input.off('pointermove', steer);
      this.input.off('pointerup', release);
      this.input.off('pointerupoutside', release);
      reset();
    });
    this.draw();
  }

  update(_time: number, delta: number) {
    if (this.status === 'over') {
      this.controls.poll();
      if (this.controls.consume('START'))
        this.scene.restart({ snapshot: null });
      return;
    }
    if (!this.frame(delta)) return;
    const direction =
      Number(this.controls.down('RIGHT')) - Number(this.controls.down('LEFT'));
    const result = stepShaft(
      this.state,
      delta / 1000,
      direction,
      this.controls.consume('START') || this.tapStart,
    );
    this.tapStart = false;
    this.state = result.state;
    if (result.sounds.includes('hit')) {
      Audio.playAsset(hit);
      this.cameras.main.flash(100, 180, 35, 28);
    } else if (result.sounds.includes('spring')) Audio.playAsset(jump);
    else if (result.sounds.includes('land')) Audio.play('click');
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      this.publish();
    }
    this.draw();
    if (this.state.phase === 'over') this.finish('games.nsShaft.over');
  }

  protected snapshot() {
    return this.state.phase === 'over' ? null : this.state;
  }

  private draw() {
    const state = this.state;
    for (const wallSprite of this.walls)
      wallSprite.tilePositionY = state.scroll;
    const ids = new Set(state.floors.map((floor) => floor.id));
    for (const [id, sprite] of this.floors)
      if (!ids.has(id)) {
        sprite.destroy();
        this.floors.delete(id);
      }
    for (const floor of state.floors) {
      let sprite = this.floors.get(floor.id);
      if (!sprite) {
        sprite = this.add
          .image(floor.x, floor.y, `shaft-${floor.kind}`)
          .setOrigin(0)
          .setDepth(1);
        this.floors.set(floor.id, sprite);
      }
      let frame = 0;
      if (floor.kind === 'left' || floor.kind === 'right')
        frame = Math.floor(state.elapsed * 16) % 4;
      if (floor.kind === 'spring')
        frame =
          floor.animation >= 0 && floor.animation < 0.35
            ? [4, 5, 4, 3, 2, 1, 0, 1, 2, 3][
                Math.min(9, Math.floor(floor.animation * 30))
              ]
            : 3;
      if (floor.kind === 'flip')
        frame =
          floor.animation < 0
            ? 0
            : Math.min(5, Math.floor(floor.animation * 14));
      if (floor.kind !== 'normal' && floor.kind !== 'nails')
        sprite.setFrame(frame);
      const offset =
        floor.kind === 'nails'
          ? 15
          : floor.kind === 'flip'
            ? 10
            : floor.kind === 'spring'
              ? 6
              : 0;
      sprite
        .setPosition(floor.x, floor.y - offset)
        .setAlpha(floor.kind === 'flip' && floor.animation > 0.43 ? 0.15 : 1);
    }
    const falling = state.grounded === null;
    const frame =
      state.facing < 0
        ? falling
          ? 18
          : 0
        : state.facing > 0
          ? falling
            ? 27
            : 9
          : falling
            ? 36
            : 8;
    this.player
      .setFrame(
        frame +
          (state.facing || falling
            ? Math.floor(state.elapsed * (falling ? 12 : 8)) % 4
            : 0),
      )
      .setPosition(state.x, state.y)
      .setAlpha(
        state.invincible > 0 && Math.floor(state.elapsed * 14) % 2 === 0
          ? 0.5
          : 1,
      );
    this.life.clear();
    for (let i = 0; i < 10; i++) {
      this.life.fillStyle(
        i < state.health ? (state.health <= 3 ? 0xdb5146 : 0xe0c83f) : 0x515151,
      );
      this.life.fillRect(14 + i * 14, 28, 11, 8);
    }
    this.depth.setText(t('games.nsShaft.depth', { floor: state.score }));
    const visible = state.phase !== 'playing';
    for (const object of [
      this.overlay,
      this.title,
      this.instructions,
      this.button,
    ])
      object.setVisible(visible);
    this.title.setText(
      state.phase === 'over' ? t('games.nsShaft.over') : 'NS-SHAFT',
    );
    this.instructions.setText(
      state.phase === 'over'
        ? t('games.nsShaft.depth', { floor: state.score })
        : t('games.nsShaft.ready'),
    );
    this.button.setText(
      t(state.phase === 'over' ? 'games.nsShaft.again' : 'games.nsShaft.begin'),
    );
  }
}

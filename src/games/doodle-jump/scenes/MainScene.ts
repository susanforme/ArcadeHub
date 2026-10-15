import Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import background from '../assets/background.png';
import doodler from '../assets/doodler-guy.png';
import platform from '../assets/platform.png';
import {
  type DoodleState,
  HEIGHT,
  isDoodleState,
  newDoodle,
  PLATFORM_WIDTH,
  PLAYER_HEIGHT,
  stepDoodle,
  WIDTH,
} from '../logic';

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
  private state!: DoodleState;
  private paper!: Phaser.GameObjects.TileSprite;
  private player!: Phaser.GameObjects.Image;
  private wrappedPlayer!: Phaser.GameObjects.Image;
  private platformImages = new Map<number, Phaser.GameObjects.Image>();
  private scoreText!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private result!: Phaser.GameObjects.Text;
  private again!: Phaser.GameObjects.Text;
  private tapStart = false;

  preload() {
    this.load.image('doodle-paper', background);
    this.load.image('doodle-player', doodler);
    this.load.image('doodle-platform', platform);
  }

  create() {
    this.state = isDoodleState(this.savedSnapshot)
      ? this.savedSnapshot
      : newDoodle();
    this.score = this.state.score;
    this.tapStart = false;
    this.platformImages = new Map();
    this.paper = this.add
      .tileSprite(0, 0, WIDTH, HEIGHT, 'doodle-paper')
      .setOrigin(0);
    this.player = this.add
      .image(0, 0, 'doodle-player')
      .setOrigin(0.5, 1)
      .setDepth(2);
    this.wrappedPlayer = this.add
      .image(0, 0, 'doodle-player')
      .setOrigin(0.5, 1)
      .setDepth(2);
    const style = {
      fontFamily: '"Comic Sans MS", "PingFang SC", cursive',
      fontSize: '20px',
      color: '#38352b',
      align: 'center',
    };
    this.add
      .rectangle(0, 0, WIDTH, 50, 0xf3eddb, 0.94)
      .setOrigin(0)
      .setDepth(4);
    this.scoreText = this.add
      .text(18, 12, '', { ...style, fontStyle: 'bold' })
      .setDepth(5);
    this.title = this.add
      .text(WIDTH / 2, 130, 'DOODLE\nJUMP', {
        ...style,
        fontSize: '54px',
        fontStyle: 'bold',
        color: '#5d7925',
        stroke: '#38352b',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(4)
      .setRotation(-0.05);
    this.hint = this.add
      .text(WIDTH / 2, 240, '', {
        ...style,
        fontSize: '17px',
        lineSpacing: 9,
        backgroundColor: '#f6f0e3',
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(4);
    this.add
      .rectangle(0, HEIGHT - 35, WIDTH, 35, 0xf3eddb, 0.88)
      .setOrigin(0)
      .setDepth(4);
    this.add
      .text(WIDTH / 2, HEIGHT - 17, t('games.doodleJump.footer'), {
        ...style,
        fontSize: '14px',
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.result = this.add
      .text(WIDTH / 2, 210, '', {
        ...style,
        fontSize: '30px',
        fontStyle: 'bold',
        lineSpacing: 16,
        backgroundColor: '#f6f0e3',
        padding: { x: 24, y: 22 },
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false);
    this.again = this.add
      .text(WIDTH / 2, 340, t('games.doodleJump.again'), {
        ...style,
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#638a32',
        padding: { x: 26, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(6)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.again.on('pointerdown', () => this.scene.restart({ snapshot: null }));
    this.begin();
    const steer = (pointer: Phaser.Input.Pointer) => {
      if (this.status !== 'playing' || !pointer.isDown) return;
      const source = `doodle:${pointer.id}`;
      this.controls.release('LEFT', source);
      this.controls.release('RIGHT', source);
      const x = this.cameras.main.getWorldPoint(pointer.x, pointer.y).x;
      this.controls.press(x < WIDTH / 2 ? 'LEFT' : 'RIGHT', source);
      this.tapStart = true;
    };
    const release = (pointer: Phaser.Input.Pointer) => {
      this.controls.release('LEFT', `doodle:${pointer.id}`);
      this.controls.release('RIGHT', `doodle:${pointer.id}`);
    };
    this.input.on('pointerdown', steer);
    this.input.on('pointermove', steer);
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    const offReset = this.controls.onReset(() => {
      this.tapStart = false;
    });
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', steer);
      this.input.off('pointermove', steer);
      this.input.off('pointerup', release);
      this.input.off('pointerupoutside', release);
      offReset();
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
    const start =
      this.controls.consume('START') || this.tapStart || direction !== 0;
    this.tapStart = false;
    const previousPhase = this.state.phase;
    const result = stepDoodle(this.state, delta / 1000, direction, start);
    this.state = result.state;
    if (
      result.bounced ||
      (previousPhase === 'ready' && this.state.phase === 'jumping')
    )
      Audio.play('click');
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      this.publish();
    }
    this.draw();
    if (this.state.phase === 'over') this.finish('games.doodleJump.over');
  }

  protected snapshot() {
    return this.state.phase === 'over' ? null : this.state;
  }

  private draw() {
    const { state } = this;
    // Render in logical screen coordinates so the shared DPR/resize camera stays intact.
    this.paper.tilePositionY = state.cameraTop;
    const ids = new Set(state.platforms.map((item) => item.id));
    for (const [id, sprite] of this.platformImages) {
      if (!ids.has(id)) {
        sprite.destroy();
        this.platformImages.delete(id);
      }
    }
    for (const item of state.platforms) {
      let sprite = this.platformImages.get(item.id);
      if (!sprite) {
        sprite = this.add
          .image(0, 0, 'doodle-platform')
          .setOrigin(0.5, 0)
          .setDisplaySize(PLATFORM_WIDTH, 13)
          .setDepth(1);
        this.platformImages.set(item.id, sprite);
      }
      sprite.setPosition(item.x, item.y - state.cameraTop);
    }
    const stretch =
      state.phase === 'jumping'
        ? Math.max(-0.06, Math.min(0.08, -state.velocity / 8000))
        : 0;
    for (const sprite of [this.player, this.wrappedPlayer])
      sprite
        .setFlipX(state.facing < 0)
        .setDisplaySize(52 * (1 - stretch), PLAYER_HEIGHT * (1 + stretch));
    this.player.setPosition(state.x, state.y - state.cameraTop);
    this.wrappedPlayer.setPosition(
      state.x + (state.x < WIDTH / 2 ? WIDTH : -WIDTH),
      state.y - state.cameraTop,
    );
    this.scoreText.setText(
      t('games.doodleJump.height', { score: state.score }),
    );
    this.title.setVisible(state.phase === 'ready');
    this.hint
      .setVisible(state.phase === 'ready')
      .setText(t('games.doodleJump.ready'));
    this.result
      .setVisible(state.phase === 'over')
      .setText(
        `${t('games.doodleJump.over')}\n${t('games.doodleJump.height', { score: state.score })}`,
      );
    this.again.setVisible(state.phase === 'over');
  }
}

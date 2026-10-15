import Phaser from 'phaser';
import { useSettings } from '../../app/store';
import { SessionScene } from '../../core/session-scene';
import { t } from '../../i18n';
import { Audio } from '../../shared/audio';
import pop from './assets/ball_pop.wav';
import fond1 from './assets/fond1.png';
import fond2 from './assets/fond2.png';
import fond3 from './assets/fond3.png';
import fond4 from './assets/fond4.png';
import fond5 from './assets/fond5.png';
import fond6 from './assets/fond6.png';
import fond7 from './assets/fond7.png';
import fond8 from './assets/fond8.png';
import fond9 from './assets/fond9.png';
import over from './assets/game_over.wav';
import clear from './assets/next_level.wav';
import hit from './assets/ough.wav';
import shoot from './assets/shoot.wav';
import sprites from './assets/sprites.png';
import { readPangInput } from './input';
import {
  activePlatforms,
  BALL_RADII,
  isPangState,
  LEVELS,
  newPang,
  type PangState,
  stepPang,
  WIDTH,
} from './logic';

const backgrounds = [
  fond1,
  fond2,
  fond3,
  fond4,
  fond5,
  fond6,
  fond7,
  fond8,
  fond9,
];
const cityKeys = [
  'games.pang.city1',
  'games.pang.city2',
  'games.pang.city3',
  'games.pang.city4',
  'games.pang.city5',
  'games.pang.city6',
  'games.pang.city7',
  'games.pang.city8',
  'games.pang.city9',
] as const;
const frames: Record<string, readonly [number, number, number, number]> = {
  right0: [70, 117, 31, 32],
  right1: [118, 117, 31, 32],
  right2: [164, 117, 31, 32],
  left0: [70, 153, 31, 32],
  left1: [118, 153, 31, 32],
  left2: [164, 153, 31, 32],
  shoot: [67, 70, 31, 32],
  dead: [168, 54, 48, 40],
  climb0: [200, 191, 26, 32],
  climb1: [230, 191, 26, 32],
  ball0: [10, 7, 48, 40],
  ball1: [70, 6, 32, 26],
  ball2: [109, 20, 16, 14],
  ball3: [131, 28, 8, 7],
  block20: [20, 88, 32, 8],
  block21: [20, 78, 32, 8],
  block22: [11, 102, 8, 32],
  block23: [21, 102, 8, 32],
  block24: [38, 102, 16, 8],
  block25: [38, 112, 16, 8],
  block26: [45, 122, 8, 8],
  block27: [45, 132, 8, 8],
  ladder: [71, 53, 22, 4],
  rope: [305, 11, 9, 210],
  glue: [293, 11, 9, 210],
  bonus2: [53, 191, 18, 18],
  bonus3: [11, 191, 18, 18],
  bonus5: [116, 191, 18, 18],
  bonus6: [32, 191, 18, 18],
  bonus7: [74, 191, 18, 18],
  bonus8: [158, 191, 18, 18],
};

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT' as const,
    KeyA: 'LEFT' as const,
    ArrowRight: 'RIGHT' as const,
    KeyD: 'RIGHT' as const,
    ArrowUp: 'UP' as const,
    KeyW: 'UP' as const,
    ArrowDown: 'DOWN' as const,
    KeyS: 'DOWN' as const,
    Space: 'DROP' as const,
    KeyZ: 'DROP' as const,
    KeyC: 'DROP' as const,
    Enter: 'START' as const,
    Escape: 'PAUSE' as const,
    KeyP: 'PAUSE' as const,
  };
  protected gamepadButtons = {
    0: 'DROP' as const,
    1: 'DROP' as const,
    9: 'PAUSE' as const,
  };
  private state!: PangState;
  private background!: Phaser.GameObjects.Image;
  private player!: Phaser.GameObjects.Image;
  private entities = new Map<string, Phaser.GameObjects.Image>();
  private scenery!: Phaser.GameObjects.Container;
  private sceneryLevel = 0;
  private effects!: Phaser.GameObjects.Graphics;
  private scoreLabel!: Phaser.GameObjects.Text;
  private stageLabel!: Phaser.GameObjects.Text;
  private timeLabel!: Phaser.GameObjects.Text;
  private cityLabel!: Phaser.GameObjects.Text;
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private weaponIcon!: Phaser.GameObjects.Image;
  private panel!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private button!: Phaser.GameObjects.Text;
  private touches = new Map<number, { x: number; y: number }>();
  private tapStart = false;

  preload() {
    this.load.image('pang-source', sprites);
    backgrounds.forEach((source, i) => {
      this.load.image(`pang-bg-${i + 1}`, source);
    });
  }

  private prepareAtlas() {
    if (this.textures.exists('pang-atlas')) return;
    const canvas = this.textures.createCanvas('pang-atlas', 320, 240);
    if (!canvas) throw new Error('Unable to create Pang sprite atlas');
    const context = canvas.getContext();
    context.imageSmoothingEnabled = false;
    context.drawImage(
      this.textures.get('pang-source').getSourceImage() as HTMLImageElement,
      0,
      0,
    );
    const pixels = context.getImageData(0, 0, 320, 240);
    for (let i = 0; i < pixels.data.length; i += 4)
      if (
        pixels.data[i] === 255 &&
        pixels.data[i + 1] === 0 &&
        pixels.data[i + 2] === 255
      )
        pixels.data[i + 3] = 0;
    context.putImageData(pixels, 0, 0);
    for (const [name, [x, y, width, height]] of Object.entries(frames))
      canvas.add(name, 0, x, y, width, height);
    canvas.setFilter(Phaser.Textures.FilterMode.NEAREST);
    canvas.refresh();
  }

  create() {
    this.prepareAtlas();
    this.state = isPangState(this.savedSnapshot)
      ? this.savedSnapshot
      : newPang();
    this.score = this.state.score;
    this.entities = new Map();
    this.touches = new Map();
    this.lifeIcons = [];
    this.sceneryLevel = 0;
    this.tapStart = false;
    this.background = this.add
      .image(0, 0, 'pang-bg-1')
      .setOrigin(0)
      .setScale(2);
    this.scenery = this.add.container(0, 0).setDepth(1);
    this.player = this.add
      .image(0, 0, 'pang-atlas', 'shoot')
      .setScale(2)
      .setOrigin(0.5, 1)
      .setDepth(3);
    this.effects = this.add.graphics().setDepth(4);
    this.add.rectangle(0, 416, WIDTH, 64, 0x102b44).setOrigin(0).setDepth(5);
    const style = {
      fontFamily: '"Courier New", "PingFang SC", monospace',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    };
    this.scoreLabel = this.add.text(16, 425, '', style).setDepth(6);
    this.stageLabel = this.add
      .text(WIDTH / 2, 425, '', style)
      .setOrigin(0.5, 0)
      .setDepth(6);
    this.timeLabel = this.add
      .text(WIDTH - 16, 425, '', style)
      .setOrigin(1, 0)
      .setDepth(6);
    this.cityLabel = this.add
      .text(WIDTH / 2, 454, '', {
        ...style,
        fontSize: '15px',
        color: '#b5def2',
      })
      .setOrigin(0.5, 0)
      .setDepth(6);
    for (let i = 0; i < 9; i++)
      this.lifeIcons.push(
        this.add
          .image(17 + i * 19, 458, 'pang-atlas', 'shoot')
          .setScale(0.55)
          .setOrigin(0, 0.5)
          .setDepth(6),
      );
    this.weaponIcon = this.add
      .image(602, 459, 'pang-atlas', 'bonus2')
      .setScale(1.2)
      .setDepth(6);
    this.panel = this.add
      .rectangle(WIDTH / 2, 210, 550, 276, 0x071521, 0.94)
      .setStrokeStyle(3, 0xe9b74b)
      .setDepth(7);
    this.title = this.add
      .text(WIDTH / 2, 119, '', {
        ...style,
        fontSize: '34px',
        color: '#ffe495',
        stroke: '#6a341e',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(8);
    this.hint = this.add
      .text(WIDTH / 2, 218, '', {
        ...style,
        fontSize: '17px',
        align: 'center',
        lineSpacing: 14,
      })
      .setOrigin(0.5)
      .setDepth(8);
    this.button = this.add
      .text(WIDTH / 2, 310, '', {
        ...style,
        fontSize: '20px',
        color: '#163044',
        backgroundColor: '#ffcf56',
        padding: { x: 24, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.button.on('pointerdown', () => {
      if (this.state.phase === 'over' || this.state.phase === 'won')
        this.scene.restart({ snapshot: null });
      else this.tapStart = true;
    });
    this.begin();
    const unsubscribeLanguage = useSettings.subscribe((state, previous) => {
      if (state.language !== previous.language) this.draw();
    });
    this.events.once('shutdown', unsubscribeLanguage);
    const release = (pointer: Phaser.Input.Pointer) => {
      const source = `pang:${pointer.id}`;
      for (const action of ['LEFT', 'RIGHT', 'UP', 'DOWN', 'DROP'] as const)
        this.controls.release(action, source);
      this.touches.delete(pointer.id);
    };
    const down = (pointer: Phaser.Input.Pointer) => {
      if (this.status !== 'playing') return;
      if (this.state.phase !== 'playing') {
        this.tapStart = true;
        return;
      }
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.touches.set(pointer.id, { x: point.x, y: point.y });
      this.controls.press('DROP', `pang:${pointer.id}`);
    };
    const move = (pointer: Phaser.Input.Pointer) => {
      const origin = this.touches.get(pointer.id);
      if (!origin || !pointer.isDown || this.status !== 'playing') return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const source = `pang:${pointer.id}`;
      for (const action of ['LEFT', 'RIGHT', 'UP', 'DOWN'] as const)
        this.controls.release(action, source);
      if (Math.abs(point.x - origin.x) > 12)
        this.controls.press(point.x < origin.x ? 'LEFT' : 'RIGHT', source);
      if (Math.abs(point.y - origin.y) > 18)
        this.controls.press(point.y < origin.y ? 'UP' : 'DOWN', source);
    };
    this.input.on('pointerdown', down);
    this.input.on('pointermove', move);
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    const reset = this.controls.onReset(() => {
      this.touches.clear();
      this.tapStart = false;
    });
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', down);
      this.input.off('pointermove', move);
      this.input.off('pointerup', release);
      this.input.off('pointerupoutside', release);
      reset();
    });
    this.draw();
  }

  update(_time: number, delta: number) {
    if (this.status === 'over') {
      this.controls.poll();
      if (readPangInput(this.controls).restart)
        this.scene.restart({ snapshot: null });
      return;
    }
    if (!this.frame(delta)) return;
    const input = readPangInput(this.controls, this.tapStart);
    const result = stepPang(this.state, delta / 1000, input);
    this.tapStart = false;
    this.state = result.state;
    const sources = { shoot, pop, hit, clear };
    for (const sound of new Set(result.sounds)) {
      if (sound === 'collect') Audio.play('eat');
      else Audio.playAsset(sources[sound]);
    }
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      this.publish();
    }
    this.draw();
    if (this.state.phase === 'won') this.finish('games.pang.won', false);
    else if (this.state.phase === 'over') {
      Audio.playAsset(over);
      this.finish('games.pang.over', false);
    }
  }

  protected snapshot() {
    return this.state.phase === 'over' || this.state.phase === 'won'
      ? null
      : this.state;
  }

  private draw() {
    const state = this.state;
    const level = LEVELS[state.level - 1];
    if (this.sceneryLevel !== state.level) {
      this.scenery.removeAll(true);
      this.background.setTexture(`pang-bg-${level.background}`);
      for (const ladder of level.ladders)
        for (let i = 0; i < ladder.rungs; i++)
          this.scenery.add(
            this.add
              .image(
                ladder.x * 2,
                (ladder.y + i * 4) * 2,
                'pang-atlas',
                'ladder',
              )
              .setOrigin(0)
              .setScale(2),
          );
      this.sceneryLevel = state.level;
    }
    const active = new Set<string>();
    const entity = (
      id: string,
      frame: string,
      x: number,
      y: number,
      origin = 0.5,
    ) => {
      active.add(id);
      let image = this.entities.get(id);
      if (!image) {
        image = this.add
          .image(0, 0, 'pang-atlas', frame)
          .setScale(2)
          .setDepth(2);
        this.entities.set(id, image);
      }
      image
        .setFrame(frame)
        .setPosition(x * 2, y * 2)
        .setOrigin(origin)
        .setAlpha(1)
        .clearTint();
      return image;
    };
    for (const block of activePlatforms(state))
      entity(
        `block:${state.level}:${block.id}`,
        `block${block.type}`,
        block.x,
        block.y,
        0,
      );
    for (const ball of state.balls) {
      const image = entity(
        `ball:${ball.id}`,
        `ball${ball.size}`,
        ball.x,
        ball.y,
      );
      if (state.freeze > 0) image.setTint(0xa6e8ff);
    }
    for (const shot of state.shots)
      entity(
        `shot:${shot.id}`,
        shot.weapon === 'glue' ? 'glue' : 'rope',
        shot.x,
        shot.top,
      )
        .setOrigin(0.5, 0)
        .setCrop(0, 0, 9, Math.max(1, shot.bottom - shot.top));
    for (const bonus of state.bonuses)
      entity(
        `bonus:${bonus.id}`,
        `bonus${bonus.kind}`,
        bonus.x,
        bonus.y,
      ).setAlpha(
        bonus.life < 2 && Math.floor(state.elapsed * 12) % 2 ? 0.25 : 1,
      );
    for (const [id, image] of this.entities)
      if (!active.has(id)) {
        image.destroy();
        this.entities.delete(id);
      }
    const direction = state.facing < 0 ? 'left' : 'right';
    const animation = Math.floor(state.elapsed * 9) % 3;
    const frame =
      state.phase === 'dead' || state.phase === 'over'
        ? 'dead'
        : state.climbing !== null
          ? `climb${state.moving ? Math.floor(state.elapsed * 8) % 2 : 0}`
          : state.fireCooldown > 0.1
            ? 'shoot'
            : `${direction}${state.moving ? animation : 0}`;
    this.player
      .setFrame(frame)
      .setPosition(state.x * 2, state.y * 2)
      .setAlpha(
        state.invincible > 0 && Math.floor(state.elapsed * 12) % 2 ? 0.4 : 1,
      );
    this.effects.clear();
    if (state.shield) {
      this.effects.lineStyle(3, 0x81f6ff, 0.8);
      this.effects.strokeEllipse(state.x * 2, state.y * 2 - 30, 60, 72);
    }
    for (const effect of state.pops) {
      this.effects.lineStyle(3, 0xffee7b, 1 - effect.age / 0.25);
      this.effects.strokeCircle(
        effect.x * 2,
        effect.y * 2,
        BALL_RADII[effect.size] * 2 + effect.age * 80,
      );
    }
    this.scoreLabel.setText(t('games.pang.score', { score: state.score }));
    this.stageLabel.setText(t('games.pang.stage', { level: state.level }));
    this.timeLabel
      .setText(t('games.pang.time', { time: Math.ceil(state.time) }))
      .setColor(state.time < 15 ? '#ff8d70' : '#ffffff');
    this.cityLabel.setText(t(cityKeys[level.background - 1]));
    this.lifeIcons.forEach((icon, i) => {
      icon.setVisible(i < state.lives);
    });
    this.weaponIcon
      .setVisible(state.weapon !== 'normal')
      .setFrame(state.weapon === 'glue' ? 'bonus3' : 'bonus2');
    const visible = state.phase !== 'playing';
    for (const object of [this.panel, this.title, this.hint, this.button])
      object.setVisible(visible);
    const title =
      state.phase === 'ready'
        ? 'PANG'
        : state.phase === 'cleared'
          ? t('games.pang.clear')
          : state.phase === 'dead'
            ? t('games.pang.dead')
            : state.phase === 'won'
              ? t('games.pang.won')
              : t('games.pang.over');
    this.title.setText(title);
    this.hint.setText(
      state.phase === 'ready'
        ? `${t(cityKeys[level.background - 1])} · ${t('games.pang.stage', { level: state.level })}\n\n${t('games.pang.ready')}`
        : `${t('games.pang.stage', { level: state.level })}\n${t('games.pang.score', { score: state.score })}`,
    );
    this.button.setText(
      t(
        state.phase === 'ready'
          ? 'games.pang.begin'
          : state.phase === 'dead'
            ? 'games.pang.retry'
            : state.phase === 'cleared'
              ? 'games.pang.next'
              : 'games.pang.again',
      ),
    );
  }
}

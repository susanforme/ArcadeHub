import Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import enemies from '../assets/enemies.png';
import levels from '../assets/levels.png';
import nickTom from '../assets/nick-tom.png';
import {
  HEIGHT,
  isSnowState,
  newSnow,
  type SnowInput,
  type SnowState,
  STAGES,
  STEP,
  stepSnow,
  WIDTH,
} from '../logic';

const HERO = 'snow-bros-hero';
const ENEMIES = 'snow-bros-enemies';
const LEVELS = 'snow-bros-levels';
const OFFSET_Y = 32;

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    ArrowUp: 'SECONDARY',
    KeyW: 'SECONDARY',
    Space: 'SECONDARY',
    KeyK: 'SECONDARY',
    KeyJ: 'DROP',
    KeyX: 'DROP',
    Enter: 'START',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  protected gamepadButtons = {
    0: 'DROP',
    1: 'SECONDARY',
    9: 'PAUSE',
  } as const;
  private state!: SnowState;
  private accumulator = 0;
  private jumpQueued = false;
  private fireQueued = false;
  private tapStart = false;
  private backdrop!: Phaser.GameObjects.Image;
  private hero!: Phaser.GameObjects.Image;
  private entities = new Map<number, Phaser.GameObjects.Image>();
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private scoreLabel!: Phaser.GameObjects.Text;
  private floorLabel!: Phaser.GameObjects.Text;
  private timeLabel!: Phaser.GameObjects.Text;
  private comboLabel!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private heading!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private action!: Phaser.GameObjects.Text;

  preload() {
    this.load.image(`${HERO}-raw`, nickTom);
    this.load.image(`${ENEMIES}-raw`, enemies);
    this.load.image(LEVELS, levels);
  }

  private spriteSheet(key: string) {
    if (this.textures.exists(key)) return this.textures.get(key);
    const source = this.textures.get(`${key}-raw`).getSourceImage();
    if (
      !(source instanceof HTMLImageElement) &&
      !(source instanceof HTMLCanvasElement)
    )
      throw new Error(`Invalid ${key} image source`);
    const texture = this.textures.createCanvas(
      key,
      source.width,
      source.height,
    );
    if (!texture) throw new Error(`Cannot create ${key} texture`);
    const context = texture.getContext();
    context.drawImage(source, 0, 0);
    const pixels = context.getImageData(0, 0, source.width, source.height);
    // The original rip uses this exact separator colour, not transparent pixels.
    for (let i = 0; i < pixels.data.length; i += 4)
      if (
        pixels.data[i] === 24 &&
        pixels.data[i + 1] === 224 &&
        pixels.data[i + 2] === 32
      )
        pixels.data[i + 3] = 0;
    context.putImageData(pixels, 0, 0);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    texture.refresh();
    return texture;
  }

  create() {
    this.state = isSnowState(this.savedSnapshot)
      ? structuredClone(this.savedSnapshot)
      : newSnow();
    this.score = this.state.score;
    this.accumulator = 0;
    this.jumpQueued = false;
    this.fireQueued = false;
    this.tapStart = false;
    this.entities = new Map();
    this.lifeIcons = [];
    const hero = this.spriteSheet(HERO);
    const foes = this.spriteSheet(ENEMIES);
    const frame = (
      texture: Phaser.Textures.Texture,
      name: string,
      x: number,
      y: number,
      w = 32,
      h = 32,
    ) => {
      if (!texture.has(name)) texture.add(name, 0, x, y, w, h);
    };
    for (let i = 0; i < 4; i++) {
      frame(hero, `walk-${i}`, i * 33, 0);
      frame(hero, `snow-${i + 1}`, i * 33, 347);
      frame(hero, `roll-${i}`, i * 33, 380);
      frame(hero, `food-${i}`, 165, 315 + i * 17, 16, 16);
      frame(foes, `goblin-${i}`, 165 + i * 33, 0);
      frame(foes, `monkey-${i}`, i * 33, 0);
      frame(foes, `spitter-${i}`, 330 + i * 33, 0);
    }
    frame(hero, 'jump', 0, 33);
    frame(hero, 'fire', 0, 66);
    frame(foes, 'flame', 528, 132);
    const stages = this.textures.get(LEVELS);
    stages.setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const [i, stage] of STAGES.entries())
      frame(stages, `stage-${i}`, stage.column * 256, 0, 256, 208);

    this.cameras.main.setBackgroundColor('#081525');
    this.backdrop = this.add
      .image(0, OFFSET_Y, LEVELS, 'stage-0')
      .setOrigin(0)
      .setScale(2);
    this.hero = this.add
      .image(0, 0, HERO, 'walk-0')
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(4);
    const style = {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#ffffff',
    };
    this.scoreLabel = this.add.text(12, 7, '', style).setDepth(10);
    this.floorLabel = this.add
      .text(292, 8, '', { ...style, fontSize: '14px' })
      .setOrigin(0.5, 0)
      .setDepth(10);
    for (let i = 0; i < 3; i++)
      this.lifeIcons.push(
        this.add
          .image(438 + i * 25, 15, HERO, 'walk-0')
          .setDisplaySize(23, 23)
          .setDepth(10),
      );
    this.hint = this.add
      .text(12, HEIGHT - 24, '', {
        ...style,
        fontSize: '12px',
        color: '#b8e6fa',
      })
      .setDepth(10);
    this.timeLabel = this.add
      .text(WIDTH - 12, HEIGHT - 24, '', { ...style, fontSize: '15px' })
      .setOrigin(1, 0)
      .setDepth(10);
    this.comboLabel = this.add
      .text(WIDTH / 2, 58, '', {
        ...style,
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#fff29d',
        stroke: '#202a44',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(8);

    this.panel = this.add.container(0, 0).setDepth(20);
    this.panel.add(
      this.add
        .rectangle(WIDTH / 2, 228, 446, 252, 0x071421, 0.92)
        .setStrokeStyle(2, 0x8ed9e7),
    );
    this.heading = this.add
      .text(WIDTH / 2, 148, '', {
        ...style,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#d4f6ff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.body = this.add
      .text(WIDTH / 2, 223, '', {
        ...style,
        fontSize: '16px',
        lineSpacing: 9,
        align: 'center',
        wordWrap: { width: 406 },
      })
      .setOrigin(0.5);
    this.action = this.add
      .text(WIDTH / 2, 316, '', {
        ...style,
        fontSize: '17px',
        color: '#ffdc7a',
        align: 'center',
      })
      .setOrigin(0.5);
    this.panel.add([this.heading, this.body, this.action]);
    this.begin();
    const tap = () => {
      if (this.state.phase === 'ready') this.tapStart = true;
      else if (this.state.phase === 'over' || this.state.phase === 'won')
        this.scene.restart({ snapshot: null });
    };
    this.input.on('pointerdown', tap);
    const offReset = this.controls.onReset(() => {
      this.jumpQueued = false;
      this.fireQueued = false;
      this.tapStart = false;
    });
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', tap);
      offReset();
    });
    this.draw();
  }

  update(_time: number, delta: number) {
    if (this.status === 'over') {
      this.controls.poll();
      if (
        this.controls.consume('START') ||
        this.controls.consume('DROP') ||
        this.controls.consume('SECONDARY')
      )
        this.scene.restart({ snapshot: null });
      return;
    }
    if (!this.frame(delta)) {
      this.accumulator = 0;
      return;
    }
    if (this.controls.consume('SECONDARY') || this.controls.consume('UP'))
      this.jumpQueued = true;
    if (this.controls.consume('DROP')) this.fireQueued = true;
    this.tapStart = this.controls.consume('START') || this.tapStart;
    this.accumulator += Math.min(delta, 100) / 1000;
    const previousStage = this.state.stage;
    const sounds = new Set<ReturnType<typeof stepSnow>[number]>();
    while (this.accumulator >= STEP) {
      const input: SnowInput = {
        move:
          Number(this.controls.down('RIGHT')) -
          Number(this.controls.down('LEFT')),
        jump: this.jumpQueued,
        fire: this.fireQueued || this.controls.down('DROP'),
        start: this.tapStart,
      };
      for (const sound of stepSnow(this.state, input)) sounds.add(sound);
      this.jumpQueued = false;
      this.fireQueued = false;
      this.tapStart = false;
      this.accumulator -= STEP;
    }
    if (sounds.has('hit')) Audio.play('over');
    else if (sounds.has('clear')) Audio.play('clear');
    else if (sounds.has('freeze') || sounds.has('roll') || sounds.has('pickup'))
      Audio.play('eat');
    else if (sounds.has('shot') || sounds.has('jump')) Audio.play('click');
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      this.publish();
    }
    if (previousStage !== this.state.stage) this.persist();
    this.draw();
    if (this.state.phase === 'over' || this.state.phase === 'won') {
      this.controls.reset();
      this.finish(
        this.state.phase === 'won'
          ? 'games.snowBros.won'
          : 'games.snowBros.over',
        false,
      );
    }
  }

  protected snapshot() {
    return this.state.phase === 'over' || this.state.phase === 'won'
      ? null
      : this.state;
  }

  private entity(
    id: number,
    texture: string,
    frame: string,
    x: number,
    y: number,
    scale = 2,
  ) {
    let image = this.entities.get(id);
    if (!image) {
      image = this.add
        .image(0, 0, texture, frame)
        .setOrigin(0.5, 1)
        .setDepth(3);
      this.entities.set(id, image);
    }
    image
      .setTexture(texture, frame)
      .setPosition(x * 2, OFFSET_Y + y * 2 + 4)
      .setScale(scale)
      .setAlpha(1)
      .setFlipX(false);
    return image;
  }

  private draw() {
    const state = this.state;
    const hero = state.player;
    const beat = Math.floor(state.time * 9) % 4;
    this.backdrop.setFrame(`stage-${state.stage}`);
    const frame =
      hero.firing > 0
        ? 'fire'
        : Math.abs(hero.vy) > 1
          ? 'jump'
          : `walk-${hero.moving ? beat : 0}`;
    // The source sheets face left, so rightward actors need the horizontal flip.
    this.hero
      .setFrame(frame)
      .setPosition(hero.x * 2, OFFSET_Y + hero.y * 2 + 6)
      .setFlipX(hero.facing > 0)
      .setAlpha(
        hero.invulnerable > 0 && Math.floor(state.time * 14) % 2 ? 0.35 : 1,
      );
    const active = new Set<number>();
    for (const enemy of state.enemies) {
      active.add(enemy.id);
      const frozen = enemy.snow === 4;
      const name = enemy.rolling
        ? `roll-${beat}`
        : frozen
          ? `snow-${enemy.snow}`
          : `${enemy.kind}-${enemy.snow > 0 ? 0 : beat}`;
      const image = this.entity(
        enemy.id,
        frozen ? HERO : ENEMIES,
        name,
        enemy.x,
        enemy.y,
      );
      image.setFlipX(enemy.facing > 0);
      if (enemy.snow > 0 && !frozen) {
        active.add(-enemy.id);
        this.entity(
          -enemy.id,
          HERO,
          `snow-${enemy.snow}`,
          enemy.x,
          enemy.y,
        ).setDepth(3.5);
      }
      if (enemy.snow === 4 && enemy.thaw < 1.5 && !enemy.rolling)
        image.setAlpha(Math.floor(state.time * 10) % 2 ? 0.6 : 1);
    }
    for (const shot of state.shots) {
      active.add(shot.id);
      this.entity(
        shot.id,
        shot.hostile ? ENEMIES : HERO,
        shot.hostile ? 'flame' : 'snow-1',
        shot.x,
        shot.y + 5,
        shot.hostile ? 1 : 0.65,
      ).setFlipX(shot.vx > 0);
    }
    for (const item of state.pickups) {
      active.add(item.id);
      this.entity(item.id, HERO, `food-${item.frame}`, item.x, item.y);
    }
    for (const [id, image] of this.entities) {
      if (active.has(id)) continue;
      image.destroy();
      this.entities.delete(id);
    }
    this.scoreLabel.setText(`1P ${String(state.score).padStart(6, '0')}`);
    this.floorLabel.setText(
      t('games.snowBros.floor', {
        floor: state.stage + 1,
        total: STAGES.length,
      }),
    );
    for (const [i, icon] of this.lifeIcons.entries())
      icon.setVisible(i < state.lives);
    this.hint.setText(t('games.snowBros.footer'));
    this.timeLabel
      .setText(`${Math.ceil(state.remaining)}s`)
      .setColor(state.remaining < 15 ? '#ff9f8e' : '#ffffff');
    this.comboLabel
      .setText(t('games.snowBros.combo', { count: state.bestCombo }))
      .setVisible(state.comboTime > 0 && state.bestCombo > 1);
    this.panel.setVisible(state.phase !== 'playing');
    if (state.phase === 'ready') {
      this.heading.setText(t('games.snowBros.name'));
      this.body.setText(t('games.snowBros.instructions'));
      this.action.setText(t('games.snowBros.tapStart'));
    } else if (state.phase === 'clear') {
      this.heading.setText(t('games.snowBros.clear'));
      this.body.setText(
        t('games.snowBros.clearedFloor', { floor: state.stage + 1 }),
      );
      this.action.setText(t('games.snowBros.score', { score: state.score }));
    } else if (state.phase === 'over' || state.phase === 'won') {
      this.heading.setText(
        t(state.phase === 'won' ? 'games.snowBros.won' : 'games.snowBros.over'),
      );
      this.body.setText(
        `${t('games.snowBros.score', { score: state.score })}\n${t('games.snowBros.combo', { count: state.bestCombo })}`,
      );
      this.action.setText(t('games.snowBros.again'));
    }
  }
}

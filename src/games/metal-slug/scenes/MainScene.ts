import Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import actors from '../assets/actors.png';
import beach from '../assets/beach.png';
import death from '../assets/death.mp3';
import explosion from '../assets/explosion.mp3';
import frames from '../assets/frames.json';
import heavy from '../assets/heavy.mp3';
import night from '../assets/night.png';
import pickup from '../assets/pickup.mp3';
import sand from '../assets/sand.png';
import shot from '../assets/shot.mp3';
import sky from '../assets/sky.png';
import snow from '../assets/snow.png';
import temple from '../assets/temple.png';
import {
  enemySize,
  GROUND,
  HEIGHT,
  isSlugState,
  LEVEL_LENGTH,
  newMission,
  platforms,
  type SlugInput,
  type SlugState,
  STEP,
  stepSlug,
  WIDTH,
} from '../logic';

const ATLAS = 'metal-slug-actors';
const sounds = { shot, heavy, explosion, pickup, death };
const animation = (prefix: string) =>
  Object.keys(frames).filter((name) => name.startsWith(prefix));
const animations = {
  idle: animation('marco/idle_pistol_'),
  walk: animation('marco/pistol_walking_'),
  legs: animation('marco/legs_idle_'),
  run: animation('marco/legs_walking_'),
  jump: animation('marco/jump_pistol_'),
  jumpLegs: animation('marco/legs_jump_'),
  fire: animation('marco/fire_pistol_'),
  up: animation('marco/pistol_up_'),
  upFire: animation('marco/pistol_up_firing_'),
  crouch: animation('marco/crouch_idle_'),
  crouchFire: animation('marco/crouch_firing_'),
  heavy: animation('marco/idle_heavymachine_'),
  heavyFire: animation('marco/fire_heavymachine_'),
  dead: animation('marco/death_animation_'),
  soldier: animation('soldier/soldier_running_'),
  crab: animation('crab/'),
  heli: animation('heli/'),
  boss1: animation('boss1/'),
  boss2: animation('boss2/ufo_attack_'),
  boss3: animation('boss3/Neo Geo NGCD - Metal Slug 3 - Sol Dae Rokker_35'),
  explosion: animation('explosion/granate_explosion_'),
  grenade: animation('explosion/throw_granate_'),
};
export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    ArrowUp: 'UP',
    KeyW: 'UP',
    ArrowDown: 'DOWN',
    KeyS: 'DOWN',
    Space: 'SECONDARY',
    KeyK: 'SECONDARY',
    KeyJ: 'DROP',
    KeyX: 'DROP',
    KeyL: 'SPECIAL',
    KeyC: 'SPECIAL',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
    Enter: 'START',
  } as const;
  protected gamepadButtons = {
    0: 'SECONDARY',
    1: 'DROP',
    2: 'SPECIAL',
    9: 'PAUSE',
  } as const;
  private state!: SlugState;
  private accumulator = 0;
  private terrainLevel = 0;
  private scenery: Phaser.GameObjects.GameObject[] = [];
  private body!: Phaser.GameObjects.Image;
  private legs!: Phaser.GameObjects.Image;
  private entities = new Map<number, Phaser.GameObjects.Image>();
  private graphics!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private sky!: Phaser.GameObjects.TileSprite;
  preload() {
    this.load.image(ATLAS, actors);
    for (const [key, url] of Object.entries({
      beach,
      sky,
      sand,
      night,
      snow,
      temple,
    }))
      this.load.image(`metal-slug-${key}`, url);
  }
  create() {
    this.state = isSlugState(this.savedSnapshot)
      ? structuredClone(this.savedSnapshot)
      : newMission();
    this.score = this.state.score;
    this.accumulator = 0;
    this.terrainLevel = 0;
    this.scenery = [];
    this.entities = new Map();
    const texture = this.textures.get(ATLAS);
    texture.setFilter(Phaser.Textures.NEAREST);
    for (const [name, [x, y, width, height]] of Object.entries(frames))
      if (!texture.has(name)) texture.add(name, 0, x, y, width, height);
    this.sky = this.add
      .tileSprite(0, 0, WIDTH, HEIGHT, 'metal-slug-sky')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-10);
    this.legs = this.add
      .image(0, 0, ATLAS, animations.legs[0])
      .setOrigin(0.5, 1)
      .setScale(1.5)
      .setDepth(5);
    this.body = this.add
      .image(0, 0, ATLAS, animations.idle[0])
      .setOrigin(0.5, 1)
      .setScale(1.5)
      .setDepth(6);
    this.graphics = this.add.graphics().setDepth(8);
    const style = {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#fff4ce',
      stroke: '#111820',
      strokeThickness: 3,
    };
    this.hud = this.add.text(16, 12, '', style).setScrollFactor(0).setDepth(20);
    this.hint = this.add
      .text(WIDTH / 2, HEIGHT - 17, '', { ...style, fontSize: '11px' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);
    this.banner = this.add
      .text(WIDTH / 2, HEIGHT / 2 - 45, '', {
        ...style,
        fontSize: '25px',
        align: 'center',
        backgroundColor: '#101a25dd',
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);
    this.begin();
    this.draw();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.accumulator = 0;
      this.draw();
      return;
    }
    this.accumulator += Math.min(delta / 1000, 0.1);
    // Keep edge-triggered actions queued until a simulation tick consumes them.
    if (this.accumulator < STEP) {
      this.draw();
      return;
    }
    const firePressed = this.controls.consume('DROP');
    const startPressed = this.controls.consume('START');
    const input: SlugInput = {
      left: this.controls.down('LEFT'),
      right: this.controls.down('RIGHT'),
      up: this.controls.down('UP'),
      down: this.controls.down('DOWN'),
      jump: this.controls.consume('SECONDARY'),
      fire: this.controls.down('DROP') || firePressed || startPressed,
      grenade: this.controls.consume('SPECIAL'),
    };
    const previousPhase = this.state.phase,
      previousLevel = this.state.level;
    const played = new Set<keyof typeof sounds>();
    while (this.accumulator >= STEP) {
      for (const sound of stepSlug(this.state, input)) played.add(sound);
      input.jump = false;
      input.grenade = false;
      this.accumulator -= STEP;
    }
    for (const sound of played) Audio.playAsset(sounds[sound]);
    if (this.state.score !== this.score) {
      this.score = this.state.score;
      this.publish();
    }
    if (
      previousLevel !== this.state.level ||
      previousPhase !== this.state.phase
    ) {
      if (this.state.phase === 'won' || this.state.phase === 'over')
        this.finish(
          this.state.phase === 'won'
            ? 'games.metal-slug.victory'
            : 'game.gameOver',
          false,
        );
      else {
        this.publish();
        this.persist();
      }
    }
    this.draw();
  }
  protected snapshot() {
    return this.state;
  }
  private animate(group: string[], rate = 10) {
    return group[Math.floor(this.state.time * rate) % group.length];
  }
  private terrain() {
    if (this.terrainLevel === this.state.level) return;
    this.terrainLevel = this.state.level;
    for (const object of this.scenery) object.destroy();
    this.scenery = [];
    const level = this.state.level;
    const key = level === 1 ? 'beach' : level === 2 ? 'snow' : 'temple';
    this.sky.setTexture(
      `metal-slug-${level === 1 ? 'sky' : level === 2 ? 'night' : 'temple'}`,
    );
    this.sky.tileScaleY = level === 1 ? HEIGHT / 155 : 1.2;
    this.cameras.main.setBackgroundColor(
      level === 1 ? '#317c8d' : level === 2 ? '#0d233a' : '#211c12',
    );
    for (let x = 0; x < LEVEL_LENGTH; x += level === 3 ? 2100 : 1600) {
      this.scenery.push(
        this.add
          .image(x, GROUND + 43, `metal-slug-${key}`)
          .setOrigin(0, 1)
          .setDepth(-2)
          .setDisplaySize(level === 3 ? 2100 : 1600, level === 3 ? 300 : 221),
      );
    }
    const ground = this.add.graphics().setDepth(-1);
    ground
      .fillStyle(level === 1 ? 0x9c8351 : level === 2 ? 0x344b5f : 0x54452f)
      .fillRect(0, GROUND, LEVEL_LENGTH, HEIGHT - GROUND);
    ground
      .fillStyle(level === 1 ? 0xd2ba76 : level === 2 ? 0x748b9c : 0x9d8152)
      .fillRect(0, GROUND, LEVEL_LENGTH, 4);
    ground.lineStyle(1, 0x131d21, 0.3);
    for (let x = 0; x < LEVEL_LENGTH; x += 32) {
      ground.lineBetween(x, GROUND + 5, x - 15, HEIGHT);
      ground.lineBetween(x, GROUND + 30, x + 32, GROUND + 30);
    }
    if (level === 1) {
      this.scenery.push(
        this.add
          .tileSprite(
            0,
            GROUND + 4,
            LEVEL_LENGTH,
            HEIGHT - GROUND,
            'metal-slug-sand',
          )
          .setOrigin(0)
          .setDepth(0),
      );
    }
    for (const platform of platforms) {
      ground
        .fillStyle(0x263c3f)
        .fillRect(platform.x, platform.y, platform.width, 10);
      ground
        .fillStyle(0xd2bb82)
        .fillRect(platform.x, platform.y, platform.width, 3);
      ground
        .fillStyle(0x354649)
        .fillRect(platform.x + 12, platform.y + 10, 8, GROUND - platform.y - 10)
        .fillRect(
          platform.x + platform.width - 20,
          platform.y + 10,
          8,
          GROUND - platform.y - 10,
        );
    }
    this.scenery.push(ground);
  }
  private draw() {
    this.terrain();
    const state = this.state,
      p = state.player;
    const scroll = Phaser.Math.Clamp(p.x - 230, 0, LEVEL_LENGTH - WIDTH);
    this.cameras.main.setScroll(scroll, 0);
    this.sky.tilePositionX = scroll * 0.15;
    const firing = p.firing > 0;
    const airborne = p.y < GROUND && p.vy !== 0;
    const body =
      state.phase === 'over'
        ? animations.dead
        : p.crouch
          ? firing
            ? animations.crouchFire
            : animations.crouch
          : p.aimUp
            ? firing
              ? animations.upFire
              : animations.up
            : p.ammo > 0
              ? firing
                ? animations.heavyFire
                : animations.heavy
              : firing
                ? animations.fire
                : airborne
                  ? animations.jump
                  : p.moving
                    ? animations.walk
                    : animations.idle;
    this.body
      .setFrame(this.animate(body))
      .setPosition(p.x, p.y - (p.crouch || state.phase === 'over' ? 0 : 19))
      .setFlipX(p.facing < 0);
    this.legs
      .setFrame(
        this.animate(
          airborne
            ? animations.jumpLegs
            : p.moving
              ? animations.run
              : animations.legs,
        ),
      )
      .setPosition(p.x, p.y)
      .setFlipX(p.facing < 0)
      .setVisible(!p.crouch && state.phase !== 'over');
    const alpha =
      p.invulnerable > 0 && Math.floor(state.time * 15) % 2 === 0 ? 0.35 : 1;
    this.body.setAlpha(alpha);
    this.legs.setAlpha(alpha);
    const visible = new Set<number>();
    const sprite = (id: number, frame: string, x: number, y: number) => {
      visible.add(id);
      let image = this.entities.get(id);
      if (!image) {
        image = this.add
          .image(x, y, ATLAS, frame)
          .setOrigin(0.5, 1)
          .setDepth(4);
        this.entities.set(id, image);
      }
      image.setFrame(frame).setPosition(x, y);
      return image;
    };
    this.graphics.clear();
    for (const enemy of state.enemies) {
      if (
        enemy.hp <= 0 ||
        enemy.x < scroll - 200 ||
        enemy.x > scroll + WIDTH + 200
      )
        continue;
      const { w, h } = enemySize(enemy.kind);
      sprite(
        enemy.id,
        this.animate(
          animations[enemy.kind],
          enemy.kind.startsWith('boss') ? 7 : 10,
        ),
        enemy.x,
        enemy.y,
      )
        .setDisplaySize(w, h)
        .setFlipX(
          enemy.kind === 'soldier' ? enemy.facing < 0 : enemy.facing > 0,
        );
      if (enemy.kind.startsWith('boss') && enemy.x - p.x < 600) {
        this.graphics
          .fillStyle(0x141a22, 0.9)
          .fillRect(scroll + 170, 43, 300, 9);
        this.graphics
          .fillStyle(0xf15c45)
          .fillRect(scroll + 172, 45, (296 * enemy.hp) / enemy.maxHp, 5);
      }
    }
    for (const projectile of state.projectiles) {
      if (projectile.kind === 'grenade')
        sprite(
          projectile.id,
          this.animate(animations.grenade, 16),
          projectile.x,
          projectile.y,
        )
          .setDisplaySize(14, 14)
          .setRotation(state.time * 9);
      else if (projectile.kind === 'rock') {
        if (projectile.ttl > 2.8)
          this.graphics
            .lineStyle(2, 0xff493b, 0.8)
            .strokeEllipse(projectile.x, GROUND, 48, 10);
        else
          this.graphics
            .fillStyle(0xbca785)
            .fillCircle(projectile.x, projectile.y, 13);
      } else {
        this.graphics
          .fillStyle(projectile.kind === 'bullet' ? 0xffef95 : 0xff7152)
          .fillRoundedRect(
            projectile.x - (projectile.vx ? 5 : 2),
            projectile.y - 2,
            projectile.vx ? 10 : 4,
            projectile.vx ? 4 : 10,
            2,
          );
      }
    }
    for (const effect of state.effects) {
      const index = Math.min(
        animations.explosion.length - 1,
        Math.floor((0.6 - effect.ttl) * 24),
      );
      sprite(
        effect.id,
        animations.explosion[Math.max(0, index)],
        effect.x,
        effect.y + 30,
      ).setDisplaySize(85, 100);
    }
    for (const [id, image] of this.entities)
      if (!visible.has(id)) {
        image.destroy();
        this.entities.delete(id);
      }
    for (const item of state.pickups) {
      if (item.taken || item.x < scroll - 30 || item.x > scroll + WIDTH + 30)
        continue;
      const y = GROUND - 25 + Math.sin(state.time * 3) * 4;
      this.graphics
        .fillStyle(item.kind === 'health' ? 0xe85a52 : 0xe3bd5e)
        .fillRoundedRect(item.x - 14, y - 14, 28, 25, 4);
      this.graphics.lineStyle(3, 0x22313d);
      if (item.kind === 'health')
        this.graphics
          .lineBetween(item.x, y - 9, item.x, y + 5)
          .lineBetween(item.x - 7, y - 2, item.x + 7, y - 2);
      else if (item.kind === 'heavy')
        this.graphics
          .lineBetween(item.x - 6, y - 9, item.x - 6, y + 5)
          .lineBetween(item.x + 6, y - 9, item.x + 6, y + 5)
          .lineBetween(item.x - 6, y - 2, item.x + 6, y - 2);
      else this.graphics.strokeCircle(item.x, y - 2, 7);
    }
    this.hud.setText(
      t('games.metal-slug.hud', {
        level: state.level,
        hp: p.hp,
        bombs: p.grenades,
        ammo: p.ammo || '∞',
        score: state.score,
      }),
    );
    this.hint.setText(t('games.metal-slug.hint'));
    const message =
      this.status === 'paused'
        ? t('player.pause')
        : state.phase === 'ready'
          ? t('games.metal-slug.ready')
          : state.phase === 'clear'
            ? t('games.metal-slug.clear', { level: state.level })
            : state.phase === 'won'
              ? t('games.metal-slug.victory')
              : state.phase === 'over'
                ? t('game.gameOver')
                : '';
    this.banner.setText(message).setVisible(Boolean(message));
  }
}

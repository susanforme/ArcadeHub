import type Phaser from 'phaser';
import { SessionScene } from '../../core/session-scene';
import { t } from '../../i18n';
import { Audio } from '../../shared/audio';
import {
  type AquariumState,
  eggCost,
  isAquariumState,
  newAquariumState,
  stepAquarium,
  tankAction,
  tapTank,
} from './logic';

const assets = import.meta.glob('./assets/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
export class AquariumScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    Space: 'DROP',
    Digit1: 'SPECIAL',
    Digit2: 'SECONDARY',
    Digit3: 'THRUST',
    Digit4: 'MODE',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  private state!: AquariumState;
  private hud!: Phaser.GameObjects.Text;
  private warning!: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Text[] = [];
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private gauges!: Phaser.GameObjects.Graphics;
  private monster!: Phaser.GameObjects.Image;
  private aim!: Phaser.GameObjects.Arc;
  private pointer = { x: 300, y: 350 };
  preload() {
    for (const [path, url] of Object.entries(assets))
      this.load.image(`aq-${path.split('/').pop()?.replace('.png', '')}`, url);
  }
  create() {
    const frames: Record<string, [number, number, number, number]> = {
      fish_pink: [12, 21, 40, 23],
      fish_orange: [5, 17, 54, 30],
      bubble_a: [26, 26, 12, 12],
      hud_dollar: [13, 10, 38, 47],
    };
    for (const [name, frame] of Object.entries(frames)) {
      const texture = this.textures.get(`aq-${name}`);
      if (!texture.has('trimmed')) texture.add('trimmed', 0, ...frame);
    }

    this.state = isAquariumState(this.savedSnapshot)
      ? structuredClone(this.savedSnapshot)
      : newAquariumState();
    this.score = this.state.score;
    this.sprites.clear();
    this.buttons = [];
    this.pointer = { x: 300, y: 350 };
    this.cameras.main.setBackgroundColor('#073c59');
    this.add
      .rectangle(300, 430, 576, 570, 0x168eac)
      .setStrokeStyle(8, 0x9cc7c7);
    this.add.rectangle(300, 704, 568, 28, 0xe5c888);
    for (let i = 0; i < 7; i++)
      this.add
        .image(
          25 + i * 90,
          700,
          i % 2 ? 'aq-seaweed_green_a' : 'aq-seaweed_pink_b',
        )
        .setOrigin(0.5, 1)
        .setScale(1.8);
    for (let i = 0; i < 12; i++)
      this.add
        .image(30 + ((i * 127) % 540), 200 + ((i * 73) % 450), 'aq-bubble_a')
        .setAlpha(0.25);
    this.add.text(22, 17, t('games.insaniquarium.name'), {
      fontSize: '27px',
      fontStyle: 'bold',
      color: '#fff',
    });
    this.hud = this.add.text(22, 55, '', {
      fontSize: '20px',
      color: '#ffdc76',
    });
    for (let i = 0; i < 4; i++) {
      const x = 80 + i * 146;
      this.add
        .rectangle(x, 111, 136, 55, 0x246278)
        .setStrokeStyle(1, 0x8ad8db)
        .setInteractive()
        .on('pointerdown', () => this.buy(i));
      this.add
        .image(
          x - 43,
          111,
          i === 0
            ? 'aq-fish_orange'
            : i === 1
              ? 'aq-grain'
              : i === 2
                ? 'aq-laser-blast'
                : 'aq-egg-clutch',
        )
        .setFrame(i === 0 ? 'trimmed' : '__BASE')
        .setDisplaySize(30, 25);
      this.buttons.push(
        this.add
          .text(x + 12, 111, '', {
            fontSize: '14px',
            color: '#fff',
            align: 'center',
            wordWrap: { width: 97 },
          })
          .setOrigin(0.5),
      );
    }
    this.warning = this.add
      .text(300, 738, '', {
        fontSize: '17px',
        color: '#ffe6a4',
        align: 'center',
      })
      .setOrigin(0.5);
    this.gauges = this.add.graphics().setDepth(5);
    this.monster = this.add
      .image(50, 300, 'aq-alien-skull')
      .setDisplaySize(85, 85)
      .setTint(0xff6677)
      .setDepth(4)
      .setVisible(false);
    this.aim = this.add
      .circle(300, 350, 14, 0xffffff, 0)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setDepth(6)
      .setVisible(false);
    const point = (p: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.status !== 'playing' || world.y < 160 || world.y > 715) return;
      this.pointer = { x: world.x, y: world.y };
      this.tap();
    };
    this.input.on('pointerdown', point);
    this.events.once('shutdown', () => this.input.off('pointerdown', point));
    this.add
      .text(300, 767, 'Art: Kenney · Lorc / Delapouite (CC BY 3.0)', {
        fontSize: '11px',
        color: '#9ecbd7',
      })
      .setOrigin(0.5);
    this.begin();
    this.draw();
  }
  private buy(i: number) {
    if (this.status !== 'playing') return;
    if (
      tankAction(this.state, (['fish', 'food', 'laser', 'egg'] as const)[i])
    ) {
      Audio.play('click');
      this.score = this.state.score;
      this.publish();
      this.persist();
      this.draw();
    }
  }
  private tap() {
    if (tapTank(this.state, this.pointer.x, this.pointer.y)) {
      Audio.play('click');
      this.score = this.state.score;
      this.publish();
      this.draw();
    }
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) return;
    const dt = Math.min(delta / 1000, 0.05),
      dx =
        Number(this.controls.down('RIGHT')) -
        Number(this.controls.down('LEFT')),
      dy =
        Number(this.controls.down('DOWN')) - Number(this.controls.down('UP'));
    if (dx || dy) {
      this.pointer.x = Math.max(
        30,
        Math.min(570, this.pointer.x + dx * 300 * dt),
      );
      this.pointer.y = Math.max(
        170,
        Math.min(700, this.pointer.y + dy * 300 * dt),
      );
      this.aim.setVisible(true);
    }
    if (this.controls.consume('DROP')) this.tap();
    for (const [i, key] of (
      ['SPECIAL', 'SECONDARY', 'THRUST', 'MODE'] as const
    ).entries())
      if (this.controls.consume(key)) this.buy(i);
    stepAquarium(this.state, dt);
    this.score = this.state.score;
    this.draw();
    if (this.state.eggs >= 3) {
      this.end(true);
    } else if (
      !this.state.fish.length &&
      this.state.money + this.state.coins.reduce((sum, c) => sum + c.value, 0) <
        100
    ) {
      this.end(false);
    }
  }
  private end(won: boolean) {
    this.finish(won ? 'games.insaniquarium.win' : 'game.gameOver');
    this.add.rectangle(300, 390, 500, 220, 0x052d45, 0.97).setDepth(10);
    this.add
      .text(300, 337, t(won ? 'games.insaniquarium.win' : 'game.gameOver'), {
        fontSize: '30px',
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(
        300,
        420,
        t(won ? 'games.insaniquarium.next' : 'game.playAgainAction'),
        {
          fontSize: '24px',
          backgroundColor: '#c79843',
          padding: { x: 25, y: 15 },
        },
      )
      .setOrigin(0.5)
      .setDepth(11)
      .setInteractive()
      .on('pointerdown', () => {
        const next = won
          ? newAquariumState(Math.min(1000, this.state.level + 1))
          : null;
        if (next) next.score = this.score;
        this.scene.restart({ snapshot: next });
      });
  }
  private draw() {
    const s = this.state;
    this.hud.setText(
      t('games.insaniquarium.hud', {
        level: s.level,
        money: s.money,
        eggs: s.eggs,
      }),
    );
    const texts = [
      t('games.insaniquarium.buy'),
      t('games.insaniquarium.food', {
        level: s.foodLevel,
        cost: s.foodLevel >= 3 ? 'MAX' : s.foodLevel * 200,
      }),
      t('games.insaniquarium.laser', {
        level: s.laserLevel,
        cost: s.laserLevel >= 3 ? 'MAX' : s.laserLevel * 200,
      }),
      t('games.insaniquarium.egg', { cost: eggCost(s) }),
    ];
    this.buttons.forEach((b, i) => {
      b.setText(texts[i]);
    });
    this.warning.setText(
      s.monster
        ? t('games.insaniquarium.invasion')
        : t('games.insaniquarium.warning', { seconds: Math.ceil(s.invasion) }),
    );
    const entries = [
      ...s.fish.map((f) => ({
        id: f.id,
        x: f.x,
        y: f.y,
        texture: f.growth >= 4 ? 'fish_pink' : 'fish_orange',
        w: 42 + f.growth * 5,
        h: 27 + f.growth * 3,
        flip: f.direction < 0,
      })),
      ...s.food.map((f) => ({
        id: f.id,
        x: f.x,
        y: f.y,
        texture: 'grain',
        w: 12,
        h: 10,
        flip: false,
      })),
      ...s.coins.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        texture: 'hud_dollar',
        w: c.value >= 75 ? 28 : 22,
        h: c.value >= 75 ? 32 : 25,
        flip: false,
      })),
    ];
    const ids = new Set(entries.map((e) => e.id));
    for (const [id, image] of this.sprites)
      if (!ids.has(id)) {
        image.destroy();
        this.sprites.delete(id);
      }
    for (const e of entries) {
      let image = this.sprites.get(e.id);
      if (!image) {
        image = this.add.image(e.x, e.y, `aq-${e.texture}`).setDepth(3);
        this.sprites.set(e.id, image);
      }
      image
        .setTexture(
          `aq-${e.texture}`,
          e.texture.startsWith('fish_') || e.texture === 'hud_dollar'
            ? 'trimmed'
            : '__BASE',
        )
        .setPosition(e.x, e.y)
        .setDisplaySize(e.w, e.h)
        .setFlipX(e.flip);
    }
    this.gauges.clear();
    for (const f of s.fish) {
      this.gauges
        .fillStyle(0x064758)
        .fillRect(f.x - 18, f.y + 25, 36, 4)
        .fillStyle(f.hunger < 25 ? 0xff6876 : 0x8aeac3)
        .fillRect(f.x - 18, f.y + 25, (36 * f.hunger) / 100, 4);
    }
    this.monster.setVisible(!!s.monster);
    if (s.monster) {
      this.monster.setPosition(s.monster.x, s.monster.y);
      this.gauges
        .fillStyle(0xff4455)
        .fillRect(
          s.monster.x - 45,
          s.monster.y - 40,
          (90 * s.monster.hp) / (12 + s.level * 4),
          6,
        );
    }
    this.aim.setPosition(this.pointer.x, this.pointer.y);
  }
  protected snapshot() {
    return this.state;
  }
}

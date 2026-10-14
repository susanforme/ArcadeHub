import type Phaser from 'phaser';
import { useSettings } from '../../../app/store';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import crateImage from '../assets/crate.png';
import gemSound from '../assets/gem.ogg';
import fireGem from '../assets/gem-fire.png';
import waterGem from '../assets/gem-water.png';
import jumpSound from '../assets/jump.ogg';
import leverOff from '../assets/lever-off.png';
import leverOn from '../assets/lever-on.png';
import plateOff from '../assets/plate-off.png';
import plateOn from '../assets/plate-on.png';
import firePool from '../assets/pool-fire.png';
import waterPool from '../assets/pool-water.png';
import stoneImage from '../assets/stone.png';
import wallImage from '../assets/wall.png';
import { LEVELS, type Rect } from '../levels';
import {
  continueTemple,
  gateOpen,
  type HeroInput,
  isTempleState,
  KIND,
  newTemple,
  plateActive,
  stepTemple,
  type TempleState,
} from '../logic';

const colors = { fire: 0xff9c55, water: 0x68d8ec, poison: 0xb1d45e };
const images = {
  crate: crateImage,
  fireGem,
  waterGem,
  leverOff,
  leverOn,
  plateOff,
  plateOn,
  firePool,
  waterPool,
  stone: stoneImage,
  wall: wallImage,
};
export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'FIRE_LEFT',
    ArrowRight: 'FIRE_RIGHT',
    ArrowUp: 'AIM_UP',
    ArrowDown: 'SPECIAL',
    KeyA: 'P2_LEFT',
    KeyD: 'P2_RIGHT',
    KeyW: 'P2_UP',
    KeyS: 'P2_DOWN',
    KeyQ: 'MODE',
    KeyE: 'SECONDARY',
    Space: 'DROP',
    Enter: 'DROP',
    KeyR: 'START',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  protected gamepadButtons = {
    0: 'UP',
    1: 'SECONDARY',
    2: 'MODE',
    3: 'DROP',
    9: 'PAUSE',
  } as const;
  private state!: TempleState;
  private art!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private selection!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private panelKey = '';
  private exitLabels: Phaser.GameObjects.Text[] = [];
  private sprites = new Map<string, Phaser.GameObjects.Image>();

  preload() {
    for (const [name, url] of Object.entries(images))
      this.load.image(`temple-${name}`, url);
  }

  create() {
    this.state = isTempleState(this.savedSnapshot)
      ? this.savedSnapshot
      : newTemple();
    this.score = this.state.score;
    this.panelKey = '';
    this.exitLabels = [];
    this.sprites = new Map();
    // Kenney tiles include transparent padding; use their visible gem frame.
    for (const name of ['fireGem', 'waterGem'])
      this.textures.get(`temple-${name}`).add('gem', 0, 18, 23, 34, 24);
    this.background();
    this.art = this.add.graphics();
    this.hud = this.text(34, 70, '', 20);
    this.hint = this.text(480, 613, '', 16).setOrigin(0.5);
    this.selection = this.button(726, 32, '', () => {
      if (this.state.phase === 'playing') this.switchHero();
    });
    this.button(879, 32, t('games.fireboy-watergirl.retry'), () =>
      this.retry(),
    );
    this.panel = this.add.container(0, 0).setDepth(10);
    this.exitLabels = LEVELS[this.state.level].exits.map((exit) =>
      this.text(exit.x, exit.y - 66, '', 13).setOrigin(0.5),
    );
    this.begin();
    this.draw();
  }
  update(_time: number, delta: number) {
    const active = this.frame(delta);
    const start = this.controls.consume('DROP');
    if (this.status === 'over') {
      if (start) this.scene.restart({ snapshot: null });
      return;
    }
    if (!active) return;
    if (this.controls.consume('START')) {
      this.retry();
      return;
    }
    if (this.controls.consume('MODE')) this.switchHero();
    if (start && this.state.phase !== 'playing') this.advance();
    const genericJump = this.controls.consume('UP');
    const genericInteract =
      this.controls.consume('SECONDARY') || this.controls.consume('DOWN');
    const input: [HeroInput, HeroInput] = [
      {
        move:
          Number(this.controls.down('FIRE_RIGHT')) -
          Number(this.controls.down('FIRE_LEFT')),
        jump: this.controls.consume('AIM_UP'),
        interact: this.controls.consume('SPECIAL'),
      },
      {
        move:
          Number(this.controls.down('P2_RIGHT')) -
          Number(this.controls.down('P2_LEFT')),
        jump: this.controls.consume('P2_UP'),
        interact: this.controls.consume('P2_DOWN'),
      },
    ];
    input[this.state.selected].move +=
      Number(this.controls.down('RIGHT')) - Number(this.controls.down('LEFT'));
    input[this.state.selected].jump ||= genericJump;
    input[this.state.selected].interact ||= genericInteract;
    for (const event of stepTemple(this.state, delta / 1000, input)) {
      if (event === 'jump') Audio.playAsset(jumpSound);
      if (event === 'gem') Audio.playAsset(gemSound);
      if (event === 'lever') Audio.play('click');
      if (event === 'failed') Audio.play('over');
      if (event === 'clear' || event === 'won') Audio.play('clear');
      this.score = this.state.score;
      if (event === 'won') this.finish('games.fireboy-watergirl.won', false);
      else this.publish();
      if (event !== 'jump') this.persist();
    }
    this.draw();
  }
  protected snapshot() {
    return this.state.phase === 'won' ? null : this.state;
  }
  private switchHero() {
    this.state.selected = this.state.selected === 0 ? 1 : 0;
    this.controls.reset();
    this.draw();
  }
  private retry() {
    if (this.status !== 'playing' || this.state.phase === 'won') return;
    this.state = newTemple(this.state.level, this.state.baseScore);
    this.controls.reset();
    this.score = this.state.score;
    this.publish();
    this.persist();
    this.draw();
  }
  private advance() {
    if (this.status === 'paused') return;
    if (this.state.phase === 'won') {
      this.scene.restart({ snapshot: null });
      return;
    }
    this.state = continueTemple(this.state);
    if (this.state.phase === 'ready') this.state.phase = 'playing';
    this.controls.reset();
    this.score = this.state.score;
    this.publish();
    this.persist();
    this.draw();
  }
  private text(
    x: number,
    y: number,
    message: string,
    size = 20,
    color = '#e6efd2',
  ) {
    return this.add.text(x, y, message, {
      fontFamily: 'Arial, "PingFang SC", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      lineSpacing: 12,
    });
  }
  private button(x: number, y: number, message: string, callback: () => void) {
    const label = this.text(x, y, message, 17)
      .setOrigin(0.5)
      .setPadding(16, 10)
      .setBackgroundColor('#34594b')
      .setInteractive({ useHandCursor: true });
    label.on('pointerdown', () => {
      if (this.status !== 'paused') callback();
    });
    label.on('pointerover', () => label.setBackgroundColor('#487564'));
    label.on('pointerout', () => label.setBackgroundColor('#34594b'));
    return label;
  }
  private background() {
    const g = this.add.graphics();
    g.fillStyle(0x101f22).fillRect(0, 0, 960, 640);
    g.fillStyle(0x172d2c).fillRoundedRect(24, 111, 912, 480, 18);
    this.add
      .tileSprite(24, 112, 912, 480, 'temple-wall')
      .setOrigin(0)
      .setAlpha(0.08);
    for (const x of [42, 140, 818, 916]) {
      g.fillStyle(0x26443b).fillRect(x, 114, 10, 120 + (x % 80));
      for (let y = 127; y < 235 + (x % 80); y += 24) {
        g.fillStyle(0x3f6650)
          .fillEllipse(x - 3, y, 22, 10)
          .fillEllipse(x + 14, y + 10, 22, 10);
      }
    }
    g.fillStyle(0x223d34).fillRoundedRect(24, 12, 912, 90, 12);
    this.text(38, 30, 'F O R E S T   T E M P L E', 19, '#b7cb89');
    g.lineStyle(1, 0x426253).lineBetween(24, 597, 936, 597);
  }
  private stone(r: Rect) {
    for (let x = r.x; x < r.x + r.w; x += 48) {
      const width = Math.min(48, r.x + r.w - x);
      this.sprite(
        `stone-${x}-${r.y}`,
        'stone',
        x + width / 2,
        r.y + r.h / 2,
        width,
        r.h,
      );
    }
  }
  private sprite(
    id: string,
    texture: keyof typeof images,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    let sprite = this.sprites.get(id);
    if (!sprite) {
      sprite = this.add.image(x, y, `temple-${texture}`).setDepth(2);
      this.sprites.set(id, sprite);
    }
    return sprite
      .setTexture(`temple-${texture}`)
      .setFrame(
        texture === 'fireGem' || texture === 'waterGem' ? 'gem' : '__BASE',
      )
      .setPosition(x, y)
      .setDisplaySize(width, height)
      .setVisible(true);
  }
  private draw() {
    const s = this.state,
      map = LEVELS[s.level],
      g = this.art.clear();
    this.art.setDepth(3);
    for (const sprite of this.sprites.values()) sprite.setVisible(false);
    this.hud.setText(
      t('games.fireboy-watergirl.hud', {
        level: s.level + 1,
        gems: s.gems.filter(Boolean).length,
        total: s.gems.length,
        time: Math.ceil(s.remaining),
      }),
    );
    this.hud.setColor(s.remaining < 20 ? '#ffab89' : '#e6efd2');
    this.selection.setText(
      t(
        s.selected === 0
          ? 'games.fireboy-watergirl.selectedFire'
          : 'games.fireboy-watergirl.selectedWater',
      ),
    );
    this.selection.setColor(s.selected === 0 ? '#ffae74' : '#7fe3f2');
    this.hint.setText(t('games.fireboy-watergirl.hint'));
    for (const r of map.platforms) this.stone(r);
    map.pools.forEach((pool, i) => {
      const texture = pool.kind === 'fire' ? 'firePool' : 'waterPool';
      this.sprite(
        `pool-${i}`,
        texture,
        pool.x + pool.w / 2,
        pool.y + 5,
        pool.w,
        15,
      )
        .setDepth(4)
        .setTint(pool.kind === 'poison' ? colors.poison : 0xffffff);
    });
    map.exits.forEach((exit, i) => {
      const ready = s.gems.every(Boolean),
        color = colors[exit.kind];
      g.fillStyle(color, ready ? 0.25 : 0.08).fillRoundedRect(
        exit.x - 24,
        exit.y - 60,
        48,
        60,
        20,
      );
      g.lineStyle(3, color, ready ? 1 : 0.5).strokeRoundedRect(
        exit.x - 24,
        exit.y - 60,
        48,
        60,
        20,
      );
      g.fillStyle(color).fillTriangle(
        exit.x - 8,
        exit.y - 35,
        exit.x + 8,
        exit.y - 35,
        exit.x,
        exit.y - 47,
      );
      this.exitLabels[i].setText(
        t(
          exit.kind === 'fire'
            ? 'games.fireboy-watergirl.fire'
            : 'games.fireboy-watergirl.water',
        ),
      );
    });
    map.plates.forEach((plate, i) => {
      this.sprite(
        `plate-${i}`,
        plateActive(s, i) ? 'plateOn' : 'plateOff',
        plate.x + plate.w / 2,
        plate.y + 1,
        plate.w,
        12,
      ).setDepth(4);
    });
    map.gates.forEach((gate, i) => {
      const open = gateOpen(s, i),
        color = s.latched[i] ? 0xb8da81 : 0xcfb67a;
      g.fillStyle(0x8c8061).fillRect(gate.x - 4, gate.y - 6, gate.w + 8, 8);
      if (!open) {
        g.fillStyle(0x96815c).fillRect(gate.x, gate.y, gate.w, gate.h);
        g.lineStyle(2, 0xd3bd7b);
        for (let y = gate.y + 12; y < gate.y + gate.h; y += 18)
          g.lineBetween(gate.x, y, gate.x + gate.w, y);
      } else
        g.lineStyle(2, color, 0.3).strokeRect(gate.x, gate.y, gate.w, gate.h);
      this.sprite(
        `lever-${i}`,
        s.latched[i] ? 'leverOn' : 'leverOff',
        gate.lever.x,
        gate.lever.y + 3,
        32,
        34,
      ).setDepth(4);
    });
    map.gems.forEach((gem, i) => {
      if (s.gems[i]) return;
      this.sprite(
        `gem-${i}`,
        gem.kind === 'fire' ? 'fireGem' : 'waterGem',
        gem.x,
        gem.y,
        24,
        24,
      ).setDepth(4);
    });
    s.crates.forEach((crate, i) => {
      this.sprite(
        `crate-${i}`,
        'crate',
        crate.x + crate.w / 2,
        crate.y + crate.h / 2,
        crate.w,
        crate.h,
      ).setTint(0xc6c4a5);
    });
    s.heroes.forEach((hero, i) => {
      const x = hero.x,
        y = hero.y,
        color = colors[KIND[i]];
      if (s.selected === i)
        g.lineStyle(2, color, 0.6).strokeEllipse(x, y + 2, 32, 9);
      g.fillStyle(color).fillRoundedRect(x - 9, y - 25, 18, 20, 5);
      g.fillCircle(x, y - 29, 12);
      if (i === 0) {
        g.fillTriangle(x - 9, y - 33, x + 8, y - 33, x + 4, y - 50);
        g.fillStyle(0xffd581).fillTriangle(
          x - 5,
          y - 34,
          x + 4,
          y - 34,
          x,
          y - 44,
        );
      } else {
        g.fillTriangle(x - 10, y - 32, x + 9, y - 32, x - 2, y - 46);
        g.fillStyle(0xacf0f3).fillEllipse(x - 6, y - 33, 4, 8);
      }
      g.fillStyle(0x10282b)
        .fillCircle(x - 4 + hero.facing, y - 29, 2)
        .fillCircle(x + 4 + hero.facing, y - 29, 2);
      g.lineStyle(3, color)
        .lineBetween(x - 5, y - 6, x - 6, y)
        .lineBetween(x + 5, y - 6, x + 6, y);
    });
    const panelKey = `${s.level}:${s.phase}:${s.reason}:${useSettings.getState().language}`;
    if (panelKey !== this.panelKey) {
      this.panelKey = panelKey;
      this.drawPanel();
    }
  }
  private drawPanel() {
    this.panel.removeAll(true);
    const s = this.state;
    if (s.phase === 'playing') return;
    const shade = this.add
      .graphics()
      .fillStyle(0x091b1c, 0.78)
      .fillRect(0, 108, 960, 486);
    const card = this.add
      .graphics()
      .fillStyle(0x223e36)
      .fillRoundedRect(154, 164, 652, 367, 18)
      .lineStyle(2, 0x83a171)
      .strokeRoundedRect(154, 164, 652, 367, 18);
    this.panel.add([shade, card]);
    const title =
      s.phase === 'ready'
        ? 'games.fireboy-watergirl.name'
        : s.phase === 'failed'
          ? 'games.fireboy-watergirl.failed'
          : s.phase === 'won'
            ? 'games.fireboy-watergirl.won'
            : 'games.fireboy-watergirl.clear';
    this.panel.add(this.text(480, 207, t(title), 32, '#d8e6b4').setOrigin(0.5));
    const message =
      s.phase === 'ready'
        ? t('games.fireboy-watergirl.ready', { level: s.level + 1 })
        : s.phase === 'failed'
          ? t(`games.fireboy-watergirl.reason.${s.reason ?? 'fall'}`)
          : t('games.fireboy-watergirl.result', {
              score: s.score,
              time: Math.ceil(s.remaining),
            });
    this.panel.add(
      this.text(480, 328, message, 20).setOrigin(0.5).setAlign('center'),
    );
    const label =
      s.phase === 'failed'
        ? 'games.fireboy-watergirl.retry'
        : s.phase === 'won'
          ? 'games.fireboy-watergirl.again'
          : s.phase === 'clear'
            ? 'games.fireboy-watergirl.next'
            : 'games.fireboy-watergirl.start';
    this.panel.add(this.button(480, 475, t(label), () => this.advance()));
  }
}

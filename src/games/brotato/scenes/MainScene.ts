import type Phaser from 'phaser';
import { useSettings } from '../../../app/store';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import type { TranslationKey } from '../../../i18n/translate';
import { Audio } from '../../../shared/audio';
import { images } from '../assets';
import collectSound from '../assets/audio/collect.ogg';
import hitSound from '../assets/audio/hit.ogg';
import shootSound from '../assets/audio/shoot.ogg';
import upgradeSound from '../assets/audio/upgrade.ogg';
import {
  ARENA,
  buyOffer,
  CHARACTERS,
  type Character,
  canBuy,
  chooseUpgrade,
  combineWeapons,
  type Effect,
  effectiveStats,
  experienceNeeded,
  HEIGHT,
  ITEMS,
  type ItemId,
  isRun,
  lockOffer,
  newRun,
  type Offer,
  type Run,
  recycleValue,
  recycleWeapon,
  rerollCost,
  rerollShop,
  type Stat,
  startWave,
  stepRun,
  takeLoot,
  WEAPON_IDS,
  WEAPONS,
  type WeaponId,
  WIDTH,
} from '../logic';

const key = (name: string) => `brotato-${name}`;
const tr = (name: string, values?: Record<string, string | number>) =>
  t(`games.brotato.${name}` as TranslationKey, values);
const COLORS = [0, 0xbfb8a8, 0x71b676, 0x768ecc, 0xe97563];
const statName = (stat: Stat) =>
  ({ armor: 'armorStat', harvest: 'harvestStat', crit: 'critStat' })[
    stat as 'armor' | 'harvest' | 'crit'
  ] ?? stat;
const itemName = (id: ItemId) =>
  ['regen', 'crit', 'harvest', 'armor'].includes(id) ? `${id}Item` : id;
const statIcon = (stat: Stat) =>
  ({
    maxHp: 'heart',
    regen: 'food',
    armor: 'armor',
    damage: 'knife',
    melee: 'spear',
    ranged: 'pistol',
    attackSpeed: 'coffee',
    crit: 'crit',
    speed: 'boots',
    dodge: 'boots',
    harvest: 'harvest',
    range: 'smg',
  })[stat];
const percent = (stat: Stat) =>
  ['damage', 'attackSpeed', 'crit', 'speed', 'dodge'].includes(stat) ? '%' : '';

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
    Space: 'START',
    Enter: 'START',
    KeyR: 'REVERSE',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
    Digit1: 'SPECIAL',
    Digit2: 'SECONDARY',
    Digit3: 'MODE',
    Digit4: 'THRUST',
  } as const;
  protected gamepadButtons = { 0: 'DROP', 1: 'REVERSE', 9: 'PAUSE' } as const;
  private state!: Run;
  private actors = new Map<string, Phaser.GameObjects.Image>();
  private panel!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Text;
  private subHud!: Phaser.GameObjects.Text;
  private bars!: Phaser.GameObjects.Graphics;
  private swings!: Phaser.GameObjects.Graphics;
  private footer!: Phaser.GameObjects.Container;
  private pausePanel!: Phaser.GameObjects.Container;
  private overlayKey = '';
  private footerKey = '';
  private selected = 0;
  private selectedWeapon = 0;
  private lastLanguage = '';
  private pointer?: Phaser.Input.Pointer;
  private soundClock = 0;
  private note = '';

  preload() {
    for (const [name, url] of Object.entries(images)) {
      if (name === 'heart')
        this.load.svg(key(name), url, { width: 96, height: 96 });
      else this.load.image(key(name), url);
    }
  }
  create() {
    this.state = isRun(this.savedSnapshot) ? this.savedSnapshot : newRun();
    this.actors = new Map();
    this.overlayKey = '';
    this.footerKey = '';
    this.selected = 0;
    this.selectedWeapon = 0;
    this.soundClock = 0;
    this.pointer = undefined;
    this.note = '';
    this.add.rectangle(400, 360, WIDTH, HEIGHT, 0x292722);
    this.add
      .rectangle(400, 370, 764, 520, 0xbaab8c)
      .setStrokeStyle(5, 0x6e6453);
    this.add
      .tileSprite(400, 370, 754, 508, key('floor'))
      .setAlpha(0.3)
      .setTint(0xffffff);
    const decor = this.add.graphics();
    decor.lineStyle(2, 0x827354, 0.25);
    for (let i = 0; i < 55; i++) {
      const x = 45 + ((i * 137) % 705),
        y = 140 + ((i * 83) % 460);
      decor.strokeEllipse(x, y, 6 + (i % 8), 3 + (i % 5));
    }
    this.hud = this.text(22, 13, '', 25);
    this.subHud = this.text(22, 55, '', 18, '#c8c1ae');
    this.bars = this.add.graphics().setDepth(8);
    this.swings = this.add.graphics().setDepth(6);
    this.footer = this.add.container(0, 0).setDepth(9);
    this.panel = this.add.container(0, 0).setDepth(20);
    this.pausePanel = this.add.container(0, 0).setDepth(30);
    this.pausePanel.add(this.add.rectangle(400, 360, 800, 720, 0x171713, 0.88));
    this.pausePanel.add(this.text(400, 310, tr('pause'), 44).setOrigin(0.5));
    this.pausePanel.add(
      this.text(400, 382, tr('pauseHint'), 21).setOrigin(0.5),
    );
    this.pausePanel.setVisible(false);
    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        objects: Phaser.GameObjects.GameObject[],
      ) => {
        if (
          objects.length ||
          this.status !== 'playing' ||
          this.state.phase !== 'wave' ||
          pointer.y < ARENA.top ||
          pointer.y > ARENA.bottom
        )
          return;
        this.pointer = pointer;
      },
    );
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.pointer?.id === pointer.id) this.pointer = undefined;
    });
    this.input.on('gameout', () => {
      this.pointer = undefined;
    });
    this.begin();
    this.controls.onReset(() => {
      this.pointer = undefined;
    });
    if (this.state.phase === 'dead' || this.state.phase === 'won')
      this.endRun();
    this.draw();
  }
  update(_time: number, delta: number) {
    const active = this.frame(delta);
    this.pausePanel.setVisible(this.status === 'paused');
    const enter = this.controls.consume('START'),
      confirm = this.controls.consume('DROP');
    if (this.status === 'over') {
      if (enter || confirm) this.scene.restart({ snapshot: null });
      this.draw();
      return;
    }
    if (!active) {
      this.draw();
      return;
    }
    const phase = this.state.phase;
    if (phase !== 'wave') {
      if (this.controls.consume('LEFT'))
        this.selected = (this.selected + 3) % 4;
      if (this.controls.consume('RIGHT'))
        this.selected = (this.selected + 1) % 4;
      if (this.controls.consume('UP')) this.selected = (this.selected + 2) % 4;
      if (this.controls.consume('DOWN'))
        this.selected = (this.selected + 2) % 4;
      for (const [i, action] of [
        'SPECIAL',
        'SECONDARY',
        'MODE',
        'THRUST',
      ].entries())
        if (
          this.controls.consume(
            action as 'SPECIAL' | 'SECONDARY' | 'MODE' | 'THRUST',
          )
        )
          this.choose(i);
      if (confirm) this.choose(this.selected);
      if (enter) {
        if (phase === 'ready' || phase === 'shop') this.advance();
        else this.choose(this.selected);
      }
      if (this.controls.consume('REVERSE')) {
        if (phase === 'ready')
          this.selectStartingWeapon(
            WEAPON_IDS[
              (WEAPON_IDS.indexOf(this.state.weapons[0].kind) + 1) %
                WEAPON_IDS.length
            ],
          );
        if (phase === 'shop') this.refresh();
        if (phase === 'loot') this.claim(true);
      }
    } else {
      let x =
        Number(this.controls.down('RIGHT')) -
        Number(this.controls.down('LEFT'));
      let y =
        Number(this.controls.down('DOWN')) - Number(this.controls.down('UP'));
      if (!x && !y && this.pointer?.isDown) {
        const dx = this.pointer.x - this.state.x,
          dy = this.pointer.y - this.state.y;
        if (Math.hypot(dx, dy) > 10) {
          x = dx;
          y = dy;
        }
      }
      let remaining = Math.min(delta / 1000, 0.1);
      const effects: Effect[] = [];
      while (remaining > 0) {
        const dt = Math.min(remaining, 1 / 60);
        effects.push(...stepRun(this.state, dt, x, y));
        remaining -= dt;
      }
      this.soundClock -= delta / 1000;
      this.effects(effects);
      if (this.state.phase === 'dead' || this.state.phase === 'won')
        this.endRun();
      else if (this.state.phase !== phase) {
        this.selected = 0;
        this.pointer = undefined;
        this.persist();
      }
    }
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      this.publish();
    }
    this.draw();
  }
  private text(
    x: number,
    y: number,
    value: string,
    size = 22,
    color = '#f6efd9',
  ) {
    return this.add.text(x, y, value, {
      fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
      fontSize: `${size}px`,
      color,
      lineSpacing: 5,
    });
  }
  private image(x: number, y: number, name: string, size: number) {
    const im = this.add.image(x, y, key(name));
    const ratio = Math.min(size / im.width, size / im.height);
    return im.setScale(ratio);
  }
  private button(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    label: string,
    callback: () => void,
    enabled = true,
    color = 0x617147,
  ) {
    const box = this.add
      .rectangle(x, y, width, 43, enabled ? color : 0x48483d)
      .setStrokeStyle(2, enabled ? 0xa9b68b : 0x656454);
    const text = this.text(
      x,
      y,
      label,
      19,
      enabled ? '#fff4dc' : '#99998a',
    ).setOrigin(0.5);
    parent.add([box, text]);
    if (enabled)
      box.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.status === 'paused') return;
        callback();
      });
    return box;
  }
  private choose(index: number) {
    if (this.status !== 'playing') return;
    if (this.state.phase === 'ready') {
      this.selectCharacter(CHARACTERS[index % 3]);
      return;
    }
    let success = false;
    if (this.state.phase === 'upgrade')
      success = chooseUpgrade(this.state, index);
    else if (this.state.phase === 'shop') {
      const offer = this.state.offers[index];
      success = buyOffer(this.state, index);
      this.note =
        !success && offer
          ? tr(this.state.cash < offer.price ? 'noMoney' : 'full')
          : '';
    } else if (this.state.phase === 'loot') {
      this.claim(false);
      return;
    }
    if (success) {
      Audio.playAsset(upgradeSound);
      this.persist();
      this.overlayKey = '';
      this.footerKey = '';
    }
  }
  private selectCharacter(character: Character) {
    this.state = newRun(character, this.state.weapons[0].kind);
    this.selected = CHARACTERS.indexOf(character);
    this.overlayKey = '';
    this.draw();
  }
  private selectStartingWeapon(weapon: WeaponId) {
    this.state = newRun(this.state.character, weapon);
    this.overlayKey = '';
    this.draw();
  }
  private advance() {
    if (this.status !== 'playing' || !startWave(this.state)) return;
    this.note = '';
    this.pointer = undefined;
    this.overlayKey = '';
    this.persist();
    this.draw();
  }
  private refresh() {
    if (rerollShop(this.state)) {
      Audio.play('click');
      this.note = '';
      this.overlayKey = '';
      this.persist();
      this.draw();
    }
  }
  private claim(recycle: boolean) {
    if (takeLoot(this.state, recycle)) {
      Audio.playAsset(upgradeSound);
      this.overlayKey = '';
      this.persist();
      this.draw();
    }
  }
  private endRun() {
    this.score = this.state.score;
    this.finish(
      tr(this.state.phase === 'won' ? 'victory' : 'gameOver'),
      this.state.phase !== 'won',
    );
    if (this.state.phase === 'won') Audio.playAsset(upgradeSound);
  }
  private effects(effects: Effect[]) {
    if (effects.some((e) => e.kind === 'hurt')) {
      Audio.playAsset(hitSound);
      this.cameras.main.shake(90, 0.003);
    } else if (effects.some((e) => e.kind === 'clear'))
      Audio.playAsset(upgradeSound);
    else if (
      this.soundClock <= 0 &&
      effects.some((e) => e.kind === 'shoot' || e.kind === 'collect')
    ) {
      Audio.playAsset(
        effects.some((e) => e.kind === 'shoot') ? shootSound : collectSound,
      );
      this.soundClock = 0.14;
    }
    for (const e of effects
      .filter((e) => e.kind === 'hit' || e.kind === 'hurt')
      .slice(0, 5)) {
      const text = this.text(
        e.x,
        e.y - 15,
        String(e.value),
        e.kind === 'hurt' ? 24 : 17,
        e.kind === 'hurt' ? '#c53f36' : '#fff8de',
      )
        .setOrigin(0.5)
        .setDepth(10);
      this.tweens.add({
        targets: text,
        y: e.y - 52,
        alpha: 0,
        duration: 400,
        onComplete: () => text.destroy(),
      });
    }
  }
  private draw() {
    const s = this.state,
      language = useSettings.getState().language;
    if (language !== this.lastLanguage) {
      this.lastLanguage = language;
      this.overlayKey = '';
      this.footerKey = '';
      this.pausePanel.getAt<Phaser.GameObjects.Text>(1).setText(tr('pause'));
      this.pausePanel
        .getAt<Phaser.GameObjects.Text>(2)
        .setText(tr('pauseHint'));
    }
    this.hud.setText(
      `${tr('wave', { wave: s.wave })}     ${tr('time', { seconds: Math.ceil(s.remaining) })}     ${tr('materials', { cash: s.cash })}`,
    );
    this.subHud.setText(
      `HP ${Math.ceil(s.hp)} / ${s.stats.maxHp}      ${tr('level', { level: s.level })}      XP ${s.xp} / ${experienceNeeded(s.level)}      ${tr('bag', { bag: s.bag })}`,
    );
    this.bars.clear();
    this.bars.fillStyle(0x484638).fillRoundedRect(22, 87, 240, 9, 4);
    this.bars
      .fillStyle(0xc9725d)
      .fillRoundedRect(22, 87, Math.max(1, (240 * s.hp) / s.stats.maxHp), 9, 4);
    this.bars.fillStyle(0x484638).fillRoundedRect(282, 87, 190, 9, 4);
    this.bars
      .fillStyle(0x9fb779)
      .fillRoundedRect(
        282,
        87,
        Math.max(1, (190 * s.xp) / experienceNeeded(s.level)),
        9,
        4,
      );
    const live = new Set<string>();
    const actor = (
      id: string,
      icon: string,
      x: number,
      y: number,
      size: number,
      depth: number,
    ) => {
      live.add(id);
      let im = this.actors.get(id);
      if (!im) {
        im = this.image(x, y, icon, size);
        this.actors.set(id, im);
      }
      im.setPosition(x, y).setDepth(depth);
      return im;
    };
    if (s.phase === 'wave') {
      actor('player', 'potato', s.x, s.y, 62, 5).setAlpha(
        s.invincible > 0 && Math.floor(s.invincible * 15) % 2 ? 0.45 : 1,
      );
      for (const e of s.enemies) {
        const im = actor(`enemy-${e.id}`, e.kind, e.x, e.y, e.radius * 3.1, 3);
        im.setAlpha(e.warning > 0 ? 0.45 : 1).setRotation(
          e.kind === 'charger' && e.timer > 2
            ? Math.sin(e.timer * 30) * 0.12
            : 0,
        );
        if (e.warning > 0) {
          this.bars.lineStyle(2, 0x9f3c32, 0.8);
          this.bars.strokeCircle(e.x, e.y, e.radius + 4);
          this.bars.lineBetween(e.x - 5, e.y - 5, e.x + 5, e.y + 5);
          this.bars.lineBetween(e.x + 5, e.y - 5, e.x - 5, e.y + 5);
        }
        if (e.kind === 'tree') im.setTint(0x76934c);
        if (e.kind === 'boss') {
          this.bars.fillStyle(0x452e29).fillRect(516, 87, 260, 9);
          this.bars
            .fillStyle(0xd55b4f)
            .fillRect(516, 87, 260 * Math.max(0, e.hp / e.maxHp), 9);
        }
      }
      for (const d of s.drops)
        actor(
          `drop-${d.id}`,
          d.kind,
          d.x,
          d.y,
          d.kind === 'material' ? 16 : 27,
          2,
        ).setTint(d.kind === 'material' ? 0x83bf64 : 0xffffff);
      for (const b of s.bullets)
        actor(
          `bullet-${b.id}`,
          b.hostile ? 'material' : b.icon === 'wand' ? 'material' : 'pistol',
          b.x,
          b.y,
          b.hostile ? 18 : b.icon === 'wand' ? 15 : 9,
          4,
        )
          .setTint(
            b.hostile ? 0xeb5a55 : b.icon === 'wand' ? 0x9072e6 : 0xffedb6,
          )
          .setRotation(Math.atan2(b.vy, b.vx));
      this.swings.clear();
      s.weapons.forEach((w, i) => {
        const a = (i / s.weapons.length) * Math.PI * 2;
        const im = actor(
          `weapon-${w.id}`,
          w.kind,
          s.x + Math.cos(a) * (32 + w.flash * 80),
          s.y + Math.sin(a) * 28,
          WEAPONS[w.kind].melee ? 45 : 36,
          6,
        );
        im.setRotation(w.angle + (WEAPONS[w.kind].melee ? Math.PI / 2 : 0));
        if (w.flash > 0 && WEAPONS[w.kind].melee) {
          this.swings.lineStyle(5, 0xfff4dc, 0.6);
          this.swings.beginPath();
          this.swings.arc(
            s.x,
            s.y,
            WEAPONS[w.kind].range * 0.8,
            w.angle - 0.65,
            w.angle + 0.65,
          );
          this.swings.strokePath();
        }
      });
    } else this.swings.clear();
    for (const [id, im] of this.actors)
      if (!live.has(id)) {
        im.destroy();
        this.actors.delete(id);
      }
    this.drawFooter();
    const overlay = `${s.phase}:${this.selected}:${s.cash}:${s.pending}:${this.note}`;
    if (overlay !== this.overlayKey) {
      this.overlayKey = overlay;
      this.drawPanel();
    }
  }
  private drawFooter() {
    const s = this.state,
      signature = `${s.phase}:${s.weapons.map((w) => `${w.kind}-${w.tier}`).join(',')}:${this.selectedWeapon}`;
    if (signature === this.footerKey) return;
    this.footerKey = signature;
    this.footer.removeAll(true);
    this.footer.add(
      this.text(22, 638, tr('loadout', { count: s.weapons.length }), 18),
    );
    s.weapons.forEach((w, i) => {
      const x = 220 + i * 68;
      const slot = this.add
        .rectangle(x, 670, 58, 55, 0x3e3d32)
        .setStrokeStyle(
          s.phase === 'shop' && i === this.selectedWeapon ? 3 : 1,
          s.phase === 'shop' && i === this.selectedWeapon
            ? 0xe9d2a2
            : COLORS[w.tier],
        );
      this.footer.add([
        slot,
        this.image(x, 665, w.kind, 38),
        this.text(
          x + 21,
          691,
          ['', 'I', 'II', 'III', 'IV'][w.tier],
          14,
        ).setOrigin(1),
      ]);
      if (s.phase === 'shop')
        slot.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.status !== 'playing') return;
          this.selectedWeapon = i;
          this.footerKey = '';
          this.overlayKey = '';
          this.draw();
        });
    });
    this.footer.add(
      this.text(
        400,
        708,
        tr(s.phase === 'shop' ? 'inventoryHint' : 'combatHint'),
        14,
        '#b5af99',
      ).setOrigin(0.5),
    );
  }
  private backdrop(title: string, subtitle: string) {
    this.panel.add(
      this.add
        .rectangle(400, 371, 756, 509, 0x282821, 0.98)
        .setStrokeStyle(2, 0x81755e),
    );
    this.panel.add(this.text(400, 141, title, 30).setOrigin(0.5));
    this.panel.add(
      this.text(400, 177, subtitle, 16, '#c3bda8')
        .setOrigin(0.5)
        .setWordWrapWidth(700),
    );
  }
  private statLines(stats: Partial<Record<Stat, number>>, multiplier = 1) {
    return (Object.entries(stats) as [Stat, number][])
      .map(
        ([stat, value]) =>
          `${value >= 0 ? '+' : ''}${value * multiplier}${percent(stat)} ${tr(statName(stat))}`,
      )
      .join('  ');
  }
  private drawPanel() {
    this.panel.removeAll(true);
    const s = this.state;
    if (s.phase === 'wave') return;
    if (s.phase === 'ready') {
      this.backdrop(tr('chooseCharacter'), 'BRO TATO · ARENA SURVIVAL');
      CHARACTERS.forEach((character, i) => {
        const x = 160 + i * 240,
          selected = s.character === character;
        const card = this.add
          .rectangle(x, 287, 218, 169, selected ? 0x4b5039 : 0x35352d)
          .setStrokeStyle(2, selected ? 0xc4d39e : 0x6a6651)
          .setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => {
          if (this.status === 'playing') this.selectCharacter(character);
        });
        const potato = this.image(x, 260, 'potato', 92).setTint(
          i === 1 ? 0xbacacf : i === 2 ? 0xe0b19d : 0xffffff,
        );
        this.panel.add([
          card,
          potato,
          this.text(x, 315, tr(character), 24).setOrigin(0.5),
          this.text(x, 348, tr(`${character}Desc`), 14, '#d1cdbb').setOrigin(
            0.5,
          ),
        ]);
      });
      this.panel.add(
        this.text(400, 398, tr('chooseWeapon'), 20).setOrigin(0.5),
      );
      WEAPON_IDS.forEach((weapon, i) => {
        const x = 100 + i * 120;
        const card = this.add
          .rectangle(
            x,
            459,
            102,
            91,
            s.weapons[0].kind === weapon ? 0x576042 : 0x36362e,
          )
          .setStrokeStyle(2, s.weapons[0].kind === weapon ? 0xc4d39e : 0x625f4f)
          .setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => {
          if (this.status === 'playing') this.selectStartingWeapon(weapon);
        });
        this.panel.add([
          card,
          this.image(x, 445, weapon, 42),
          this.text(x, 488, tr(weapon), 17).setOrigin(0.5),
        ]);
      });
      this.button(this.panel, 400, 544, 270, tr('start'), () => this.advance());
      this.panel.add(
        this.text(400, 590, tr('readyHint'), 15, '#c5bea8')
          .setOrigin(0.5)
          .setWordWrapWidth(680),
      );
      this.panel.add(
        this.text(400, 613, tr('credits'), 11, '#908e7b').setOrigin(0.5),
      );
      return;
    }
    if (s.phase === 'dead' || s.phase === 'won') {
      this.backdrop(
        tr(s.phase === 'won' ? 'victory' : 'gameOver'),
        tr('result', { wave: s.wave, kills: s.kills }),
      );
      this.panel.add(
        this.image(400, 328, s.phase === 'won' ? 'potato' : 'tank', 156),
      );
      this.panel.add(
        this.text(400, 443, `${s.score}`, 46, '#dfc48c').setOrigin(0.5),
      );
      this.button(this.panel, 400, 535, 285, tr('restart'), () =>
        this.scene.restart({ snapshot: null }),
      );
      return;
    }
    if (s.phase === 'loot') {
      const id = s.loot[0];
      this.backdrop(tr('lootTitle'), tr(itemName(id)));
      this.panel.add(this.image(400, 302, ITEMS[id].icon, 106));
      this.panel.add(
        this.text(400, 391, this.statLines(ITEMS[id].stats), 24)
          .setOrigin(0.5)
          .setWordWrapWidth(620),
      );
      this.button(this.panel, 245, 513, 260, tr('take'), () =>
        this.claim(false),
      );
      this.button(
        this.panel,
        555,
        513,
        260,
        tr('recycleLoot', { price: Math.floor(ITEMS[id].price * 0.5) }),
        () => this.claim(true),
        true,
        0x6b4c40,
      );
      return;
    }
    const shop = s.phase === 'shop';
    this.backdrop(
      tr(shop ? 'shop' : 'upgradeTitle', { wave: s.wave }),
      tr(shop ? 'shopHint' : 'upgradeHint', { count: s.pending }),
    );
    for (let i = 0; i < 4; i++) {
      const x = 217 + (i % 2) * 366,
        y = 269 + Math.floor(i / 2) * 137;
      const offer = s.offers[i],
        upgrade = s.upgrades[i];
      const tier = shop ? (offer?.tier ?? 1) : upgrade.tier;
      this.panel.add(
        this.add
          .rectangle(x, y, 342, 124, 0x36362d)
          .setStrokeStyle(
            this.selected === i ? 3 : 1,
            this.selected === i ? 0xe1cca2 : COLORS[tier],
          ),
      );
      if (shop && !offer) {
        this.panel.add(
          this.text(x, y, tr('sold'), 24, '#807d69').setOrigin(0.5),
        );
        continue;
      }
      const icon =
        shop && offer
          ? offer.kind === 'weapon'
            ? offer.key
            : ITEMS[offer.key as ItemId].icon
          : statIcon(upgrade.stat);
      this.panel.add(this.image(x - 128, y - 15, icon, 60));
      const title =
        shop && offer
          ? offer.kind === 'weapon'
            ? tr(offer.key)
            : tr(itemName(offer.key as ItemId))
          : tr(statName(upgrade.stat));
      this.panel.add(
        this.text(
          x - 82,
          y - 50,
          `${i + 1}. ${title}  ${['', 'I', 'II', 'III', 'IV'][tier]}`,
          20,
        ),
      );
      const description =
        shop && offer
          ? this.offerDescription(offer)
          : `+${upgrade.value}${percent(upgrade.stat)} ${tr(statName(upgrade.stat))}`;
      this.panel.add(
        this.text(x - 82, y - 17, description, 14, '#d3ccb5').setWordWrapWidth(
          235,
        ),
      );
      if (shop && offer) {
        const same =
          offer.kind === 'weapon' &&
          s.weapons.length === 6 &&
          s.weapons.some(
            (w) => w.kind === offer.key && w.tier === offer.tier && w.tier < 4,
          );
        this.button(
          this.panel,
          x - 28,
          y + 38,
          170,
          tr(same ? 'combineBuy' : 'buy', { price: offer.price }),
          () => {
            this.choose(i);
            this.draw();
          },
          canBuy(s, offer),
        );
        this.button(
          this.panel,
          x + 107,
          y + 38,
          87,
          tr(offer.locked ? 'locked' : 'lock'),
          () => {
            lockOffer(s, i);
            this.overlayKey = '';
            this.persist();
            this.draw();
          },
          true,
          offer.locked ? 0x82684a : 0x49493c,
        );
      } else
        this.button(this.panel, x, y + 38, 210, tr('choose'), () => {
          this.choose(i);
          this.draw();
        });
    }
    if (!shop) {
      const stats = effectiveStats(s);
      (Object.keys(stats) as Stat[]).forEach((stat, i) => {
        const x = 77 + (i % 4) * 181;
        const y = 494 + Math.floor(i / 4) * 42;
        this.panel.add([
          this.image(x, y, statIcon(stat), 25),
          this.text(
            x + 23,
            y - 10,
            `${tr(statName(stat))} ${stats[stat]}${percent(stat)}`,
            15,
            '#c4bda5',
          ),
        ]);
      });
    }
    if (shop) {
      const stats = effectiveStats(s);
      this.panel.add(
        this.text(
          400,
          488,
          ['maxHp', 'damage', 'melee', 'ranged', 'armor', 'harvest']
            .map((k) => `${tr(statName(k as Stat))} ${stats[k as Stat]}`)
            .join(' · '),
          16,
          '#c1bca6',
        ).setOrigin(0.5),
      );
      const weapon = s.weapons[this.selectedWeapon] ?? s.weapons[0];
      this.selectedWeapon = Math.min(this.selectedWeapon, s.weapons.length - 1);
      const duplicate = s.weapons.some(
        (w, i) =>
          i !== this.selectedWeapon &&
          w.kind === weapon.kind &&
          w.tier === weapon.tier &&
          w.tier < 4,
      );
      this.button(
        this.panel,
        218,
        529,
        328,
        tr('combine'),
        () => {
          if (combineWeapons(s, this.selectedWeapon)) {
            this.selectedWeapon = 0;
            this.overlayKey = '';
            this.footerKey = '';
            this.persist();
            this.draw();
          }
        },
        duplicate,
      );
      this.button(
        this.panel,
        582,
        529,
        328,
        tr('recycle', { price: recycleValue(weapon, s.wave) }),
        () => {
          if (recycleWeapon(s, this.selectedWeapon)) {
            this.selectedWeapon = 0;
            this.overlayKey = '';
            this.footerKey = '';
            this.persist();
            this.draw();
          }
        },
        s.weapons.length > 1,
        0x6b4c40,
      );
      this.button(
        this.panel,
        218,
        582,
        328,
        tr('reroll', { price: rerollCost(s) }),
        () => this.refresh(),
        s.cash >= rerollCost(s),
      );
      this.button(
        this.panel,
        582,
        582,
        328,
        tr('next', { wave: s.wave + 1 }),
        () => this.advance(),
      );
      this.panel.add(
        this.text(
          400,
          613,
          this.note || tr('familyBonus'),
          13,
          this.note ? '#e59c84' : '#95927d',
        ).setOrigin(0.5),
      );
    }
  }
  private offerDescription(offer: Offer) {
    if (offer.kind === 'item')
      return this.statLines(ITEMS[offer.key as ItemId].stats, offer.tier);
    const def = WEAPONS[offer.key as WeaponId];
    return `${tr(def.family)} · ${tr('weaponInfo', { damage: Math.round(def.damage * (1 + (offer.tier - 1) * 0.65)), cooldown: def.cooldown, range: def.range })}`;
  }
  protected snapshot() {
    return this.state;
  }
}

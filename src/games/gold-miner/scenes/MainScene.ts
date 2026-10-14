import Phaser from 'phaser';
import { useSettings } from '../../../app/store';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import type { TranslationKey } from '../../../i18n/translate';
import { Audio } from '../../../shared/audio';
import blastSound from '../assets/audio/blast.ogg';
import castSound from '../assets/audio/cast.ogg';
import collectSound from '../assets/audio/collect.ogg';
import bag from '../assets/bag.png';
import blast from '../assets/blast.png';
import diamond from '../assets/diamond.png';
import dynamite from '../assets/dynamite.png';
import earth from '../assets/earth.png';
import gold from '../assets/gold.png';
import hills from '../assets/hills.png';
import miner from '../assets/miner.png';
import polish from '../assets/polish.png';
import rock from '../assets/rock.png';
import sky from '../assets/sky.png';
import strength from '../assets/strength.png';
import surface from '../assets/surface.png';
import {
  buy,
  finishDay,
  hookPosition,
  isMinerState,
  type Mineral,
  type MinerState,
  newMiner,
  nextLevel,
  ORIGIN,
  SHOP,
  type ShopItem,
  stepMiner,
} from '../logic';

const images = {
  bag,
  diamond,
  gold,
  miner,
  rock,
  dynamite,
  strength,
  polish,
  sky,
  hills,
  earth,
  surface,
  blast,
};
const key = (name: string) => `gold-miner-${name}`;
export class MainScene extends SessionScene {
  protected inputBindings = {
    Space: 'DROP',
    ArrowDown: 'DROP',
    KeyS: 'DROP',
    Enter: 'DROP',
    ArrowUp: 'UP',
    KeyW: 'UP',
    Escape: 'PAUSE',
    KeyP: 'PAUSE',
    Digit1: 'SPECIAL',
    Digit2: 'SECONDARY',
    Digit3: 'MODE',
  } as const;
  protected gamepadButtons = { 0: 'DROP', 1: 'UP', 9: 'PAUSE' } as const;
  private state!: MinerState;
  private rope!: Phaser.GameObjects.Graphics;
  private panel!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private nextButton!: Phaser.GameObjects.Text;
  private miner!: Phaser.GameObjects.Image;
  private pieces = new Map<number, Phaser.GameObjects.Image>();
  private stock!: Phaser.GameObjects.Text;
  private perks!: Phaser.GameObjects.Container;
  private overlayKey = '';
  private shopMessage = '';
  private elapsed = 0;

  preload() {
    for (const [name, url] of Object.entries(images))
      this.load.image(key(name), url);
  }
  create() {
    this.state = isMinerState(this.savedSnapshot)
      ? this.savedSnapshot
      : newMiner();
    this.score = this.state.score;
    this.lastScore = this.score;
    this.pieces = new Map();
    this.overlayKey = '';
    this.shopMessage = '';
    this.elapsed = 0;
    for (const name of Object.keys(images))
      this.textures.get(key(name)).setFilter(Phaser.Textures.NEAREST);
    this.add.image(0, 0, key('sky')).setOrigin(0).setDisplaySize(800, 196);
    this.add.image(0, 80, key('hills')).setOrigin(0).setDisplaySize(800, 120);
    this.add.tileSprite(0, 196, 800, 404, key('earth')).setOrigin(0);
    this.add
      .tileSprite(0, 174, 800, 36, key('surface'))
      .setOrigin(0)
      .setTileScale(1, 0.55);
    this.add.image(48, 131, key('dynamite')).setDisplaySize(50, 40);
    this.stock = this.text(78, 119, '', 22, '#293a35');
    this.perks = this.add.container(0, 0);
    const top = this.add.graphics();
    top.fillStyle(0x203e36, 0.97).fillRoundedRect(16, 12, 768, 66, 12);
    this.hud = this.text(36, 26, '', 22).setDepth(5);
    this.miner = this.add.image(400, 139, key('miner')).setDisplaySize(56, 98);
    this.rope = this.add.graphics().setDepth(3);
    this.hint = this.text(400, 578, '', 16).setOrigin(0.5).setDepth(5);
    this.nextButton = this.button(686, 113, '', () => {
      if (this.status === 'playing' && finishDay(this.state)) {
        Audio.play('clear');
        this.persist();
        this.draw();
      }
    }).setDepth(6);
    this.panel = this.add.container(0, 0).setDepth(10);
    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        objects: Phaser.GameObjects.GameObject[],
      ) => {
        if (
          objects.length ||
          this.status !== 'playing' ||
          this.state.phase !== 'mining' ||
          pointer.y < 194
        )
          return;
        this.controls.press('DROP');
        this.controls.release('DROP');
      },
    );
    this.begin();
    this.draw();
  }
  update(_time: number, delta: number) {
    const active = this.frame(delta);
    const drop = this.controls.consume('DROP');
    const blast = this.controls.consume('UP');
    if (this.status === 'over') {
      if (drop) this.scene.restart({ snapshot: null });
      return;
    }
    if (!active) return;
    for (const [action, item] of [
      ['SPECIAL', 'dynamite'],
      ['SECONDARY', 'strength'],
      ['MODE', 'polish'],
    ] as const) {
      if (this.controls.consume(action)) this.purchase(item);
    }
    if (this.state.phase === 'shop' && drop) {
      nextLevel(this.state);
      this.shopMessage = '';
      this.persist();
    } else {
      for (const event of stepMiner(this.state, delta / 1000, drop, blast)) {
        if (event === 'cast') Audio.playAsset(castSound);
        if (event === 'collect') {
          Audio.playAsset(collectSound);
          this.score = this.state.score;
          this.publish();
          this.floatText(400, 201, `+$${this.score - this.lastScore}`);
        }
        if (event === 'blast') {
          Audio.playAsset(blastSound);
          const p = hookPosition(this.state);
          const explosion = this.add
            .image(p.x, p.y, key('blast'))
            .setDisplaySize(72, 90)
            .setDepth(7);
          this.tweens.add({
            targets: explosion,
            alpha: 0,
            scaleX: explosion.scaleX * 1.5,
            scaleY: explosion.scaleY * 1.5,
            duration: 400,
            onComplete: () => explosion.destroy(),
          });
        }
        if (event === 'clear') {
          Audio.play('clear');
          this.persist();
        }
        if (event === 'over')
          this.finish(
            t('games.gold-miner.gameOver', { level: this.state.level }),
          );
      }
    }
    this.lastScore = this.state.score;
    this.elapsed += Math.min(delta, 100);
    this.draw();
  }
  private lastScore = 0;
  protected snapshot() {
    return this.state.phase === 'over' ? null : this.state;
  }
  private text(
    x: number,
    y: number,
    text: string,
    size = 20,
    color = '#fff2d3',
  ) {
    return this.add.text(x, y, text, {
      fontFamily: 'Arial, "PingFang SC", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      lineSpacing: 9,
    });
  }
  private button(x: number, y: number, label: string, callback: () => void) {
    const button = this.text(x, y, label, 18, '#302b25')
      .setOrigin(0.5)
      .setPadding(18, 12)
      .setBackgroundColor('#edbd59')
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      if (this.status !== 'paused') callback();
    });
    button.on('pointerover', () => button.setBackgroundColor('#ffe096'));
    button.on('pointerout', () => button.setBackgroundColor('#edbd59'));
    return button;
  }
  private purchase(item: ShopItem) {
    if (this.status !== 'playing') return;
    this.shopMessage = buy(this.state, item)
      ? 'games.gold-miner.bought'
      : 'games.gold-miner.cantBuy';
    Audio.play(
      this.shopMessage === 'games.gold-miner.bought' ? 'eat' : 'click',
    );
    this.overlayKey = '';
    this.persist();
    this.draw();
  }
  private floatText(x: number, y: number, message: string, color = '#ffdf78') {
    const label = this.text(x, y, message, 26, color)
      .setOrigin(0.5)
      .setDepth(7);
    this.tweens.add({
      targets: label,
      y: y - 40,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy(),
    });
  }
  private draw() {
    const s = this.state;
    this.hud.setText(
      t('games.gold-miner.hud', {
        level: s.level,
        cash: s.cash,
        target: s.target,
        time: Math.ceil(s.remaining),
      }),
    );
    this.hud.setColor(
      s.remaining <= 10 && s.phase === 'mining' ? '#ffbd91' : '#fff2d3',
    );
    this.hint.setText(
      t('games.gold-miner.hint', { count: s.dynamite }) +
        (s.strength ? `   ${t('games.gold-miner.strengthActive')}` : '') +
        (s.polish ? `   ${t('games.gold-miner.polishActive')}` : ''),
    );
    this.stock.setText(`×${s.dynamite}`);
    this.perks.setVisible(s.phase === 'mining');
    if (this.perks.length !== Number(s.strength) + Number(s.polish)) {
      this.perks.removeAll(true);
      for (const [i, item] of (['strength', 'polish'] as const)
        .filter((item) => s[item])
        .entries()) {
        this.perks.add(
          this.add.image(148 + i * 52, 132, key(item)).setDisplaySize(36, 42),
        );
      }
    }
    this.nextButton
      .setText(t('games.gold-miner.finishDay'))
      .setVisible(s.phase === 'mining' && s.cash >= s.target);
    this.miner.setAngle(
      s.hook === 'back' ? Math.sin(this.elapsed / 100) * 3 : 0,
    );
    const all: Mineral[] = [...s.minerals, ...(s.cargo ? [s.cargo] : [])];
    const ids = new Set(all.map((m) => m.id));
    for (const [id, piece] of this.pieces) {
      if (!ids.has(id)) {
        piece.destroy();
        this.pieces.delete(id);
      }
    }
    const p = hookPosition(s);
    for (const m of all) {
      let piece = this.pieces.get(m.id);
      if (!piece) {
        piece = this.add
          .image(m.x, m.y, key(m.kind))
          .setDisplaySize(m.radius * 2, m.radius * 2)
          .setDepth(2);
        this.pieces.set(m.id, piece);
      }
      const held = s.cargo?.id === m.id;
      piece.setTexture(key(m.kind));
      piece.setScale(
        Math.min((m.radius * 2) / piece.width, (m.radius * 2) / piece.height),
      );
      piece.setPosition(held ? p.x : m.x, held ? p.y + m.radius : m.y);
    }
    this.rope
      .clear()
      .lineStyle(3, 0xe4cba0)
      .lineBetween(ORIGIN.x, ORIGIN.y, p.x, p.y);
    this.rope.lineStyle(5, 0xcbdad5).beginPath();
    const claw = [
      [-13, -7],
      [-18, 5],
      [-9, 17],
      [0, 8],
      [9, 17],
      [18, 5],
      [13, -7],
    ];
    claw.forEach(([x, y], i) => {
      const px = p.x + x * Math.cos(s.angle) + y * Math.sin(s.angle);
      const py = p.y - x * Math.sin(s.angle) + y * Math.cos(s.angle);
      if (i === 0) this.rope.moveTo(px, py);
      else this.rope.lineTo(px, py);
    });
    this.rope.strokePath();
    const overlay = `${s.phase}:${useSettings.getState().language}`;
    if (this.overlayKey !== overlay) {
      this.overlayKey = overlay;
      this.drawPanel();
    }
  }
  private drawPanel() {
    this.panel.removeAll(true);
    const s = this.state;
    if (s.phase === 'mining') return;
    const shade = this.add
      .graphics()
      .fillStyle(0x172c28, 0.65)
      .fillRect(0, 80, 800, 520);
    const cardY = s.phase === 'shop' ? 166 : 198;
    const cardHeight = s.phase === 'shop' ? 386 : 340;
    const card = this.add
      .graphics()
      .fillStyle(0x263d34)
      .fillRoundedRect(115, cardY, 570, cardHeight, 18)
      .lineStyle(3, 0xc9994f)
      .strokeRoundedRect(115, cardY, 570, cardHeight, 18);
    this.panel.add([shade, card]);
    const title: TranslationKey =
      s.phase === 'ready'
        ? 'games.gold-miner.name'
        : s.phase === 'shop'
          ? 'games.gold-miner.shopTitle'
          : 'games.gold-miner.overTitle';
    this.panel.add(
      this.text(
        400,
        s.phase === 'shop' ? 205 : 235,
        t(title),
        32,
        '#ffda7c',
      ).setOrigin(0.5),
    );
    if (s.phase === 'shop') {
      this.panel.add(
        this.text(
          400,
          252,
          t('games.gold-miner.shopHint', {
            cash: s.cash,
            target: s.target + Math.min(2200, 650 + s.level * 150),
          }),
          17,
        ).setOrigin(0.5),
      );
      const items: ShopItem[] = ['dynamite', 'strength', 'polish'];
      items.forEach((item, index) => {
        const x = 225 + index * 175;
        const owned = item !== 'dynamite' && s[item];
        const icon = this.add.image(x, 315, key(item));
        icon
          .setScale(Math.min(82 / icon.width, 72 / icon.height))
          .setInteractive({ useHandCursor: true });
        icon.on('pointerdown', () => this.purchase(item));
        this.panel.add(icon);
        this.panel.add(
          this.button(
            x,
            385,
            `${index + 1}. ${t(`games.gold-miner.${item}`)}\n${owned ? t('games.gold-miner.owned') : `$${SHOP[item]}`}`,
            () => this.purchase(item),
          ),
        );
        this.panel.add(
          this.text(x, 439, t(`games.gold-miner.${item}Hint`), 13).setOrigin(
            0.5,
          ),
        );
      });
      if (this.shopMessage)
        this.panel.add(
          this.text(
            400,
            467,
            t(this.shopMessage as TranslationKey),
            16,
          ).setOrigin(0.5),
        );
      this.panel.add(
        this.button(400, 514, t('games.gold-miner.next'), () => {
          nextLevel(s);
          this.shopMessage = '';
          this.persist();
          this.draw();
        }),
      );
    } else {
      const message =
        s.phase === 'ready'
          ? t('games.gold-miner.ready', { target: s.target })
          : t('games.gold-miner.result', {
              cash: s.cash,
              target: s.target,
              level: s.level,
            });
      this.panel.add(
        this.text(400, 340, message, 20).setOrigin(0.5).setAlign('center'),
      );
      this.panel.add(
        this.button(
          400,
          476,
          t(
            s.phase === 'ready'
              ? 'games.gold-miner.start'
              : 'games.gold-miner.restart',
          ),
          () => {
            if (s.phase === 'over') this.scene.restart({ snapshot: null });
            else {
              stepMiner(s, 0, true);
              this.draw();
            }
          },
        ),
      );
    }
  }
}

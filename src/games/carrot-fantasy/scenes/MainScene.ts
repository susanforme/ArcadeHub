import type Phaser from 'phaser';
import { useSettings } from '../../../app/store';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import type { TranslationKey } from '../../../i18n/translate';
import { Audio } from '../../../shared/audio';
import buildSound from '../assets/audio/build.mp3';
import musicSound from '../assets/audio/music.mp3';
import sellSound from '../assets/audio/sell.mp3';
import upgradeSound from '../assets/audio/upgrade.mp3';
import {
  build,
  canBuild,
  cellPoint,
  HEIGHT,
  isState,
  LEVELS,
  newGame,
  resolveTarget,
  type State,
  sell,
  startWave,
  step,
  TOWERS,
  type TowerKind,
  upgrade,
  WIDTH,
} from '../logic';

const files = import.meta.glob<string>('../assets/*.png', {
  eager: true,
  import: 'default',
});
const texture = (name: string) => `carrot-${name}`;
const tr = (name: string, values: Record<string, string | number> = {}) =>
  t(`games.carrot-fantasy.${name}` as TranslationKey, values);
export class MainScene extends SessionScene {
  protected inputBindings = {
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
    KeyR: 'SECONDARY',
    KeyL: 'MODE',
    Enter: 'START',
    Space: 'START',
    KeyF: 'SPECIAL',
  } as const;
  private state!: State;
  private music!: Howl;
  private field!: Phaser.GameObjects.Container;
  private panel!: Phaser.GameObjects.Container;
  private toolbar!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Text;
  private ink!: Phaser.GameObjects.Graphics;
  private carrot!: Phaser.GameObjects.Image;
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private bases = new Map<number, Phaser.GameObjects.Image>();
  private selection = -1;
  private menu = false;
  private speed = 1;
  private barKey = '';
  private language = '';
  private result = false;
  preload() {
    for (const [path, url] of Object.entries(files))
      this.load.image(
        texture(path.split('/').pop()?.replace('.png', '') ?? ''),
        url,
      );
  }
  create() {
    const carrotTexture = this.textures.get(texture('carrot'));
    if (!carrotTexture.has('body'))
      carrotTexture.add('body', 0, 43, 53, 66, 97);
    this.state = isState(this.savedSnapshot) ? this.savedSnapshot : newGame();
    this.sprites = new Map();
    this.bases = new Map();
    this.selection = -1;
    this.menu = false;
    this.speed = 1;
    this.barKey = '';
    this.result = false;
    this.field = this.add.container(0, 0);
    this.ink = this.add.graphics().setDepth(4);
    this.toolbar = this.add.container(0, 0).setDepth(10);
    this.panel = this.add.container(0, 0).setDepth(20);
    this.add
      .graphics()
      .fillStyle(0x123e61, 0.93)
      .fillRoundedRect(14, 12, 932, 65, 18)
      .setDepth(10);
    this.hud = this.text(36, 32, '', 26, '#fff6d0').setDepth(11);
    this.button(786, 44, tr('levels'), () => this.showMenu(), 90).setDepth(11);
    this.button(
      892,
      44,
      tr('retry'),
      () => this.loadLevel(this.state.level),
      90,
    ).setDepth(11);
    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        objects: Phaser.GameObjects.GameObject[],
      ) => {
        if (
          objects.length ||
          this.menu ||
          this.result ||
          this.status !== 'playing'
        )
          return;
        const p = pointer.positionToCamera(
          this.cameras.main,
        ) as Phaser.Math.Vector2;
        if (p.y < 80 || p.y >= 640) return;
        const enemy = [...this.state.enemies]
          .reverse()
          .find((e) => Math.hypot(e.x - p.x, e.y - p.y) < 35);
        if (enemy) {
          this.state.target = { type: 'enemy', id: enemy.id };
          this.selection = -1;
          this.barKey = '';
          return;
        }
        const cell = Math.floor(p.y / 80) * 12 + Math.floor(p.x / 80);
        const obstacle = this.state.obstacles.find((o) =>
          o.cells.includes(cell),
        );
        if (obstacle) {
          this.state.target =
            this.state.target?.id === obstacle.id &&
            this.state.target.type === 'obstacle'
              ? null
              : { type: 'obstacle', id: obstacle.id };
          this.selection = -1;
        } else {
          this.selection = this.selection === cell ? -1 : cell;
          this.state.target = null;
        }
        this.barKey = '';
        Audio.play('click');
      },
    );
    this.music = new Howl({ src: [musicSound], loop: true });
    this.events.once('shutdown', () => this.music.unload());
    this.begin();
    this.loadLevel(this.state.level, true);
  }
  private text(
    x: number,
    y: number,
    message: string,
    size = 22,
    color = '#fff6d0',
  ) {
    return this.add.text(x, y, message, {
      fontFamily: 'Arial, "PingFang SC", sans-serif',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      align: 'center',
    });
  }
  private button(
    x: number,
    y: number,
    label: string,
    callback: () => void,
    width = 130,
  ) {
    const b = this.text(x, y, label, 22)
      .setBackgroundColor('#246589')
      .setPadding(10, 12)
      .setFixedSize(width, 50)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => {
      if (this.status === 'playing') {
        Audio.play('click');
        callback();
      }
    });
    b.on('pointerover', () => b.setBackgroundColor('#3484a2'));
    b.on('pointerout', () => b.setBackgroundColor('#246589'));
    return b;
  }
  private image(x: number, y: number, name: string) {
    return this.add.image(
      x,
      y,
      texture(name),
      name === 'carrot' ? 'body' : undefined,
    );
  }
  private loadLevel(index: number, restore = false) {
    if (!restore) this.state = newGame(index, this.state.best);
    for (const sprite of this.sprites.values()) sprite.destroy();
    for (const base of this.bases.values()) base.destroy();
    this.field.removeAll(true);
    this.panel.removeAll(true);
    this.toolbar.removeAll(true);
    this.sprites.clear();
    this.bases.clear();
    this.selection = -1;
    this.menu = false;
    this.result = false;
    this.barKey = '';
    this.language = useSettings.getState().language;
    this.field.add(this.image(480, 320, `BG${LEVELS[index].background}`));
    this.field.add(this.image(480, 320, `level-${index + 1}-Path`));
    const start = LEVELS[index].path[0],
      end = LEVELS[index].path[LEVELS[index].path.length - 1];
    this.field.add(this.image(start.x, start.y - 8, 'start01'));
    this.carrot = this.image(end.x, end.y - 18, 'carrot')
      .setDisplaySize(74, 95)
      .setDepth(6);
    this.field.add(this.carrot);
    this.score = this.state.score;
    this.publish();
    this.draw();
    if (this.state.phase === 'won' || this.state.phase === 'lost')
      this.showResult();
    this.persist();
  }
  update(_time: number, delta: number) {
    const active = this.frame(delta);
    if (!active) {
      this.music.pause();
      this.tweens.pauseAll();
      return;
    }
    this.tweens.resumeAll();
    if (this.controls.consume('SECONDARY')) this.loadLevel(this.state.level);
    if (this.controls.consume('MODE')) this.showMenu();
    if (this.controls.consume('SPECIAL')) {
      this.speed = this.speed === 1 ? 2 : 1;
      this.barKey = '';
    }
    if (this.controls.consume('START')) {
      if (this.result)
        this.loadLevel(
          this.state.phase === 'won'
            ? Math.min(11, this.state.level + 1)
            : this.state.level,
        );
      else if (this.menu) {
        this.closeMenu();
      } else startWave(this.state);
    }
    if (this.language !== useSettings.getState().language) {
      this.language = useSettings.getState().language;
      this.barKey = '';
      if (this.menu) this.showMenu();
      else if (this.result) this.showResult();
    }
    if (this.menu || this.result) {
      this.music.pause();
      return;
    }
    if (!this.music.playing()) this.music.play();
    const previous = this.state.phase,
      oldHealth = this.state.health;
    let dt = (Math.min(delta, 100) / 1000) * this.speed;
    while (dt > 0) {
      const slice = Math.min(dt, 0.025);
      step(this.state, slice);
      dt -= slice;
    }
    if (this.state.health < oldHealth) {
      Audio.play('over');
      this.cameras.main.shake(100, 0.004);
    }
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      this.publish();
    }
    this.draw();
    if (
      previous !== this.state.phase &&
      (this.state.phase === 'won' || this.state.phase === 'lost')
    ) {
      Audio.play(this.state.phase === 'won' ? 'clear' : 'over');
      this.persist();
      this.showResult();
    }
  }
  private draw() {
    const s = this.state,
      map = LEVELS[s.level],
      live = new Set<string>();
    this.ink.clear();
    this.hud.setText(
      tr('hud', {
        level: s.level + 1,
        gold: s.gold,
        wave: s.wave,
        total: map.waves,
        health: s.health,
      }),
    );
    this.carrot.setTint(s.health > 3 ? 0xffffff : 0xff9999);
    const sprite = (id: string, x: number, y: number, name: string) => {
      live.add(id);
      let image = this.sprites.get(id);
      if (!image) {
        image = this.image(x, y, name);
        this.sprites.set(id, image);
      } else image.setTexture(texture(name));
      image.setPosition(x, y);
      return image;
    };
    const bar = (x: number, y: number, hp: number, max: number, width = 48) => {
      this.ink
        .fillStyle(0x183746, 0.85)
        .fillRoundedRect(x - width / 2, y, width, 7, 3);
      this.ink
        .fillStyle(hp / max > 0.3 ? 0x85d749 : 0xff6b68)
        .fillRoundedRect(
          x - width / 2 + 1,
          y + 1,
          ((width - 2) * hp) / max,
          5,
          2,
        );
    };
    for (const o of s.obstacles) {
      sprite(`o${o.id}`, o.x, o.y, o.kind).setDepth(2);
      if (o.hp < o.maxHp) bar(o.x, o.y - o.height / 2, o.hp, o.maxHp, 60);
    }
    for (const tower of s.towers) {
      if (!this.bases.has(tower.id)) {
        const name =
          tower.kind === 'Ball'
            ? `Ball${tower.level}1`
            : `${tower.kind}-${tower.kind === 'Bottle' ? '11' : `${tower.level}1`}`;
        const base = this.image(tower.x, tower.y, name).setDepth(2);
        this.bases.set(tower.id, base);
      }
      const base = this.bases.get(tower.id);
      if (base && tower.kind !== 'Bottle' && tower.kind !== 'Ball')
        base.setTexture(texture(`${tower.kind}-${tower.level}1`));
      const frame =
        tower.cooldown > TOWERS[tower.kind][tower.level - 1].interval - 0.12
          ? 2
          : 1;
      const image = sprite(
        `t${tower.id}`,
        tower.x,
        tower.y,
        `${tower.kind}${tower.level}${frame}`,
      ).setDepth(3);
      image.setRotation(
        tower.kind === 'Bottle'
          ? tower.angle
          : tower.kind === 'Fan'
            ? s.clock * 3
            : 0,
      );
    }
    for (const [id, base] of this.bases)
      if (!s.towers.some((t) => t.id === id)) {
        base.destroy();
        this.bases.delete(id);
      }
    for (const e of s.enemies) {
      sprite(
        `e${e.id}`,
        e.x,
        e.y - 14,
        `${e.kind}0${(Math.floor(s.clock / 0.18) % 2) + 1}`,
      )
        .setDepth(5)
        .setTint(e.slow > 0 ? 0x9bdbff : 0xffffff);
      bar(e.x, e.y - 48, e.hp, e.maxHp, e.kind === 'boss_big' ? 90 : 48);
    }
    for (const b of s.shots) {
      const victim = resolveTarget(s, b.target);
      if (b.kind === 'Ball' && victim) {
        this.ink
          .lineStyle(3, 0xd9bbff, 0.8)
          .lineBetween(b.fromX, b.fromY, victim.x, victim.y - 12);
        continue;
      }
      const name = `P${b.kind}${b.level}1`;
      const image = sprite(`b${b.id}`, b.x, b.y - 12, name).setDepth(6);
      // Fan and star projectiles use a rotating original sprite.
      image.setRotation(
        b.kind === 'Fan' || b.kind === 'Star' ? s.clock * 10 : 0,
      );
    }
    for (const [id, image] of this.sprites)
      if (!live.has(id)) {
        image.destroy();
        this.sprites.delete(id);
      }
    const selected = s.towers.find((t) => t.cell === this.selection);
    if (selected) {
      this.ink
        .fillStyle(0x98e17b, 0.13)
        .fillCircle(
          selected.x,
          selected.y,
          TOWERS[selected.kind][selected.level - 1].range,
        )
        .lineStyle(3, 0xbce97a, 0.7)
        .strokeCircle(
          selected.x,
          selected.y,
          TOWERS[selected.kind][selected.level - 1].range,
        );
    } else if (this.selection >= 0 && canBuild(s, this.selection)) {
      const p = cellPoint(this.selection);
      this.ink
        .lineStyle(4, 0xcbf86d)
        .strokeRoundedRect(p.x - 36, p.y - 36, 72, 72, 8);
      this.ink
        .lineBetween(p.x - 12, p.y, p.x + 12, p.y)
        .lineBetween(p.x, p.y - 12, p.x, p.y + 12);
    }
    const target = s.target && resolveTarget(s, s.target);
    if (target) {
      this.ink.lineStyle(3, 0xff8054).strokeCircle(target.x, target.y, 37);
      this.ink
        .lineBetween(target.x - 48, target.y, target.x - 25, target.y)
        .lineBetween(target.x + 25, target.y, target.x + 48, target.y)
        .lineBetween(target.x, target.y - 48, target.x, target.y - 25);
    }
    bar(this.carrot.x, this.carrot.y + 48, s.health, 10, 70);
    const barKey = [
      this.selection,
      s.gold,
      s.phase,
      s.target?.type,
      s.target?.id,
      selected?.level,
      this.speed,
      this.language,
    ].join(':');
    if (barKey !== this.barKey) {
      this.barKey = barKey;
      this.drawToolbar();
    }
  }
  private drawToolbar() {
    this.toolbar.removeAll(true);
    const s = this.state,
      map = LEVELS[s.level];
    this.toolbar.add(
      this.add
        .graphics()
        .fillStyle(0x153e60)
        .fillRect(0, 640, WIDTH, HEIGHT - 640),
    );
    const tower = s.towers.find((t) => t.cell === this.selection);
    if (tower) {
      const data = TOWERS[tower.kind][tower.level - 1];
      this.toolbar.add(
        this.image(60, 687, `${tower.kind}${tower.level}1`).setDisplaySize(
          64,
          64,
        ),
      );
      this.toolbar.add(
        this.text(
          105,
          657,
          `${tr(`tower.${tower.kind}`)}  Lv.${tower.level}`,
          22,
        ),
      );
      this.toolbar.add(
        this.text(105, 693, tr(`effect.${tower.kind}`), 18, '#bde3ea'),
      );
      const up = this.button(
        444,
        686,
        tower.level === 3 ? tr('max') : tr('upgrade', { gold: data.upgrade }),
        () => {
          if (upgrade(s, tower.id)) {
            Audio.playAsset(upgradeSound);
            this.barKey = '';
            this.persist();
          }
        },
        190,
      );
      if (tower.level === 3 || s.gold < data.upgrade)
        up.disableInteractive().setAlpha(0.45);
      this.toolbar.add(up);
      this.toolbar.add(
        this.button(
          634,
          686,
          tr('sell', { gold: data.sell }),
          () => {
            sell(s, tower.id);
            Audio.playAsset(sellSound);
            this.selection = -1;
            this.barKey = '';
            this.persist();
          },
          164,
        ),
      );
    } else if (s.target) {
      this.toolbar.add(
        this.text(
          35,
          663,
          tr(s.target.type === 'obstacle' ? 'clearing' : 'focus'),
          24,
        ),
      );
      this.toolbar.add(this.text(35, 701, tr('cancelTarget'), 18, '#bde3ea'));
    } else {
      for (const [i, name] of map.towers.entries()) {
        const kind = name as TowerKind,
          cost = TOWERS[kind][0].cost,
          x = 68 + i * 132;
        const image = this.image(x, 676, `${kind}11`).setDisplaySize(56, 56);
        const area = this.add
          .rectangle(x, 688, 124, 94, 0xffffff, 0)
          .setInteractive({ useHandCursor: true });
        area.on('pointerdown', () => {
          if (this.status !== 'playing' || this.menu || this.result) return;
          if (build(s, this.selection, kind)) {
            Audio.playAsset(buildSound);
            this.persist();
            this.barKey = '';
          } else {
            Audio.play('click');
            this.flash(tr(s.gold < cost ? 'noGold' : 'selectCell'));
          }
        });
        this.toolbar.add([
          image,
          this.text(x, 712, `${tr(`tower.${kind}`)} ${cost}`, 17).setOrigin(
            0.5,
          ),
          area,
        ]);
        if (s.gold < cost) image.setAlpha(0.4);
      }
    }
    this.toolbar.add(
      this.button(
        780,
        686,
        s.phase === 'ready' ? tr('start') : tr('speed', { speed: this.speed }),
        () => {
          if (!startWave(s)) this.speed = this.speed === 1 ? 2 : 1;
          this.barKey = '';
        },
        125,
      ),
    );
    this.toolbar.add(
      this.button(
        900,
        686,
        tr('deselect'),
        () => {
          this.selection = -1;
          s.target = null;
          this.barKey = '';
        },
        100,
      ),
    );
  }
  private flash(message: string) {
    const label = this.text(480, 610, message, 24)
      .setOrigin(0.5)
      .setPadding(16, 8)
      .setBackgroundColor('#164665')
      .setDepth(18);
    this.tweens.add({
      targets: label,
      alpha: 0,
      delay: 1600,
      duration: 350,
      onComplete: () => label.destroy(),
    });
  }
  private card() {
    this.panel.removeAll(true);
    this.panel.add(
      this.add.graphics().fillStyle(0x062e49, 0.82).fillRect(0, 80, 960, 660),
    );
  }
  private closeMenu() {
    this.menu = false;
    this.panel.removeAll(true);
    if (this.state.phase === 'won' || this.state.phase === 'lost')
      this.showResult();
  }
  private showMenu() {
    if (this.status !== 'playing') return;
    this.menu = true;
    this.result = false;
    this.card();
    this.panel.add(this.text(480, 105, tr('selectLevel'), 32).setOrigin(0.5));
    for (let i = 0; i < LEVELS.length; i++) {
      const x = 132 + (i % 4) * 232,
        y = 227 + Math.floor(i / 4) * 154;
      this.panel.add(
        this.add
          .graphics()
          .fillStyle(0x70b6d0)
          .fillRoundedRect(x - 101, y - 64, 202, 128, 14),
      );
      this.panel.add(
        this.image(x, y, `BG${LEVELS[i].background}`).setDisplaySize(190, 120),
      );
      this.panel.add(
        this.image(x, y, `level-${i + 1}-Path`).setDisplaySize(190, 120),
      );
      this.panel.add(
        this.button(
          x,
          y + 48,
          tr('stage', { level: i + 1 }),
          () => this.loadLevel(i),
          184,
        ),
      );
      if (this.state.best[i] > 0) {
        const color =
          this.state.best[i] === 10
            ? '#ffe587'
            : this.state.best[i] >= 7
              ? '#e0eef2'
              : '#eac198';
        this.panel.add(
          this.text(
            x,
            y - 41,
            tr('medal', { health: this.state.best[i] }),
            16,
            color,
          )
            .setOrigin(0.5)
            .setBackgroundColor('#18496b')
            .setPadding(8, 4),
        );
      }
    }
    this.panel.add(
      this.button(
        480,
        686,
        tr('return'),
        () => {
          this.closeMenu();
        },
        210,
      ),
    );
  }
  private showResult() {
    this.result = true;
    this.card();
    const won = this.state.phase === 'won';
    this.panel.add(
      this.text(480, 183, tr(won ? 'won' : 'lost'), 44).setOrigin(0.5),
    );
    this.panel.add(
      this.image(480, 320, won ? 'carrot' : 'boss_big01').setDisplaySize(
        won ? 110 : 200,
        150,
      ),
    );
    this.panel.add(
      this.text(
        480,
        429,
        tr(won ? 'result' : 'tryAgain', {
          health: this.state.health,
          cleared:
            LEVELS[this.state.level].obstacles.length -
            this.state.obstacles.length,
          total: LEVELS[this.state.level].obstacles.length,
        }),
        26,
      ).setOrigin(0.5),
    );
    this.panel.add(
      this.button(
        480,
        524,
        tr('retry'),
        () => this.loadLevel(this.state.level),
        230,
      ),
    );
    if (won && this.state.level < 11)
      this.panel.add(
        this.button(
          480,
          590,
          tr('next'),
          () => this.loadLevel(this.state.level + 1),
          230,
        ),
      );
    this.panel.add(
      this.button(
        480,
        660,
        tr('levels'),
        () => {
          this.result = false;
          this.showMenu();
        },
        230,
      ),
    );
  }
  protected snapshot() {
    return this.state;
  }
}

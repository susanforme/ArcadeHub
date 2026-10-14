import Phaser from 'phaser';
import { useSettings } from '../../../app/store';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import air from '../assets/air.svg';
import body from '../assets/body.png';
import candy from '../assets/candy.png';
import eye from '../assets/eye.png';
import foot from '../assets/foot.png';
import ground from '../assets/ground.png';
import mouth from '../assets/mouth.png';
import pin from '../assets/pin.png';
import smile from '../assets/smile.png';
import spike from '../assets/spike.png';
import star from '../assets/star.png';
import { HEIGHT, LEVELS, type Point, WIDTH } from '../levels';
import {
  type MatterAPI,
  type Progress,
  RopeWorld,
  readProgress,
  recordWin,
  totalScore,
} from '../physics';

const images = {
  body,
  candy,
  eye,
  foot,
  ground,
  mouth,
  pin,
  spike,
  smile,
  star,
};
const key = (name: string) => `cut-rope-${name}`;
const vectors = (points: Point[]) =>
  points.map((p) => new Phaser.Math.Vector2(p.x, p.y));
const themes = [0xf4e8cd, 0xe3efe0, 0xdcedef, 0xf2e0dc];
export class MainScene extends SessionScene {
  protected inputBindings = {
    KeyR: 'SECONDARY',
    KeyL: 'MODE',
    Enter: 'START',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  private progress!: Progress;
  private world!: RopeWorld;
  private field!: Phaser.GameObjects.Container;
  private panel!: Phaser.GameObjects.Container;
  private ropes!: Phaser.GameObjects.Graphics;
  private bubbles!: Phaser.GameObjects.Graphics;
  private trail!: Phaser.GameObjects.Graphics;
  private candy!: Phaser.GameObjects.Image;
  private mouth!: Phaser.GameObjects.Image;
  private monster!: Phaser.GameObjects.Container;
  private stars: Phaser.GameObjects.Image[] = [];
  private starHud: Phaser.GameObjects.Image[] = [];
  private title!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private menu = false;
  private lastPointer: Point | null = null;
  private pointerId: number | null = null;
  private trailPoints: Point[] = [];
  private language = '';
  private retryButton!: Phaser.GameObjects.Text;
  private menuButton!: Phaser.GameObjects.Text;
  preload() {
    this.load.svg(key('air'), air, { width: 128, height: 128 });
    for (const [name, url] of Object.entries(images))
      this.load.image(key(name), url);
  }
  create() {
    const starTexture = this.textures.get(key('star'));
    if (!starTexture.has('trimmed'))
      starTexture.add('trimmed', 0, 15, 18, 40, 40);
    this.progress = readProgress(this.savedSnapshot, LEVELS.length);
    this.menu = false;
    this.lastPointer = null;
    this.pointerId = null;
    this.trailPoints = [];
    this.field = this.add.container(0, 0);
    const header = this.add.graphics().setDepth(10);
    header.fillStyle(0x34594d).fillRoundedRect(16, 14, WIDTH - 32, 96, 16);
    this.title = this.text(34, 34, '', 21, '#fff5d9').setDepth(11);
    this.starHud = [0, 1, 2].map((i) =>
      this.add
        .image(49 + i * 38, 82, key('star'), 'trimmed')
        .setDisplaySize(28, 28)
        .setDepth(11),
    );
    this.retryButton = this.button(411, 61, '', () =>
      this.loadLevel(this.progress.level),
    ).setDepth(11);
    this.menuButton = this.button(518, 61, '', () => this.showMenu()).setDepth(
      11,
    );
    this.hint = this.text(300, 730, '', 17, '#597366')
      .setOrigin(0.5)
      .setAlign('center')
      .setDepth(11);
    this.trail = this.add.graphics().setDepth(15);
    this.panel = this.add.container(0, 0).setDepth(20);
    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        objects: Phaser.GameObjects.GameObject[],
      ) => {
        const position = pointer.positionToCamera(
          this.cameras.main,
        ) as Phaser.Math.Vector2;
        if (
          objects.length ||
          this.menu ||
          this.status !== 'playing' ||
          this.world.phase !== 'playing' ||
          position.y < 116 ||
          position.y > 690
        )
          return;
        if (
          this.world.bubble &&
          Phaser.Math.Distance.Between(
            position.x,
            position.y,
            this.world.candy.position.x,
            this.world.candy.position.y,
          ) < 44
        ) {
          this.world.popBubble();
          Audio.play('click');
          return;
        }
        this.pointerId = pointer.id;
        this.lastPointer = { x: position.x, y: position.y };
        this.trailPoints = [this.lastPointer];
        this.cut(this.lastPointer, this.lastPointer);
      },
    );
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (
        !pointer.isDown ||
        pointer.id !== this.pointerId ||
        !this.lastPointer ||
        this.menu ||
        this.status !== 'playing' ||
        this.world.phase !== 'playing'
      )
        return;
      const position = pointer.positionToCamera(
        this.cameras.main,
      ) as Phaser.Math.Vector2;
      const next = { x: position.x, y: position.y };
      this.cut(this.lastPointer, next);
      this.lastPointer = next;
      this.trailPoints.push(next);
      this.trailPoints = this.trailPoints.slice(-12);
    });
    const release = () => {
      this.lastPointer = null;
      this.pointerId = null;
      this.trailPoints = [];
      this.trail.clear();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('gameout', release);
    this.begin();
    this.loadLevel(this.progress.level);
    this.events.once('shutdown', () => this.world.destroy());
  }
  private text(
    x: number,
    y: number,
    message: string,
    size = 20,
    color = '#34594d',
  ) {
    return this.add.text(x, y, message, {
      fontFamily: 'Arial, "PingFang SC", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      align: 'center',
    });
  }
  private button(x: number, y: number, label: string, callback: () => void) {
    const b = this.text(x, y, label, 18, '#fff5d9')
      .setOrigin(0.5)
      .setPadding(14, 12)
      .setBackgroundColor('#527767')
      .setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => {
      if (this.status === 'playing') {
        this.lastPointer = null;
        this.pointerId = null;
        callback();
      }
    });
    b.on('pointerover', () => b.setBackgroundColor('#739780'));
    b.on('pointerout', () => b.setBackgroundColor('#527767'));
    return b;
  }
  private loadLevel(index: number) {
    this.world?.destroy();
    this.tweens.killAll();
    this.field.removeAll(true);
    this.panel.removeAll(true);
    this.progress.level = index;
    this.world = new RopeWorld(
      LEVELS[index],
      (Phaser.Physics.Matter as unknown as { Matter: MatterAPI }).Matter,
    );
    this.menu = false;
    this.lastPointer = null;
    this.pointerId = null;
    this.trailPoints = [];
    this.language = useSettings.getState().language;
    const level = this.world.level;
    const background = this.add.graphics();
    background.fillStyle(0xd0b98e).fillRect(0, 0, WIDTH, HEIGHT);
    background
      .fillStyle(themes[Math.floor(index / 3)])
      .fillRoundedRect(10, 8, WIDTH - 20, HEIGHT - 16, 20);
    background.lineStyle(1, 0x9a8868, 0.14);
    for (let y = 126; y < 690; y += 25) background.lineBetween(20, y, 580, y);
    background
      .lineStyle(2, 0xaa9672, 0.4)
      .strokeRoundedRect(22, 120, 556, 573, 12);
    this.field.add(background);
    this.field.add(
      this.add
        .tileSprite(300, 690, 554, 28, key('ground'))
        .setTileScale(0.65, 0.42),
    );
    this.ropes = this.add.graphics();
    this.field.add(this.ropes);
    for (const anchor of level.anchors)
      this.field.add(
        this.add.image(anchor.x, anchor.y, key('pin')).setDisplaySize(25, 25),
      );
    for (const hazard of this.world.hazards)
      this.field.add(
        this.add
          .image(hazard.position.x, hazard.position.y - 5.67, key('spike'))
          .setDisplaySize(24, 34),
      );
    this.bubbles = this.add.graphics();
    this.field.add(this.bubbles);
    this.stars = level.stars.map((p, i) => {
      const s = this.add
        .image(p.x, p.y, key('star'), 'trimmed')
        .setDisplaySize(36, 36);
      this.tweens.add({
        targets: s,
        angle: i % 2 ? -12 : 12,
        duration: 900 + i * 100,
        yoyo: true,
        repeat: -1,
      });
      this.field.add(s);
      return s;
    });
    (level.air ?? []).forEach((p, i) => {
      this.field.add(
        this.add
          .image(p.x, p.y, key('pin'))
          .setDisplaySize(76, 76)
          .setTint(0x75927d),
      );
      const pump = this.add
        .image(p.x, p.y, key('air'))
        .setDisplaySize(57, 57)
        .setAngle(p.direction > 0 ? -45 : 45)
        .setFlipX(p.direction < 0)
        .setInteractive({ useHandCursor: true });
      pump.on('pointerdown', () => {
        if (this.status !== 'playing' || this.menu || !this.world.blow(i))
          return;
        Audio.play('click');
        this.tweens.add({
          targets: pump,
          scaleY: pump.scaleY * 0.75,
          duration: 90,
          yoyo: true,
        });
      });
      this.field.add(pump);
    });
    const m = level.monster;
    this.monster = this.add.container(m.x, m.y);
    this.monster.add([
      this.add.ellipse(0, 65, 100, 15, 0x465d3b, 0.17),
      this.add.image(-27, 53, key('foot')).setDisplaySize(35, 30),
      this.add.image(27, 53, key('foot')).setDisplaySize(35, 30).setFlipX(true),
      this.add.image(0, 4, key('body')).setDisplaySize(106, 115),
      this.add.image(-18, -29, key('eye')).setDisplaySize(30, 30),
      this.add.image(18, -29, key('eye')).setDisplaySize(30, 30),
    ]);
    this.mouth = this.add.image(0, 0, key('mouth')).setDisplaySize(49, 32);
    this.monster.add(this.mouth);
    this.field.add(this.monster);
    this.candy = this.add
      .image(level.candy.x, level.candy.y, key('candy'))
      .setDisplaySize(44, 44);
    this.field.add(this.candy);
    this.score = totalScore(this.progress);
    this.publish();
    this.refreshLabels();
    this.draw();
    this.persist();
  }
  private refreshLabels() {
    this.title.setText(
      t('games.cut-the-rope.hud', {
        level: this.progress.level + 1,
        total: LEVELS.length,
      }),
    );
    this.retryButton.setText(t('games.cut-the-rope.retry'));
    this.menuButton.setText(t('games.cut-the-rope.levels'));
    this.hint.setText(t(`games.cut-the-rope.hint.${this.world.level.hint}`));
  }
  private cut(a: Point, b: Point) {
    const previous = this.world.ropes.map((r) =>
      this.world.ropePoints(r).map((p) => ({ ...p })),
    );
    for (const index of this.world.swipe(a, b)) {
      Audio.play('click');
      const fragment = this.add
        .graphics()
        .lineStyle(5, 0x99754b)
        .strokePoints(vectors(previous[index]), false);
      this.field.add(fragment);
      this.tweens.add({
        targets: fragment,
        y: 60,
        alpha: 0,
        duration: 350,
        onComplete: () => fragment.destroy(),
      });
    }
  }
  update(_time: number, delta: number) {
    const active = this.frame(delta);
    if (!active) {
      this.lastPointer = null;
      this.pointerId = null;
      this.trailPoints = [];
      this.trail.clear();
      this.tweens.pauseAll();
      return;
    }
    this.tweens.resumeAll();
    if (this.controls.consume('SECONDARY')) this.loadLevel(this.progress.level);
    if (this.controls.consume('MODE')) this.showMenu();
    if (this.controls.consume('START')) {
      if (this.menu) this.loadLevel(this.progress.level);
      else if (this.world.phase === 'lost') this.loadLevel(this.progress.level);
      else if (this.world.phase === 'won')
        this.loadLevel(Math.min(LEVELS.length - 1, this.progress.level + 1));
    }
    if (this.language !== useSettings.getState().language) {
      this.language = useSettings.getState().language;
      this.refreshLabels();
      if (this.menu) this.showMenu();
      else if (this.world.phase !== 'playing') this.showResult();
    }
    if (this.menu) return;
    const before = [...this.world.collected];
    const phase = this.world.phase;
    this.world.step(delta);
    this.world.collected.forEach((collected, i) => {
      if (!collected || before[i]) return;
      Audio.play('eat');
      const s = this.stars[i];
      this.tweens.killTweensOf(s);
      this.tweens.add({
        targets: s,
        y: s.y - 35,
        alpha: 0,
        scaleX: s.scaleX * 1.6,
        scaleY: s.scaleY * 1.6,
        duration: 260,
      });
    });
    this.draw();
    if (phase === 'playing' && this.world.phase !== 'playing') {
      if (this.world.phase === 'won') {
        recordWin(this.progress, this.world.collected.filter(Boolean).length);
        this.score = totalScore(this.progress);
        Audio.play('clear');
        this.publish();
        this.persist();
        this.mouth.setTexture(key('smile'));
        this.candy.setVisible(false);
        this.tweens.add({
          targets: this.monster,
          scaleX: 1.12,
          scaleY: 0.9,
          duration: 180,
          yoyo: true,
        });
      } else {
        Audio.play('over');
        this.candy.setTint(0xe86d65);
      }
      this.showResult();
    }
  }
  private draw() {
    const w = this.world;
    this.candy
      .setPosition(w.candy.position.x, w.candy.position.y)
      .setRotation(w.candy.angle);
    this.ropes.clear();
    for (const rope of w.ropes) {
      if (rope.cut) continue;
      const points = w.ropePoints(rope);
      this.ropes.lineStyle(6, 0x9d7a52).strokePoints(vectors(points), false);
      this.ropes.lineStyle(2, 0xe8c994).strokePoints(vectors(points), false);
    }
    this.bubbles.clear();
    const bubble = (p: Point) => {
      this.bubbles
        .fillStyle(0xabe8eb, 0.24)
        .fillCircle(p.x, p.y, 36)
        .lineStyle(2, 0x7bbdc8, 0.85)
        .strokeCircle(p.x, p.y, 36);
      this.bubbles
        .lineStyle(4, 0xffffff, 0.9)
        .beginPath()
        .arc(p.x, p.y, 27, 3.6, 4.6)
        .strokePath();
      this.bubbles.fillStyle(0xffffff, 0.75).fillCircle(p.x + 19, p.y + 13, 5);
    };
    (w.level.bubbles ?? []).forEach((p, i) => {
      if (!w.usedBubbles.has(i)) bubble(p);
    });
    if (w.bubble) bubble(w.candy.position);
    w.airTimers.forEach((timer, i) => {
      if (timer <= 0) return;
      const air = w.level.air?.[i];
      if (!air) return;
      this.bubbles.lineStyle(3, 0xffffff, 0.65);
      for (let n = -1; n <= 1; n++)
        this.bubbles.lineBetween(
          air.x + air.direction * 50,
          air.y + n * 12,
          air.x + air.direction * (100 + timer * 240),
          air.y + n * 20,
        );
    });
    this.starHud.forEach((s, i) => {
      s.setAlpha(w.collected[i] ? 1 : 0.23);
    });
    this.trail.clear();
    if (this.trailPoints.length > 1)
      this.trail
        .lineStyle(4, 0xffffff, 0.8)
        .strokePoints(vectors(this.trailPoints), false);
  }
  private card(title: string, message: string) {
    this.panel.removeAll(true);
    this.panel.add(
      this.add.graphics().fillStyle(0x253f35, 0.55).fillRect(0, 115, 600, 582),
    );
    this.panel.add(
      this.add
        .graphics()
        .fillStyle(0xfff4da)
        .fillRoundedRect(60, 212, 480, 390, 24)
        .lineStyle(3, 0xa6ba99)
        .strokeRoundedRect(60, 212, 480, 390, 24),
    );
    this.panel.add(this.text(300, 253, title, 28).setOrigin(0.5));
    this.panel.add(
      this.text(300, 320, message, 18).setOrigin(0.5).setWordWrapWidth(420),
    );
  }
  private showResult() {
    const won = this.world.phase === 'won';
    const finished = this.progress.best.every((n) => n >= 0);
    this.card(
      t(
        won
          ? finished
            ? 'games.cut-the-rope.complete'
            : 'games.cut-the-rope.won'
          : 'games.cut-the-rope.lost',
      ),
      t(
        won
          ? 'games.cut-the-rope.result'
          : `games.cut-the-rope.reason.${this.world.reason}`,
        {
          stars: this.world.collected.filter(Boolean).length,
          total: this.progress.best.reduce((sum, n) => sum + Math.max(0, n), 0),
        },
      ),
    );
    for (let i = 0; i < 3; i++)
      this.panel.add(
        this.add
          .image(232 + i * 68, 393, key('star'), 'trimmed')
          .setDisplaySize(52, 52)
          .setAlpha(this.world.collected[i] ? 1 : 0.2),
      );
    this.panel.add(
      this.button(300, 482, t('games.cut-the-rope.retry'), () =>
        this.loadLevel(this.progress.level),
      ),
    );
    this.panel.add(
      this.button(
        300,
        550,
        t(
          won && this.progress.level < LEVELS.length - 1
            ? 'games.cut-the-rope.next'
            : 'games.cut-the-rope.levels',
        ),
        () => {
          if (won && this.progress.level < LEVELS.length - 1)
            this.loadLevel(this.progress.level + 1);
          else this.showMenu();
        },
      ),
    );
  }
  private showMenu() {
    this.menu = true;
    this.lastPointer = null;
    this.pointerId = null;
    this.trailPoints = [];
    this.trail.clear();
    this.panel.removeAll(true);
    this.panel.add(
      this.add.graphics().fillStyle(0x253f35, 0.8).fillRect(0, 115, 600, 582),
    );
    this.panel.add(
      this.text(
        300,
        143,
        t('games.cut-the-rope.levels'),
        30,
        '#fff4da',
      ).setOrigin(0.5),
    );
    for (let row = 0; row < 4; row++) {
      this.panel.add(
        this.text(
          42,
          182 + row * 111,
          t(`games.cut-the-rope.box.${row + 1}` as 'games.cut-the-rope.box.1'),
          16,
          '#c3d6b3',
        ),
      );
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col,
          x = 150 + col * 150,
          y = 233 + row * 111;
        const unlocked = index <= this.progress.unlocked;
        const b = this.button(
          x,
          y,
          unlocked ? String(index + 1).padStart(2, '0') : '—',
          () => this.loadLevel(index),
        );
        b.setFixedSize(110, 68).setOrigin(0.5);
        if (!unlocked) b.disableInteractive().setAlpha(0.4);
        this.panel.add(b);
        for (let i = 0; i < 3; i++)
          this.panel.add(
            this.add
              .image(x - 22 + i * 22, y + 18, key('star'), 'trimmed')
              .setDisplaySize(17, 17)
              .setAlpha(this.progress.best[index] > i ? 1 : 0.18),
          );
      }
    }
    this.panel.add(
      this.text(
        300,
        769,
        'Art: Kenney · Bellows: Delapouite / CC BY 3.0',
        11,
        '#34594d',
      ).setOrigin(0.5),
    );
    this.panel.add(
      this.button(300, 672, t('games.cut-the-rope.return'), () => {
        this.menu = false;
        this.panel.removeAll(true);
      }),
    );
  }
  protected snapshot() {
    return this.progress;
  }
}

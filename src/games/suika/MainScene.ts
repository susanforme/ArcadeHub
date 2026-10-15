import type Phaser from 'phaser';
import { SessionScene } from '../../core/session-scene';
import { t } from '../../i18n';
import { Audio } from '../../shared/audio';
import {
  aimSuika,
  dropFruit,
  FLOOR,
  isSuikaState,
  LEFT,
  LIMIT,
  newSuika,
  RADII,
  RIGHT,
  type SuikaState,
  stepSuika,
} from './logic';

const images = import.meta.glob('./assets/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT' as const,
    KeyA: 'LEFT' as const,
    ArrowRight: 'RIGHT' as const,
    KeyD: 'RIGHT' as const,
    Space: 'DROP' as const,
    Enter: 'START' as const,
    KeyP: 'PAUSE' as const,
    Escape: 'PAUSE' as const,
  };
  private state!: SuikaState;
  private fruitImages = new Map<number, Phaser.GameObjects.Image>();
  private preview!: Phaser.GameObjects.Image;
  private nextImage!: Phaser.GameObjects.Image;
  private hud!: Phaser.GameObjects.Text;
  private help!: Phaser.GameObjects.Text;
  private guide!: Phaser.GameObjects.Graphics;
  private ending!: Phaser.GameObjects.Container;
  private touchId: number | null = null;
  preload() {
    Object.entries(images)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([, url], i) => {
        this.load.image(`suika-${i}`, url);
      });
  }
  create() {
    this.state = isSuikaState(this.savedSnapshot)
      ? this.savedSnapshot
      : newSuika();
    this.score = this.state.score;
    this.fruitImages = new Map();
    this.touchId = null;
    this.cameras.main.setBackgroundColor('#fff2d4');
    const g = this.add.graphics();
    g.fillStyle(0xeec688);
    g.fillRoundedRect(18, 146, 444, 510, 18);
    g.fillStyle(0xffe4b0);
    g.fillRect(LEFT, 146, RIGHT - LEFT, FLOOR - 146);
    g.lineStyle(3, 0xba7c41);
    g.strokeRoundedRect(18, 146, 444, 510, 18);
    const style = {
      fontFamily: 'Arial, "PingFang SC", sans-serif',
      fontSize: '20px',
      color: '#633c29',
    };
    this.hud = this.add.text(26, 20, '', style);
    this.add.text(344, 23, t('games.suika.next'), {
      ...style,
      fontSize: '15px',
    });
    this.nextImage = this.add.image(418, 34, 'suika-0').setDisplaySize(35, 35);
    this.preview = this.add.image(240, 108, 'suika-0').setDepth(2);
    this.guide = this.add.graphics();
    this.help = this.add
      .text(240, 681, t('games.suika.hint'), {
        ...style,
        fontSize: '15px',
        align: 'center',
        wordWrap: { width: 440 },
      })
      .setOrigin(0.5);
    this.ending = this.add.container(0, 0).setDepth(10).setVisible(false);
    this.ending.add(this.add.rectangle(240, 350, 400, 220, 0x543727, 0.95));
    this.ending.add(
      this.add
        .text(240, 305, t('games.suika.over'), {
          ...style,
          color: '#fff2d4',
          fontSize: '28px',
        })
        .setOrigin(0.5),
    );
    const again = this.add
      .text(240, 391, t('games.suika.again'), {
        ...style,
        color: '#543727',
        backgroundColor: '#ffd58b',
        padding: { x: 20, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    again.on('pointerdown', () => {
      if (this.status === 'over') this.scene.restart({ snapshot: null });
    });
    this.ending.add(again);
    this.begin();
    const down = (p: Phaser.Input.Pointer) => {
      if (this.status !== 'playing' || this.touchId !== null) return;
      this.touchId = p.id;
      aimSuika(this.state, this.cameras.main.getWorldPoint(p.x, p.y).x);
    };
    const move = (p: Phaser.Input.Pointer) => {
      if (this.status === 'playing' && (this.touchId === p.id || !p.isDown))
        aimSuika(this.state, this.cameras.main.getWorldPoint(p.x, p.y).x);
    };
    const up = (p: Phaser.Input.Pointer) => {
      if (this.touchId !== p.id) return;
      this.touchId = null;
      if (
        this.status === 'playing' &&
        this.cameras.main.getWorldPoint(p.x, p.y).y < 660
      ) {
        aimSuika(this.state, this.cameras.main.getWorldPoint(p.x, p.y).x);
        if (dropFruit(this.state)) Audio.play('click');
      }
    };
    const outside = () => {
      this.touchId = null;
    };
    this.input.on('pointerdown', down);
    this.input.on('pointermove', move);
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', outside);
    const reset = this.controls.onReset(outside);
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', down);
      this.input.off('pointermove', move);
      this.input.off('pointerup', up);
      this.input.off('pointerupoutside', outside);
      reset();
    });
    this.draw();
  }
  update(_time: number, delta: number) {
    if (this.status === 'over') {
      this.controls.poll();
      if (this.controls.consume('START') || this.controls.consume('DROP'))
        this.scene.restart({ snapshot: null });
      return;
    }
    if (!this.frame(delta)) return;
    const dir =
      Number(this.controls.down('RIGHT')) - Number(this.controls.down('LEFT'));
    aimSuika(this.state, this.state.aim + dir * Math.min(delta, 100) * 0.4);
    const drop = this.controls.consume('DROP'),
      start = this.controls.consume('START');
    if ((drop || start) && dropFruit(this.state)) Audio.play('click');
    stepSuika(this.state, delta / 1000);
    if (this.score !== this.state.score) {
      this.score = this.state.score;
      Audio.play('eat');
      this.publish();
    }
    this.draw();
    if (this.state.over) this.finish('games.suika.over');
  }
  protected snapshot() {
    return this.state.over ? null : this.state;
  }
  private draw() {
    const s = this.state,
      active = new Set<number>();
    for (const f of s.fruits) {
      active.add(f.id);
      let sprite = this.fruitImages.get(f.id);
      if (!sprite) {
        sprite = this.add.image(f.x, f.y, `suika-${f.kind}`);
        this.fruitImages.set(f.id, sprite);
      }
      sprite
        .setPosition(f.x, f.y)
        .setDisplaySize(RADII[f.kind] * 2, RADII[f.kind] * 2);
    }
    for (const [id, image] of this.fruitImages)
      if (!active.has(id)) {
        image.destroy();
        this.fruitImages.delete(id);
      }
    this.preview
      .setTexture(`suika-${s.current}`)
      .setPosition(s.aim, 108)
      .setDisplaySize(RADII[s.current] * 2, RADII[s.current] * 2)
      .setAlpha(s.cooldown > 0 ? 0.35 : 1)
      .setVisible(!s.over);
    this.nextImage.setTexture(`suika-${s.next}`);
    this.hud.setText(t('games.suika.score', { score: s.score }));
    this.guide.clear().lineStyle(2, s.overflow > 0 ? 0xe34d4d : 0xce9870, 0.7);
    for (let x = LEFT; x < RIGHT; x += 16)
      this.guide.lineBetween(x, LIMIT, x + 8, LIMIT);
    this.guide
      .lineStyle(1, 0xae7a4c, 0.25)
      .lineBetween(s.aim, 145, s.aim, FLOOR);
    this.help.setText(
      s.overflow > 0
        ? t('games.suika.warning', { seconds: (2 - s.overflow).toFixed(1) })
        : t('games.suika.hint'),
    );
    this.ending.setVisible(s.over);
  }
}

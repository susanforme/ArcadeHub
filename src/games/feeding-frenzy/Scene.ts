import type Phaser from 'phaser';
import { SessionScene } from '../../core/session-scene';
import { t } from '../../i18n';
import { Audio } from '../../shared/audio';
import {
  type FeedingState,
  feedingStage,
  fishSize,
  isFeedingState,
  newFeedingState,
  stepFeeding,
} from './logic';

const assets = import.meta.glob('./assets/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
export class FeedingScene extends SessionScene {
  private state!: FeedingState;
  private player!: Phaser.GameObjects.Image;
  private hud!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Graphics;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private target = { x: 300, y: 350 };
  preload() {
    for (const [path, url] of Object.entries(assets))
      this.load.image(`ff-${path.split('/').pop()?.replace('.png', '')}`, url);
  }
  create() {
    const frames: Record<string, [number, number, number, number]> = {
      fish_blue: [3, 16, 58, 32],
      fish_pink: [12, 21, 40, 23],
      fish_red: [4, 10, 56, 44],
      fish_orange: [5, 17, 54, 30],
      bubble_a: [26, 26, 12, 12],
      fish_green: [5, 14, 54, 38],
    };
    for (const [name, frame] of Object.entries(frames)) {
      const texture = this.textures.get(`ff-${name}`);
      if (!texture.has('trimmed')) texture.add('trimmed', 0, ...frame);
    }

    this.state = isFeedingState(this.savedSnapshot)
      ? structuredClone(this.savedSnapshot)
      : newFeedingState();
    this.target = { x: this.state.x, y: this.state.y };
    this.sprites.clear();
    this.score = this.state.score;
    this.cameras.main.setBackgroundColor('#075d83');
    this.add.rectangle(300, 410, 600, 600, 0x0c779b);
    this.add.rectangle(300, 741, 600, 78, 0xd9bc7d);
    for (let i = 0; i < 8; i++)
      this.add
        .image(
          i * 85 + 10,
          695,
          i % 2 ? 'ff-seaweed_green_a' : 'ff-seaweed_pink_b',
        )
        .setOrigin(0.5, 1)
        .setScale(1.6);
    for (let i = 0; i < 15; i++)
      this.add
        .image((i * 113) % 600, 160 + ((i * 97) % 520), 'ff-bubble_a')
        .setAlpha(0.22)
        .setScale(0.5 + (i % 3) * 0.4);
    this.add.text(24, 20, t('games.feedingFrenzy.name'), {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.hud = this.add.text(24, 61, '', {
      fontSize: '18px',
      color: '#d7f8ff',
    });
    this.bar = this.add.graphics();
    this.player = this.add
      .image(this.state.x, this.state.y, 'ff-fish_orange', 'trimmed')
      .setDepth(5);
    this.add
      .text(300, 741, t('games.feedingFrenzy.hint'), {
        fontSize: '17px',
        color: '#294b52',
        align: 'center',
        wordWrap: { width: 550 },
      })
      .setOrigin(0.5);
    const point = (p: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.status === 'playing' && world.y > 115 && world.y < 710)
        this.target = { x: world.x, y: world.y };
    };
    this.input.on('pointerdown', point);
    this.input.on('pointermove', point);
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', point);
      this.input.off('pointermove', point);
    });
    this.begin();
    this.controls.onReset(() => {
      this.target = { x: this.state.x, y: this.state.y };
    });
    this.draw();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) return;
    const dx =
        Number(this.controls.down('RIGHT')) -
        Number(this.controls.down('LEFT')),
      dy =
        Number(this.controls.down('DOWN')) - Number(this.controls.down('UP'));
    if (dx || dy)
      this.target = { x: this.state.x + dx * 100, y: this.state.y + dy * 100 };
    const old = this.state.eaten,
      lives = this.state.lives,
      x = this.state.x;
    stepFeeding(this.state, delta / 1000, this.target);
    if (old !== this.state.eaten) Audio.play('eat');
    if (lives !== this.state.lives) Audio.play('click');
    if (this.state.x !== x) this.player.setFlipX(this.state.x < x);
    this.score = this.state.score;
    this.draw();
    if (old !== this.state.eaten || lives !== this.state.lives) this.publish();
    if (
      this.state.eaten >= 50 ||
      this.state.lives <= 0 ||
      this.state.seconds <= 0
    ) {
      this.finish(
        this.state.eaten >= 50 ? 'games.feedingFrenzy.win' : 'game.gameOver',
      );
      this.add.rectangle(300, 390, 500, 200, 0x06374b, 0.95).setDepth(10);
      this.add
        .text(
          300,
          345,
          t(
            this.state.eaten >= 50
              ? 'games.feedingFrenzy.win'
              : 'game.gameOver',
          ),
          { fontSize: '30px' },
        )
        .setOrigin(0.5)
        .setDepth(11);
      this.add
        .text(300, 425, t('game.playAgainAction'), {
          fontSize: '26px',
          backgroundColor: '#edac45',
          color: '#102e3c',
          padding: { x: 25, y: 15 },
        })
        .setOrigin(0.5)
        .setDepth(11)
        .setInteractive()
        .on('pointerdown', () => this.scene.restart({ snapshot: null }));
    }
  }
  private draw() {
    const s = this.state,
      size = fishSize(s.eaten);
    this.player
      .setPosition(s.x, s.y)
      .setDisplaySize(size, size * 0.65)
      .setAlpha(s.grace > 0 ? 0.55 + Math.sin(s.grace * 22) * 0.3 : 1);
    const live = new Set(s.fish.map((f) => f.id));
    for (const [id, sprite] of this.sprites)
      if (!live.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    for (const f of s.fish) {
      let sprite = this.sprites.get(f.id);
      if (!sprite) {
        sprite = this.add
          .image(
            f.x,
            f.y,
            ['ff-fish_blue', 'ff-fish_green', 'ff-fish_pink', 'ff-fish_red'][
              f.id % 4
            ],
            'trimmed',
          )
          .setDepth(3);
        this.sprites.set(f.id, sprite);
      }
      sprite
        .setPosition(f.x, f.y)
        .setDisplaySize(f.size, f.size * 0.65)
        .setFlipX(f.vx < 0)
        .setTint(f.size >= size ? 0xffb3a8 : 0xffffff);
    }
    this.hud.setText(
      t('games.feedingFrenzy.hud', {
        stage: feedingStage(s.eaten),
        count: s.eaten,
        lives: s.lives,
        seconds: Math.ceil(s.seconds),
      }),
    );
    this.bar
      .clear()
      .fillStyle(0x03455b)
      .fillRoundedRect(24, 96, 552, 9, 4)
      .fillStyle(0xffcc58)
      .fillRoundedRect(24, 96, Math.max(9, (552 * s.eaten) / 50), 9, 4);
  }
  protected snapshot() {
    return this.state;
  }
}

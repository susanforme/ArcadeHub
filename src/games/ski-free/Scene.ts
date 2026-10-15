import type Phaser from 'phaser';
import { SessionScene } from '../../core/session-scene';
import { t } from '../../i18n';
import { Audio } from '../../shared/audio';
import objects from './assets/skifree-objects.png';
import chars from './assets/sprite-characters.png';
import {
  isSkiState,
  jumpSki,
  newSkiState,
  type SkiState,
  stepSki,
} from './logic';
export class SkiScene extends SessionScene {
  private state!: SkiState;
  private skier!: Phaser.GameObjects.Image;
  private yeti!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Ellipse;
  private hud!: Phaser.GameObjects.Text;
  private notice!: Phaser.GameObjects.Text;
  private jumpButton!: Phaser.GameObjects.Text;
  private track!: Phaser.GameObjects.Graphics;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private targetX: number | null = null;
  private brake = false;
  preload() {
    this.load.image('ski-characters', chars);
    this.load.image('ski-objects', objects);
  }
  create() {
    this.state = isSkiState(this.savedSnapshot)
      ? structuredClone(this.savedSnapshot)
      : newSkiState();
    this.sprites.clear();
    this.targetX = null;
    this.brake = false;
    this.score = Math.floor(this.state.distance) + this.state.bonus;
    const frames: [string, string, number, number, number, number][] = [
      ['down', 'ski-characters', 65, 0, 17, 34],
      ['right', 'ski-characters', 49, 0, 17, 34],
      ['left', 'ski-characters', 49, 37, 17, 34],
      ['jump', 'ski-characters', 84, 0, 32, 34],
      ['crash', 'ski-characters', 242, 0, 31, 34],
      ['yeti', 'ski-characters', 64, 112, 26, 43],
      ['tree', 'ski-objects', 95, 66, 32, 64],
      ['rock', 'ski-objects', 30, 52, 23, 11],
      ['ramp', 'ski-objects', 109, 55, 32, 8],
    ];
    for (const [name, key, x, y, w, h] of frames) {
      const texture = this.textures.get(key);
      if (!texture.has(name)) texture.add(name, 0, x, y, w, h);
    }
    this.cameras.main.setBackgroundColor('#f5fbff');
    this.track = this.add.graphics().setDepth(0);
    this.shadow = this.add
      .ellipse(this.state.x, 292, 45, 12, 0x7896aa, 0.2)
      .setDepth(3);
    this.skier = this.add
      .image(this.state.x, 280, 'ski-characters', 'down')
      .setScale(1.9)
      .setOrigin(0.5, 1)
      .setDepth(4);
    this.yeti = this.add
      .image(this.state.x, 0, 'ski-characters', 'yeti')
      .setScale(2)
      .setDepth(5)
      .setVisible(false);
    this.add.rectangle(300, 53, 600, 106, 0x12334e).setDepth(20);
    this.add
      .text(20, 16, t('games.skiFree.name'), {
        fontSize: '27px',
        color: '#fff',
        fontStyle: 'bold',
      })
      .setDepth(21);
    this.hud = this.add
      .text(20, 60, '', { fontSize: '19px', color: '#b9e2f4' })
      .setDepth(21);
    this.notice = this.add
      .text(300, 130, t('games.skiFree.hint'), {
        fontSize: '16px',
        color: '#345b73',
        align: 'center',
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.jumpButton = this.add
      .text(485, 730, t('games.skiFree.jump'), {
        fontSize: '23px',
        color: '#fff',
        backgroundColor: '#24628c',
        padding: { x: 22, y: 14 },
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setInteractive();
    this.jumpButton.on('pointerdown', () => {
      if (this.status === 'playing' && jumpSki(this.state)) Audio.play('click');
    });
    const brake = this.add
      .text(105, 730, t('games.skiFree.brake'), {
        fontSize: '23px',
        color: '#fff',
        backgroundColor: '#668497',
        padding: { x: 22, y: 14 },
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setInteractive();
    brake.on('pointerdown', () => {
      this.brake = true;
    });
    const move = (p: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.status === 'playing' && world.y > 160 && world.y < 680)
        this.targetX = world.x;
    };
    const up = () => {
      this.brake = false;
    };
    this.input.on('pointerdown', move);
    this.input.on('pointermove', move);
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', move);
      this.input.off('pointermove', move);
      this.input.off('pointerup', up);
      this.input.off('pointerupoutside', up);
    });
    this.begin();
    this.controls.onReset(() => {
      this.targetX = null;
      this.brake = false;
    });
    this.draw(0);
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) return;
    let steer =
      Number(this.controls.down('RIGHT')) - Number(this.controls.down('LEFT'));
    if (steer) this.targetX = null;
    else if (this.targetX !== null)
      steer = Math.max(-1, Math.min(1, (this.targetX - this.state.x) / 45));
    if (this.controls.consume('DROP') && jumpSki(this.state))
      Audio.play('click');
    const lives = this.state.lives,
      score = this.score;
    stepSki(
      this.state,
      delta / 1000,
      steer,
      this.brake || this.controls.down('UP'),
    );
    this.score = Math.floor(this.state.distance) + this.state.bonus;
    this.draw(steer);
    if (score !== this.score) this.publish();
    if (lives !== this.state.lives) Audio.play('click');
    if (
      this.state.lives <= 0 ||
      this.state.yetiGap <= 0 ||
      this.state.distance >= 2000
    ) {
      const won = this.state.distance >= 2000;
      this.finish(won ? 'games.skiFree.win' : 'game.gameOver');
      this.add.rectangle(300, 395, 500, 220, 0x12334e, 0.95).setDepth(40);
      this.add
        .text(300, 345, t(won ? 'games.skiFree.win' : 'game.gameOver'), {
          fontSize: '30px',
        })
        .setOrigin(0.5)
        .setDepth(41);
      this.add
        .text(300, 425, t('game.playAgainAction'), {
          fontSize: '26px',
          backgroundColor: '#347eae',
          padding: { x: 25, y: 15 },
        })
        .setOrigin(0.5)
        .setDepth(41)
        .setInteractive()
        .on('pointerdown', () => this.scene.restart({ snapshot: null }));
    }
  }
  private draw(steer: number) {
    const s = this.state;
    this.track.clear().lineStyle(1, 0xd5e6ee);
    for (let i = 0; i < 20; i++) {
      const y = ((i * 57 + s.distance * 8) % 700) + 100,
        x = (i * 137) % 600;
      this.track.lineBetween(x, y, x - 8, y + 20);
    }
    this.skier
      .setPosition(
        s.x,
        285 -
          (s.jump > 0
            ? Math.sin(Math.min(1, s.jump / 1.15) * Math.PI) * 45
            : 0),
      )
      .setFrame(
        s.jump > 0
          ? 'jump'
          : s.grace > 1.5
            ? 'crash'
            : steer < -0.1
              ? 'left'
              : steer > 0.1
                ? 'right'
                : 'down',
      )
      .setAlpha(s.grace ? 0.55 + Math.sin(s.grace * 20) * 0.3 : 1);
    this.shadow.setPosition(s.x, 292);
    const ids = new Set(s.obstacles.map((o) => o.id));
    for (const [id, image] of this.sprites)
      if (!ids.has(id)) {
        image.destroy();
        this.sprites.delete(id);
      }
    for (const o of s.obstacles) {
      let image = this.sprites.get(o.id);
      if (!image) {
        image = this.add
          .image(o.x, o.y, 'ski-objects', o.kind)
          .setScale(1.8)
          .setOrigin(0.5, 1);
        this.sprites.set(o.id, image);
      }
      image.setPosition(o.x, o.y).setDepth(o.y > 300 ? 6 : 2);
    }
    this.yeti
      .setVisible(s.distance >= 1000)
      .setPosition(s.x + Math.sin(s.distance / 25) * 40, 285 - s.yetiGap)
      .setFlipX(steer < 0);
    this.notice.setText(
      t(s.distance >= 1000 ? 'games.skiFree.yeti' : 'games.skiFree.hint'),
    );
    this.hud.setText(
      t('games.skiFree.hud', {
        distance: Math.floor(s.distance),
        lives: s.lives,
        speed: Math.round(s.speed / 5),
        bonus: s.bonus,
      }),
    );
    this.jumpButton.setAlpha(s.cooldown > 0 ? 0.5 : 1);
  }
  protected snapshot() {
    return this.state;
  }
}

import Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import { frames } from '../assets/frames';
import hitSound from '../assets/hit.ogg';
import pressSound from '../assets/press.ogg';
import reachedSound from '../assets/reached.ogg';
import sheet from '../assets/sprites.png';
import {
  DINO_HEIGHT,
  DINO_X,
  GROUND,
  isRunnerState,
  newRunner,
  type RunnerState,
  stepRunner,
  WIDTH,
} from '../logic';

const ATLAS = 't-rex-atlas';
export class MainScene extends SessionScene {
  private state!: RunnerState;
  private dino!: Phaser.GameObjects.Image;
  private ground!: Phaser.GameObjects.TileSprite;
  private obstacles = new Map<number, Phaser.GameObjects.Image>();
  private clouds: Phaser.GameObjects.Image[] = [];
  private moon!: Phaser.GameObjects.Image;
  private stars: Phaser.GameObjects.Image[] = [];
  private digits: Phaser.GameObjects.Image[] = [];
  private ready!: Phaser.GameObjects.Text;
  private gameover!: Phaser.GameObjects.Text;
  private elapsed = 0;
  preload() {
    this.load.image(ATLAS, sheet);
  }
  create() {
    this.state = isRunnerState(this.savedSnapshot)
      ? this.savedSnapshot
      : newRunner();
    this.score = this.state.score;
    this.elapsed = 0;
    this.obstacles = new Map();
    const texture = this.textures.get(ATLAS);
    texture.setFilter(Phaser.Textures.NEAREST);
    for (const [name, [x, y, width, height]] of Object.entries(frames)) {
      if (!texture.has(name)) texture.add(name, 0, x, y, width, height);
    }
    this.clouds = [0, 1, 2].map((index) =>
      this.add
        .image(140 + index * 200, 45 + (index % 2) * 22, ATLAS, 'cloud')
        .setOrigin(0)
        .setScale(0.5)
        .setAlpha(0.6),
    );
    this.moon = this.add
      .image(485, 22, ATLAS, 'moon')
      .setOrigin(0)
      .setScale(0.5);
    this.stars = [
      [90, 25],
      [280, 50],
      [390, 25],
    ].map(([x, y]) =>
      this.add.image(x, y, ATLAS, 'star').setOrigin(0).setScale(0.5),
    );
    this.ground = this.add
      .tileSprite(0, GROUND - 13, WIDTH, 12, ATLAS, 'ground')
      .setOrigin(0);
    this.ground.tileScaleX = 0.5;
    this.ground.tileScaleY = 0.5;
    this.dino = this.add
      .image(DINO_X, GROUND - DINO_HEIGHT, ATLAS, 'idle')
      .setOrigin(0)
      .setScale(0.5)
      .setDepth(3);
    this.digits = Array.from({ length: 5 }, (_, index) =>
      this.add
        .image(WIDTH - 65 + index * 11, 18, ATLAS, 'digit0')
        .setOrigin(0)
        .setScale(0.5)
        .setDepth(4),
    );
    this.ready = this.add
      .text(WIDTH / 2, 92, t('games.t-rex-runner.startHint'), {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#777777',
      })
      .setOrigin(0.5)
      .setDepth(4);
    this.gameover = this.add
      .text(WIDTH / 2, 75, t('native.gameOver'), {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#535353',
      })
      .setOrigin(0.5)
      .setDepth(4)
      .setVisible(false);
    this.input.on('pointerdown', () => {
      if (this.status === 'playing') this.controls.press('UP');
    });
    const release = () => this.controls.release('UP');
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.begin();
    this.draw();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) return;
    const up = this.controls.consume('UP');
    const space = this.controls.consume('DROP');
    const jump = up || space;
    if (jump && this.state.lift === 0 && !this.controls.down('DOWN'))
      Audio.playAsset(pressSound);
    const oldScore = this.state.score;
    this.state = stepRunner(this.state, delta / 1000, {
      jump,
      held: this.controls.down('UP') || this.controls.down('DROP'),
      duck: this.controls.down('DOWN'),
    });
    this.score = this.state.score;
    this.elapsed += Math.min(delta, 100);
    if (this.score !== oldScore) {
      this.publish();
      if (Math.floor(this.score / 100) > Math.floor(oldScore / 100))
        Audio.playAsset(reachedSound);
    }
    this.draw();
    if (this.state.phase === 'over') {
      Audio.playAsset(hitSound);
      this.finish(t('games.t-rex-runner.gameOver'), false);
    }
  }
  protected snapshot() {
    return this.state.phase === 'over' ? null : this.state;
  }
  private draw() {
    const night = this.state.nightRemaining > 0;
    this.cameras.main.setBackgroundColor(night ? '#20252c' : '#f7f7f7');
    this.ready.setVisible(this.state.phase === 'ready');
    this.gameover.setVisible(this.state.phase === 'over');
    this.moon.setVisible(night);
    for (const star of this.stars) star.setVisible(night);
    const runningFrame = Math.floor(this.elapsed / 83) % 2;
    const frame =
      this.state.phase === 'over'
        ? 'crashed'
        : this.state.phase === 'ready'
          ? this.elapsed % 4000 > 3800
            ? 'blink'
            : 'idle'
          : this.state.lift > 0
            ? 'idle'
            : this.state.ducking
              ? `duck${Math.floor(this.elapsed / 125) % 2}`
              : `run${runningFrame}`;
    this.dino.setFrame(frame).setY(GROUND - DINO_HEIGHT - this.state.lift);
    this.ground.tilePositionX = this.state.distance * 2;
    this.clouds.forEach((cloud, index) => {
      cloud.setX(
        ((((140 + index * 200 - this.state.distance * 0.04) % 680) + 680) %
          680) -
          46,
      );
    });
    const ids = new Set(this.state.obstacles.map((obstacle) => obstacle.id));
    for (const [id, image] of this.obstacles)
      if (!ids.has(id)) {
        image.destroy();
        this.obstacles.delete(id);
      }
    for (const obstacle of this.state.obstacles) {
      const frame =
        obstacle.kind === 'bird'
          ? `bird${Math.floor(this.elapsed / 166) % 2}`
          : `${obstacle.kind}${obstacle.size}`;
      let image = this.obstacles.get(obstacle.id);
      if (!image) {
        image = this.add
          .image(obstacle.x, obstacle.y, ATLAS, frame)
          .setOrigin(0)
          .setScale(0.5)
          .setDepth(2);
        this.obstacles.set(obstacle.id, image);
      }
      image.setFrame(frame).setPosition(obstacle.x, obstacle.y);
    }
    const score = String(this.score).padStart(5, '0').slice(-5);
    this.digits.forEach((image, index) => {
      image.setFrame(`digit${score[index]}`);
    });
    for (const object of [
      this.dino,
      this.ground,
      this.moon,
      this.gameover,
      ...this.clouds,
      ...this.stars,
      ...this.digits,
      ...this.obstacles.values(),
    ]) {
      if (night) object.setTint(0xd5d9e0).setTintMode(Phaser.TintModes.FILL);
      else object.clearTint();
    }
  }
}

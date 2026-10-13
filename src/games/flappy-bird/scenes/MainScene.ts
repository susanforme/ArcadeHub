import Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { Audio } from '../../../shared/audio';
import { digits, images, sounds } from '../assets';
import {
  BIRD_X,
  type FlappyState,
  GAP,
  GROUND,
  HEIGHT,
  isFlappyState,
  newFlappy,
  PIPE_WIDTH,
  stepFlappy,
  WIDTH,
} from '../logic';

const key = (name: string) => `flappy-${name}`;
export class MainScene extends SessionScene {
  private state!: FlappyState;
  private bird!: Phaser.GameObjects.Image;
  private ground!: Phaser.GameObjects.TileSprite;
  private ready!: Phaser.GameObjects.Image;
  private gameover!: Phaser.GameObjects.Image;
  private pipeImages = new Map<
    number,
    { top: Phaser.GameObjects.Image; bottom: Phaser.GameObjects.Image }
  >();
  private numbers: Phaser.GameObjects.Image[] = [];
  private displayedScore = -1;
  private elapsed = 0;
  preload() {
    for (const [name, url] of Object.entries(images))
      this.load.image(key(name), url);
    digits.forEach((url, index) => {
      this.load.image(key(`digit-${index}`), url);
    });
  }
  create() {
    this.state = isFlappyState(this.savedSnapshot)
      ? this.savedSnapshot
      : newFlappy();
    this.score = this.state.score;
    this.pipeImages = new Map();
    this.numbers = [];
    this.displayedScore = -1;
    this.elapsed = 0;
    for (const name of [
      ...Object.keys(images),
      ...digits.map((_, index) => `digit-${index}`),
    ]) {
      this.textures.get(key(name)).setFilter(Phaser.Textures.NEAREST);
    }
    this.add
      .image(0, 0, key('background'))
      .setOrigin(0)
      .setDisplaySize(WIDTH, HEIGHT);
    this.ground = this.add
      .tileSprite(0, GROUND, WIDTH, HEIGHT - GROUND, key('ground'))
      .setOrigin(0)
      .setDepth(3);
    this.bird = this.add.image(BIRD_X, this.state.y, key('mid')).setDepth(4);
    this.ready = this.add.image(WIDTH / 2, 210, key('ready')).setDepth(5);
    this.gameover = this.add
      .image(WIDTH / 2, 135, key('gameover'))
      .setDepth(5)
      .setVisible(false);
    this.input.on('pointerdown', () => {
      if (this.status !== 'playing') return;
      this.controls.press('UP');
      this.controls.release('UP');
    });
    this.begin();
    if (this.state.phase === 'ready') Audio.playAsset(sounds.swoosh);
    this.draw();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) return;
    const up = this.controls.consume('UP');
    const space = this.controls.consume('DROP');
    const flap = up || space;
    if (flap) Audio.playAsset(sounds.wing);
    const previousScore = this.state.score;
    this.state = stepFlappy(this.state, delta / 1000, flap);
    this.score = this.state.score;
    this.elapsed += Math.min(delta, 100);
    if (this.score > previousScore) {
      Audio.playAsset(sounds.point);
      this.publish();
    }
    this.draw();
    if (this.state.phase === 'over') {
      Audio.playAsset(sounds.hit);
      this.time.delayedCall(150, () => Audio.playAsset(sounds.die));
      this.finish('撞到障碍了，再飞一次？', false);
    }
  }
  protected snapshot() {
    return this.state.phase === 'over' ? null : this.state;
  }
  private draw() {
    const flying = this.state.phase !== 'ready';
    this.ready.setVisible(!flying);
    this.gameover.setVisible(this.state.phase === 'over');
    this.bird.setTexture(
      key(['up', 'mid', 'down', 'mid'][Math.floor(this.elapsed / 100) % 4]),
    );
    this.bird.setY(
      this.state.y + (flying ? 0 : Math.sin(this.elapsed / 220) * 5),
    );
    this.bird.setAngle(
      flying ? Phaser.Math.Clamp(this.state.velocity / 7, -25, 80) : 0,
    );
    this.ground.tilePositionX = flying
      ? this.state.distance
      : this.elapsed / 25;
    const ids = new Set(this.state.pipes.map((pipe) => pipe.id));
    for (const [id, sprites] of this.pipeImages) {
      if (!ids.has(id)) {
        sprites.top.destroy();
        sprites.bottom.destroy();
        this.pipeImages.delete(id);
      }
    }
    for (const pipe of this.state.pipes) {
      let sprites = this.pipeImages.get(pipe.id);
      if (!sprites) {
        sprites = {
          top: this.add
            .image(pipe.x, pipe.gapY - GAP / 2, key('pipe'))
            .setOrigin(0, 1)
            .setFlipY(true)
            .setDepth(2),
          bottom: this.add
            .image(pipe.x, pipe.gapY + GAP / 2, key('pipe'))
            .setOrigin(0)
            .setDepth(2),
        };
        this.pipeImages.set(pipe.id, sprites);
      }
      sprites.top.setPosition(pipe.x, pipe.gapY - GAP / 2).setVisible(flying);
      sprites.bottom
        .setPosition(pipe.x, pipe.gapY + GAP / 2)
        .setVisible(flying);
      sprites.top.setDisplaySize(PIPE_WIDTH, 320);
      sprites.bottom.setDisplaySize(PIPE_WIDTH, 320);
    }
    if (this.displayedScore !== this.score) {
      for (const image of this.numbers) image.destroy();
      this.numbers = String(this.score)
        .split('')
        .map((digit) =>
          this.add
            .image(0, 54, key(`digit-${digit}`))
            .setOrigin(0, 0.5)
            .setDepth(6),
        );
      const totalWidth = this.numbers.reduce(
        (width, image) => width + image.width + 3,
        -3,
      );
      let x = (WIDTH - totalWidth) / 2;
      for (const image of this.numbers) {
        image.setX(x);
        x += image.width + 3;
      }
      this.displayedScore = this.score;
    }
  }
}

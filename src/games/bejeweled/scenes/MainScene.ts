import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import type { TranslationKey } from '../../../i18n/translate';
import { Audio } from '../../../shared/audio';
import valley from '../assets/background.jpeg';
import boardImage from '../assets/background_board.png';
import palace from '../assets/background1.jpeg';
import title from '../assets/Bejeweled_title.png';
import border from '../assets/Border.png';
import gems from '../assets/pieces.png';
import selection from '../assets/selectedTile.png';
import {
  adjacent,
  type ClearResult,
  clearMatches,
  colorOf,
  CUBE,
  findMove,
  isFlame,
  isJewelState,
  type JewelState,
  levelFor,
  levelGoal,
  newBoard,
  newJewelState,
  refill,
  SIZE,
  swapGems,
} from '../logic';

const STEP = 62;
const LEFT = 52;
const TOP = 190;
const position = (index: number) => ({
  x: LEFT + (index % SIZE) * STEP + STEP / 2,
  y: TOP + Math.floor(index / SIZE) * STEP + STEP / 2,
});

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    Enter: 'DROP',
    Space: 'DROP',
    KeyH: 'SPECIAL',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  private state!: JewelState;
  private board: number[] = [];
  private turnScore = 0;
  private tiles: Phaser.GameObjects.Container[] = [];
  private background!: Phaser.GameObjects.Image;
  private highlights!: Phaser.GameObjects.Graphics;
  private scoreLabel!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private progressLabel!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Graphics;
  private messageLabel!: Phaser.GameObjects.Text;
  private message: TranslationKey = 'games.bejeweled.instructions';
  private selected: number | null = null;
  private cursor: number | null = null;
  private hinted: number[] = [];
  private drag: { index: number; x: number; y: number } | null = null;
  private busy = false;
  private idle = 0;
  private phase: 'board' | 'level' | 'over' = 'board';
  private panel?: Phaser.GameObjects.Container;

  preload() {
    this.load.spritesheet('jewel-gems', gems, {
      frameWidth: 150,
      frameHeight: 150,
    });
    this.load.image('jewel-valley', valley);
    this.load.image('jewel-palace', palace);
    this.load.image('jewel-board', boardImage);
    this.load.image('jewel-border', border);
    this.load.image('jewel-title', title);
    this.load.image('jewel-selection', selection);
  }
  create() {
    this.state = isJewelState(this.savedSnapshot)
      ? { ...this.savedSnapshot, board: [...this.savedSnapshot.board] }
      : newJewelState();
    this.board = [...this.state.board];
    this.score = this.turnScore = this.state.score;
    this.tiles = [];
    this.selected = this.cursor = null;
    this.hinted = [];
    this.drag = null;
    this.busy = false;
    this.idle = 0;
    this.phase = 'board';
    this.panel = undefined;
    this.message = 'games.bejeweled.instructions';
    this.background = this.add
      .image(300, 420, 'jewel-valley')
      .setDisplaySize(840, 840);
    this.add.rectangle(300, 420, 600, 840, 0x10162d, 0.48);
    this.add.image(300, 55, 'jewel-title').setDisplaySize(320, 106);
    this.add
      .rectangle(300, 135, 540, 76, 0x11172d, 0.87)
      .setStrokeStyle(1, 0xb88c52);
    this.scoreLabel = this.label(48, 112, '', 26, true);
    this.levelLabel = this.label(552, 111, '', 22, true).setOrigin(1, 0);
    this.progress = this.add.graphics();
    this.progressLabel = this.label(300, 158, '', 13).setOrigin(0.5);
    this.add.image(300, 459, 'jewel-border').setDisplaySize(520, 558);
    this.add
      .image(300, TOP + (STEP * SIZE) / 2, 'jewel-board')
      .setDisplaySize(STEP * SIZE, STEP * SIZE)
      .setTint(0x586080);
    this.drawBoard();
    this.highlights = this.add.graphics().setDepth(5);
    this.add
      .image(300, 715, 'jewel-selection')
      .setDisplaySize(190, 38)
      .setAlpha(0.2);
    this.label(300, 717, t('games.bejeweled.hintButton'), 21, true)
      .setOrigin(0.5)
      .setPadding(40, 8)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hint());
    this.messageLabel = this.label(300, 763, '', 18).setOrigin(0.5);
    this.add
      .image(75, 805, 'jewel-gems', 1)
      .setDisplaySize(26, 26)
      .setTint(0xffb263);
    this.label(98, 805, t('games.bejeweled.flameRule'), 14).setOrigin(0, 0.5);
    this.add.image(330, 805, 'jewel-gems', 5).setDisplaySize(26, 26);
    this.label(352, 805, t('games.bejeweled.cubeRule'), 14).setOrigin(0, 0.5);
    this.input.on('pointerdown', this.pointerDown, this);
    this.input.on('pointerup', this.pointerUp, this);
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', this.pointerDown, this);
      this.input.off('pointerup', this.pointerUp, this);
    });
    this.begin();
    this.drawHud();
    if (!findMove(this.board)) this.gameOver();
  }

  update(_time: number, delta: number) {
    this.drawHud();
    if (!this.frame(delta)) {
      if (this.phase === 'over' && this.controls.consume('DROP'))
        this.continueGame();
      this.tweens.pauseAll();
      this.drag = null;
      return;
    }
    this.tweens.resumeAll();
    if (this.phase !== 'board') {
      if (this.controls.consume('DROP')) this.continueGame();
      return;
    }
    if (this.busy) return;
    this.idle += delta;
    if (this.idle > 8000 && !this.hinted.length) this.hint();
    for (const [action, dx, dy] of [
      ['LEFT', -1, 0],
      ['RIGHT', 1, 0],
      ['UP', 0, -1],
      ['DOWN', 0, 1],
    ] as const) {
      if (!this.controls.consume(action)) continue;
      const current = this.cursor ?? this.selected ?? 0;
      const x = Math.max(0, Math.min(SIZE - 1, (current % SIZE) + dx));
      const y = Math.max(
        0,
        Math.min(SIZE - 1, Math.floor(current / SIZE) + dy),
      );
      this.cursor = y * SIZE + x;
      this.drawHighlights();
    }
    if (this.controls.consume('DROP')) this.select(this.cursor ?? 0);
    if (this.controls.consume('SPECIAL')) this.hint();
  }

  protected snapshot() {
    // Persist the last settled board; closing during a cascade replays that move.
    return { ...this.state, board: [...this.state.board] };
  }
  private label(
    x: number,
    y: number,
    text: string,
    size: number,
    bold = false,
  ) {
    return this.add
      .text(x, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${size}px`,
        fontStyle: bold ? 'bold' : 'normal',
        color: '#fff2d4',
        stroke: '#17152c',
        strokeThickness: 3,
      })
      .setResolution(
        Math.max(1, this.cameras.main.zoomX, this.cameras.main.zoomY),
      );
  }
  private indexAt(pointer: Phaser.Input.Pointer) {
    const x = Math.floor((pointer.worldX - LEFT) / STEP);
    const y = Math.floor((pointer.worldY - TOP) / STEP);
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE ? y * SIZE + x : null;
  }
  private pointerDown(
    pointer: Phaser.Input.Pointer,
    over: Phaser.GameObjects.GameObject[],
  ) {
    if (over.length) return;
    if (this.status !== 'playing' || this.busy || this.phase !== 'board')
      return;
    const index = this.indexAt(pointer);
    this.cursor = null;
    this.drag =
      index === null ? null : { index, x: pointer.worldX, y: pointer.worldY };
    if (index !== null) this.select(index);
  }
  private pointerUp(pointer: Phaser.Input.Pointer) {
    const drag = this.drag;
    this.drag = null;
    if (
      !drag ||
      this.status !== 'playing' ||
      this.busy ||
      this.phase !== 'board'
    )
      return;
    const dx = pointer.worldX - drag.x;
    const dy = pointer.worldY - drag.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    const next =
      drag.index +
      (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : Math.sign(dy) * SIZE);
    if (adjacent(drag.index, next)) this.trySwap(drag.index, next);
  }
  private select(index: number) {
    if (this.status !== 'playing' || this.busy || this.phase !== 'board')
      return;
    this.idle = 0;
    this.hinted = [];
    if (this.selected !== null && adjacent(this.selected, index)) {
      this.trySwap(this.selected, index);
      return;
    }
    this.selected = this.selected === index ? null : index;
    Audio.play('click');
    this.drawHighlights();
  }
  private trySwap(first: number, second: number) {
    const result = swapGems(this.board, first, second);
    this.busy = true;
    this.selected = null;
    this.hinted = [];
    this.drawHighlights();
    this.movePair(first, second, false, () => {
      if (!result) {
        this.movePair(first, second, true, () => {
          this.busy = false;
          this.message = 'games.bejeweled.invalid';
        });
        Audio.play('click');
        return;
      }
      [this.tiles[first], this.tiles[second]] = [
        this.tiles[second],
        this.tiles[first],
      ];
      this.board = result.swapped;
      this.turnScore = this.state.score;
      this.clearWave(result.clear, 1);
    });
  }
  private movePair(
    first: number,
    second: number,
    back: boolean,
    done: () => void,
  ) {
    this.tweens.add({
      targets: this.tiles[first],
      ...position(back ? first : second),
      duration: 160,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.tiles[second],
      ...position(back ? second : first),
      duration: 160,
      ease: 'Sine.easeInOut',
      onComplete: done,
    });
  }
  private clearWave(result: ClearResult, chain: number) {
    const gained =
      result.removed.length * 10 * levelFor(this.state.score) * chain;
    this.turnScore += gained;
    this.message = 'games.bejeweled.instructions';
    Audio.play(chain > 1 || result.created.length ? 'clear' : 'eat');
    const center = position(
      result.removed[Math.floor(result.removed.length / 2)],
    );
    const points = this.label(
      center.x,
      center.y,
      `+${gained}${chain > 1 ? `  ×${chain}` : ''}`,
      27,
      true,
    )
      .setOrigin(0.5)
      .setDepth(8);
    this.tweens.add({
      targets: points,
      y: center.y - 55,
      alpha: 0,
      duration: 650,
      onComplete: () => points.destroy(),
    });
    for (const index of result.removed) {
      const { x, y } = position(index);
      const spark = this.add
        .image(x, y, 'jewel-gems', Math.max(0, colorOf(this.board[index]) - 1))
        .setDisplaySize(24, 24)
        .setBlendMode('ADD')
        .setDepth(4);
      this.tweens.add({
        targets: spark,
        angle: 120,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        x: x + (index % 2 ? 22 : -22),
        y: y - 35,
        duration: 350,
        onComplete: () => spark.destroy(),
      });
      if (isFlame(this.board[index]) || this.board[index] === CUBE) {
        const ring = this.add
          .circle(x, y, 24)
          .setStrokeStyle(4, 0xffdc8a)
          .setDepth(4);
        this.tweens.add({
          targets: ring,
          scaleX: 4,
          scaleY: 4,
          alpha: 0,
          duration: 380,
          onComplete: () => ring.destroy(),
        });
      }
    }
    this.tweens.add({
      targets: result.removed.map((index) => this.tiles[index]),
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        for (const index of result.removed) this.tiles[index].destroy();
        this.board = result.board;
        for (const index of result.created)
          this.decorate(this.tiles[index], this.board[index]);
        this.dropGems(chain);
      },
    });
  }
  private dropGems(chain: number) {
    const filled = refill(this.board);
    const previous = this.tiles;
    this.board = filled.board;
    this.tiles = filled.from.map((from, index) => {
      const target = position(index);
      const tile =
        from >= 0 ? previous[from] : this.makeTile(index, this.board[index]);
      if (from < 0) tile.setPosition(target.x, TOP + STEP / 2).setAlpha(0);
      tile.setData('destinationY', target.y);
      return tile;
    });
    this.tweens.add({
      targets: this.tiles,
      y: (tile: Phaser.GameObjects.Container) => tile.getData('destinationY'),
      alpha: 1,
      duration: 330,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        const next = clearMatches(this.board);
        if (next) this.clearWave(next, chain + 1);
        else this.settle();
      },
    });
  }
  private settle() {
    const previousLevel = levelFor(this.state.score);
    const nextLevel = levelFor(this.turnScore);
    if (nextLevel > previousLevel) this.board = newBoard();
    this.state = {
      version: 1,
      board: [...this.board],
      score: this.turnScore,
      moves: this.state.moves + 1,
    };
    this.score = this.state.score;
    this.busy = false;
    this.idle = 0;
    this.persist();
    this.publish();
    if (nextLevel > previousLevel) {
      this.drawBoard();
      this.phase = 'level';
      Audio.play('clear');
      this.showPanel('games.bejeweled.levelComplete', 'games.bejeweled.next');
    } else if (!findMove(this.board)) this.gameOver();
    this.drawHighlights();
    this.drawHud();
  }
  private makeTile(index: number, gem: number) {
    const { x, y } = position(index);
    const halo = this.add.graphics();
    const image = this.add.image(0, 0, 'jewel-gems', 0).setDisplaySize(56, 56);
    const prism = this.add.container(0, 0, [
      this.add.image(-10, -10, 'jewel-gems', 1).setDisplaySize(26, 26),
      this.add.image(10, -10, 'jewel-gems', 3).setDisplaySize(26, 26),
      this.add.image(-10, 10, 'jewel-gems', 5).setDisplaySize(26, 26),
      this.add.image(10, 10, 'jewel-gems', 2).setDisplaySize(26, 26),
    ]);
    const tile = this.add.container(x, y, [halo, image, prism]).setDepth(2);
    this.decorate(tile, gem);
    return tile;
  }
  private decorate(tile: Phaser.GameObjects.Container, gem: number) {
    const halo = tile.list[0] as Phaser.GameObjects.Graphics;
    const image = tile.list[1] as Phaser.GameObjects.Image;
    const prism = tile.list[2] as Phaser.GameObjects.Container;
    image.setFrame(Math.max(0, colorOf(gem) - 1)).setVisible(gem !== CUBE);
    prism.setVisible(gem === CUBE);
    halo.clear();
    if (isFlame(gem)) {
      halo
        .fillStyle(0xffa028, 0.35)
        .fillCircle(0, 0, 30)
        .lineStyle(2, 0xffdf75)
        .strokeCircle(0, 0, 28);
      halo.fillStyle(0xffed96).fillTriangle(-8, -21, 0, -34, 8, -21);
    } else if (gem === CUBE) {
      halo.lineStyle(2, 0xc6efff).strokeRoundedRect(-27, -27, 54, 54, 8);
    }
  }
  private drawBoard() {
    this.tiles.forEach((tile) => tile.destroy());
    this.tiles = this.board.map((gem, index) => this.makeTile(index, gem));
  }
  private drawHighlights() {
    this.highlights.clear();
    if (this.busy || this.phase !== 'board') return;
    for (const index of [
      ...this.hinted,
      ...(this.selected === null ? [] : [this.selected]),
      ...(this.cursor === null ? [] : [this.cursor]),
    ]) {
      const { x, y } = position(index);
      this.highlights
        .lineStyle(3, this.hinted.includes(index) ? 0x77edff : 0xffdc75)
        .strokeRoundedRect(x - 29, y - 29, 58, 58, 7);
    }
  }
  private hint() {
    if (this.status !== 'playing' || this.busy || this.phase !== 'board')
      return;
    this.hinted = findMove(this.board) ?? [];
    this.selected = null;
    this.cursor = null;
    this.idle = 0;
    this.message = 'games.bejeweled.hintMessage';
    this.drawHighlights();
    Audio.play('click');
  }
  private drawHud() {
    const level = levelFor(this.state.score);
    const start = levelGoal(level - 1);
    const goal = levelGoal(level);
    this.background.setTexture(level % 2 ? 'jewel-valley' : 'jewel-palace');
    this.scoreLabel.setText(
      t('games.bejeweled.score', { score: this.turnScore }),
    );
    this.levelLabel.setText(t('games.bejeweled.level', { level }));
    this.progress
      .clear()
      .fillStyle(0x373447)
      .fillRoundedRect(48, 147, 504, 22, 7);
    const width = 504 * Math.min(1, (this.turnScore - start) / (goal - start));
    if (width > 0)
      this.progress.fillStyle(0x9964dc).fillRoundedRect(48, 147, width, 22, 7);
    this.progressLabel.setText(
      t('games.bejeweled.progress', {
        score: this.turnScore - start,
        target: goal - start,
      }),
    );
    this.messageLabel.setText(t(this.message));
    if (this.panel) {
      (this.panel.list[1] as Phaser.GameObjects.Text).setText(
        t(
          this.phase === 'over'
            ? 'games.bejeweled.noMoves'
            : 'games.bejeweled.levelComplete',
        ),
      );
      (this.panel.list[2] as Phaser.GameObjects.Text).setText(
        t('games.bejeweled.score', { score: this.score }),
      );
      (this.panel.list[3] as Phaser.GameObjects.Text).setText(
        t('games.bejeweled.level', { level }),
      );
      (this.panel.list[4] as Phaser.GameObjects.Text).setText(
        t(
          this.phase === 'over'
            ? 'game.playAgainAction'
            : 'games.bejeweled.next',
        ),
      );
    }
  }
  private showPanel(titleKey: TranslationKey, actionKey: TranslationKey) {
    const shade = this.add
      .rectangle(300, 438, 512, 510, 0x0e132b, 0.94)
      .setStrokeStyle(2, 0xe3be71);
    const heading = this.label(300, 350, t(titleKey), 32, true).setOrigin(0.5);
    const score = this.label(
      300,
      415,
      t('games.bejeweled.score', { score: this.score }),
      25,
    ).setOrigin(0.5);
    const subtitle = this.label(
      300,
      460,
      t('games.bejeweled.level', { level: levelFor(this.score) }),
      22,
    ).setOrigin(0.5);
    const button = this.label(300, 540, t(actionKey), 24, true)
      .setOrigin(0.5)
      .setBackgroundColor('#65438b')
      .setPadding(30, 15)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.continueGame());
    this.panel = this.add
      .container(0, 0, [shade, heading, score, subtitle, button])
      .setDepth(20);
  }
  private continueGame() {
    if (this.phase === 'over') this.scene.restart({ snapshot: null });
    else if (this.phase === 'level' && this.status === 'playing') {
      this.panel?.destroy();
      this.panel = undefined;
      this.phase = 'board';
      this.cursor = null;
      this.hinted = [];
      this.idle = 0;
    }
  }
  private gameOver() {
    this.phase = 'over';
    this.finish('games.bejeweled.noMoves');
    this.showPanel('games.bejeweled.noMoves', 'game.playAgainAction');
  }
}

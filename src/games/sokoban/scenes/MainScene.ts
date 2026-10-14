import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import type { Direction } from '../../../core/types';
import { t } from '../../../i18n';
import type { TranslationKey } from '../../../i18n/translate';
import { Audio } from '../../../shared/audio';
import crate from '../assets/crate.png';
import crateGoal from '../assets/crate-goal.png';
import floor from '../assets/floor.png';
import goal from '../assets/goal.png';
import player from '../assets/player.png';
import wall from '../assets/wall.png';
import { collections, levels } from '../levels';
import {
  cornered,
  isSokobanState,
  moveSokoban,
  newSokoban,
  nextLevel,
  type SokobanState,
  scoreFor,
  solved,
  undoSokoban,
} from '../logic';

const DIRECTIONS = ['LEFT', 'RIGHT', 'UP', 'DOWN'] as const;

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
    KeyZ: 'SPECIAL',
    KeyU: 'SPECIAL',
    KeyR: 'SECONDARY',
    KeyL: 'MODE',
    Enter: 'START',
    Space: 'START',
    Escape: 'PAUSE',
    KeyP: 'PAUSE',
  } as const;
  protected gamepadButtons = {
    0: 'START',
    1: 'SPECIAL',
    2: 'SECONDARY',
    9: 'PAUSE',
  } as const;
  private state!: SokobanState;
  private board!: Phaser.GameObjects.Container;
  private pieces!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private selector!: Phaser.GameObjects.Container;
  private selectorCollection = 0;
  private selectorPage = 0;
  private message!: Phaser.GameObjects.Text;
  private nextButton!: Phaser.GameObjects.Text;
  private undoButton!: Phaser.GameObjects.Text;
  private cell = 64;
  private boardX = 0;
  private boardY = 0;
  private repeatDirection: Direction | null = null;
  private repeatElapsed = 0;

  preload() {
    for (const [key, url] of Object.entries({
      crate,
      crateGoal,
      floor,
      goal,
      player,
      wall,
    }))
      this.load.image(key, url);
  }

  create() {
    this.state = isSokobanState(this.savedSnapshot)
      ? this.savedSnapshot
      : newSokoban();
    this.score = scoreFor(this.state);
    this.repeatDirection = null;
    this.repeatElapsed = 0;
    this.cameras.main.setBackgroundColor('#192d36');
    this.add.text(32, 26, t('games.sokoban.name'), {
      fontFamily: 'Arial',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#f6e8cc',
    });
    this.add.text(34, 74, t('games.sokoban.instructions'), {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#a9c2c8',
    });
    this.hud = this.add.text(34, 114, '', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#f6e8cc',
    });
    this.board = this.add.container();
    this.pieces = this.add.container();
    this.levelLabel = this.add.text(34, 142, '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#a9c2c8',
    });
    this.selector = this.add.container().setDepth(50);
    this.button(510, 'games.sokoban.choose', () => this.toggleSelector(), 47);
    this.add
      .text(320, 704, 'David W. Skinner · sasquatch@bentonrea.com', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#a9c2c8',
      })
      .setOrigin(0.5);
    this.message = this.add
      .text(320, 582, '', {
        fontFamily: 'Arial',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#81d4aa',
        align: 'center',
        wordWrap: { width: 570 },
      })
      .setOrigin(0.5, 0);
    this.undoButton = this.button(130, 'games.sokoban.undo', () => this.undo());
    this.button(320, 'games.sokoban.reset', () => this.reset());
    this.nextButton = this.button(510, 'games.sokoban.next', () =>
      this.advance(),
    );
    this.begin();
    this.drawBoard();
    this.refresh();
  }

  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.repeatDirection = null;
      this.repeatElapsed = 0;
      return;
    }
    if (this.controls.consume('MODE')) this.toggleSelector();
    if (this.selector.list.length) return;
    if (this.controls.consume('SPECIAL')) this.undo();
    if (this.controls.consume('SECONDARY')) this.reset();
    if (this.controls.consume('START')) this.advance();
    for (const direction of DIRECTIONS) {
      if (this.controls.consume(direction)) {
        this.move(direction);
        this.repeatDirection = direction;
        this.repeatElapsed = -150;
        return;
      }
    }
    if (this.repeatDirection && this.controls.down(this.repeatDirection)) {
      this.repeatElapsed += delta;
      if (this.repeatElapsed >= 150) {
        this.repeatElapsed = 0;
        this.move(this.repeatDirection);
      }
    } else this.repeatDirection = null;
  }

  protected snapshot() {
    return this.state;
  }

  private button(x: number, key: TranslationKey, action: () => void, y = 650) {
    const button = this.add
      .text(x, y, t(key), {
        fontFamily: 'Arial',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#f6e8cc',
        backgroundColor: '#34515c',
        padding: { x: 18, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      if (
        this.status === 'playing' &&
        (!this.selector.list.length || key === 'games.sokoban.choose')
      )
        action();
    });
    return button;
  }

  private move(direction: Direction) {
    const before = this.state;
    this.state = moveSokoban(before, direction);
    if (this.state === before) return;
    Audio.play(
      solved(this.state, levels[this.state.level])
        ? 'clear'
        : this.state.pushes > before.pushes
          ? 'eat'
          : 'click',
    );
    this.changed();
  }

  private undo() {
    const previous = this.state;
    this.state = undoSokoban(this.state);
    if (previous !== this.state) {
      Audio.play('click');
      this.changed();
    }
  }

  private reset() {
    this.state = newSokoban(this.state.level, this.state.completed);
    this.controls.reset();
    Audio.play('click');
    this.changed();
  }

  private advance() {
    if (!solved(this.state, levels[this.state.level])) return;
    if (this.state.level === levels.length - 1) {
      if (this.state.completed.length === levels.length)
        this.scene.restart({ snapshot: null });
      else this.toggleSelector();
      return;
    }
    this.state = nextLevel(this.state);
    this.controls.reset();
    Audio.play('click');
    this.drawBoard();
    this.changed();
  }

  private changed() {
    this.score = scoreFor(this.state);
    this.refresh();
    this.publish();
    this.persist();
  }

  private position(index: number) {
    const map = levels[this.state.level];
    return {
      x: this.boardX + ((index % map.width) + 0.5) * this.cell,
      y: this.boardY + (Math.floor(index / map.width) + 0.5) * this.cell,
    };
  }

  private drawBoard() {
    this.board.removeAll(true);
    const map = levels[this.state.level];
    this.cell = Math.min(64, 576 / map.width, 400 / map.height);
    this.boardX = (640 - map.width * this.cell) / 2;
    this.boardY = 162 + (400 - map.height * this.cell) / 2;
    map.rows.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        if (tile === '_') return;
        const index = y * map.width + x;
        const point = this.position(index);
        this.board.add(
          this.add
            .image(point.x, point.y, tile === '#' ? 'wall' : 'floor')
            .setDisplaySize(this.cell, this.cell),
        );
        if (map.goals.includes(index))
          this.board.add(
            this.add
              .image(point.x, point.y, 'goal')
              .setDisplaySize(this.cell, this.cell),
          );
      });
    });
  }

  private refresh() {
    const map = levels[this.state.level];
    this.pieces.removeAll(true);
    for (const box of this.state.boxes) {
      const point = this.position(box);
      this.pieces.add(
        this.add
          .image(
            point.x,
            point.y,
            map.goals.includes(box) ? 'crateGoal' : 'crate',
          )
          .setDisplaySize(this.cell * 0.92, this.cell * 0.92),
      );
    }
    const point = this.position(this.state.player);
    this.pieces.add(
      this.add
        .image(point.x, point.y, 'player')
        .setDisplaySize(this.cell * 0.72, this.cell * 0.84),
    );
    const cleared = solved(this.state, map);
    const finished = cleared && this.state.completed.length === levels.length;
    this.levelLabel.setText(
      `${map.collection} #${map.number}${map.title ? ` · ${map.title}` : ''}`,
    );
    this.hud.setText(
      t('games.sokoban.hud', {
        level: map.number,
        total:
          collections.find((collection) => collection.name === map.collection)
            ?.levels.length ?? levels.length,
        moves: this.state.moves,
        pushes: this.state.pushes,
        placed: this.state.boxes.filter((box) => map.goals.includes(box))
          .length,
        boxes: map.boxes.length,
      }),
    );
    this.message.setText(
      t(
        finished
          ? 'games.sokoban.finished'
          : cleared
            ? 'games.sokoban.cleared'
            : cornered(this.state, map)
              ? 'games.sokoban.stuck'
              : 'games.sokoban.hint',
        { total: levels.length },
      ),
    );
    this.message.setColor(cornered(this.state, map) ? '#f2b285' : '#81d4aa');
    this.nextButton
      .setText(
        t(
          finished
            ? 'games.sokoban.replay'
            : this.state.level === levels.length - 1
              ? 'games.sokoban.choose'
              : 'games.sokoban.next',
        ),
      )
      .setAlpha(cleared ? 1 : 0.35);
    this.undoButton.setAlpha(this.state.history.length ? 1 : 0.35);
  }

  private toggleSelector() {
    this.controls.reset();
    this.repeatDirection = null;
    if (this.selector.list.length) {
      this.selector.removeAll(true);
      return;
    }
    const map = levels[this.state.level];
    this.selectorCollection = collections.findIndex(
      (collection) => collection.name === map.collection,
    );
    this.selectorPage = Math.floor((map.number - 1) / 25);
    this.drawSelector();
  }

  private drawSelector() {
    this.selector.removeAll(true);
    this.selector.add(
      this.add
        .graphics()
        .fillStyle(0x192d36, 0.98)
        .fillRoundedRect(18, 160, 604, 520, 12),
    );
    const addButton = (
      x: number,
      y: number,
      label: string,
      action: () => void,
      selected = false,
    ) => {
      const text = this.add
        .text(x, y, label, {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#f6e8cc',
          backgroundColor: selected ? '#48795f' : '#34515c',
          padding: { x: 16, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        if (this.status === 'playing') action();
      });
      this.selector.add(text);
    };
    collections.forEach((collection, index) => {
      addButton(
        170 + index * 300,
        190,
        collection.name,
        () => {
          this.selectorCollection = index;
          this.selectorPage = 0;
          this.drawSelector();
        },
        index === this.selectorCollection,
      );
    });
    const collection = collections[this.selectorCollection];
    const page = collection.levels.slice(
      this.selectorPage * 25,
      (this.selectorPage + 1) * 25,
    );
    page.forEach((map, index) => {
      addButton(
        92 + (index % 5) * 114,
        254 + Math.floor(index / 5) * 64,
        `${map.number}${this.state.completed.includes(map.id) ? ' ✓' : ''}`,
        () => {
          this.state = newSokoban(levels.indexOf(map), this.state.completed);
          this.selector.removeAll(true);
          this.controls.reset();
          this.repeatDirection = null;
          this.drawBoard();
          this.changed();
          Audio.play('click');
        },
        map.id === this.state.levelId,
      );
    });
    if (this.selectorPage > 0)
      addButton(104, 596, '←', () => {
        this.selectorPage--;
        this.drawSelector();
      });
    if ((this.selectorPage + 1) * 25 < collection.levels.length)
      addButton(536, 596, '→', () => {
        this.selectorPage++;
        this.drawSelector();
      });
    this.selector.add(
      this.add
        .text(
          320,
          596,
          `${this.selectorPage + 1} / ${Math.ceil(collection.levels.length / 25)}`,
          {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#a9c2c8',
          },
        )
        .setOrigin(0.5),
    );
    addButton(320, 650, t('games.sokoban.close'), () => this.toggleSelector());
  }
}

import { Howl } from 'howler';
import type Phaser from 'phaser';
import { useSettings } from '../../../app/store';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import fever from '../assets/fever.mp3';
import misc from '../assets/misc.png';
import sprites from '../assets/sprites.png';
import {
  capsuleCells,
  type DrMarioState,
  HEIGHT,
  isDrMarioState,
  moveCapsule,
  newDrMario,
  nextDrLevel,
  rotateCapsule,
  type Speed,
  startDrMario,
  tickDrMario,
  virusCount,
  WIDTH,
} from '../logic';

const CELL = 32;
const LEFT = 60;
const TOP = 200;
const SPEED_KEYS = [
  'games.drMario.low',
  'games.drMario.medium',
  'games.drMario.high',
] as const;

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    ArrowDown: 'DOWN',
    KeyS: 'DOWN',
    ArrowUp: 'UP',
    KeyW: 'UP',
    KeyX: 'UP',
    KeyZ: 'SPECIAL',
    Space: 'START',
    Enter: 'START',
    Escape: 'PAUSE',
    KeyP: 'PAUSE',
  } as const;
  protected gamepadButtons = { 0: 'START', 1: 'SPECIAL', 9: 'PAUSE' } as const;
  private state!: DrMarioState;
  private pieces: Phaser.GameObjects.Image[] = [];
  private activePieces: Phaser.GameObjects.Image[] = [];
  private nextPieces: Phaser.GameObjects.Image[] = [];
  private hud!: Phaser.GameObjects.Text;
  private viruses!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private speedLabel!: Phaser.GameObjects.Text;
  private hintLabel!: Phaser.GameObjects.Text;
  private touchLabel!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private panelLevel!: Phaser.GameObjects.Text;
  private panelSpeed!: Phaser.GameObjects.Text;
  private panelHint!: Phaser.GameObjects.Text;
  private panelButton!: Phaser.GameObjects.Text;
  private settingsObjects: Phaser.GameObjects.Text[] = [];
  private music!: Howl;
  private musicId: number | undefined;
  private musicPaused = false;
  private repeat = 0;
  private held = 0;
  private clock = 0;
  private gesture: { id: number; x: number; y: number; moved: boolean } | null =
    null;
  private touchSoft = false;

  preload() {
    this.load.image('dr-mario-sprites', sprites);
    this.load.image('dr-mario-misc', misc);
  }

  create() {
    this.state = isDrMarioState(this.savedSnapshot)
      ? this.savedSnapshot
      : newDrMario();
    this.score = this.state.score;
    this.repeat = 0;
    this.held = 0;
    this.clock = 0;
    this.musicId = undefined;
    this.musicPaused = false;
    this.gesture = null;
    this.touchSoft = false;
    this.pieces = [];
    this.activePieces = [];
    this.nextPieces = [];
    this.settingsObjects = [];
    this.cameras.main.setBackgroundColor('#000050');
    this.addFrames();
    this.add
      .image(32, 40, 'dr-mario-misc', 'bottle')
      .setOrigin(0)
      .setDisplaySize(312, 696);
    this.add
      .text(470, 34, t('games.drMario.name'), {
        fontFamily: 'monospace',
        fontSize: '29px',
        fontStyle: 'bold',
        color: '#ffff4f',
      })
      .setOrigin(0.5);
    this.add
      .image(438, 166, 'dr-mario-sprites', 'doctor')
      .setDisplaySize(92, 156);
    this.add
      .text(526, 103, t('games.drMario.next'), {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    for (let index = 0; index < WIDTH * HEIGHT; index++)
      this.pieces.push(
        this.add
          .image(
            LEFT + ((index % WIDTH) + 0.5) * CELL,
            TOP + (Math.floor(index / WIDTH) + 0.5) * CELL,
            'dr-mario-sprites',
            'single-0',
          )
          .setDisplaySize(28, 28)
          .setVisible(false),
      );
    for (let index = 0; index < 2; index++) {
      this.activePieces.push(
        this.add
          .image(0, 0, 'dr-mario-sprites', 'single-0')
          .setDisplaySize(28, 28),
      );
      this.nextPieces.push(
        this.add
          .image(512 + index * 32, 143, 'dr-mario-sprites', 'single-0')
          .setDisplaySize(28, 28),
      );
    }
    const graphics = this.add.graphics();
    for (const [y, height] of [
      [266, 102],
      [394, 102],
      [522, 94],
    ])
      graphics
        .fillStyle(0x010101)
        .fillRect(368, y, 232, height)
        .lineStyle(3, 0xace7ff)
        .strokeRect(368, y, 232, height);
    this.hud = this.label(484, 280, '', 23);
    this.viruses = this.label(484, 406, '', 23);
    this.levelLabel = this.label(484, 536, '', 17);
    this.speedLabel = this.label(484, 572, '', 17);
    this.hintLabel = this.label(482, 637, t('games.drMario.hint'), 15);
    this.touchLabel = this.label(482, 693, t('games.drMario.touchHint'), 13);
    this.label(320, 763, '←  →     ↓     Z ↶    X ↷', 22);
    this.makePanel();
    this.music = new Howl({
      src: [fever],
      loop: true,
      volume: 0.22,
      preload: false,
    });
    this.events.once('shutdown', () => this.music.unload());
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.status !== 'playing' || this.state.phase !== 'falling') return;
      const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (
        p.x >= LEFT &&
        p.x < LEFT + CELL * WIDTH &&
        p.y >= TOP &&
        p.y < TOP + CELL * HEIGHT
      )
        this.gesture = { id: pointer.id, x: p.x, y: p.y, moved: false };
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (
        this.status !== 'playing' ||
        this.state.phase !== 'falling' ||
        !this.gesture ||
        pointer.id !== this.gesture.id ||
        !pointer.isDown
      )
        return;
      const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const steps = Math.trunc((p.x - this.gesture.x) / CELL);
      if (steps) {
        for (let n = 0; n < Math.min(8, Math.abs(steps)); n++)
          this.state = moveCapsule(this.state, Math.sign(steps));
        this.gesture.x += steps * CELL;
        this.gesture.moved = true;
      }
      if (p.y - this.gesture.y > 24) {
        this.touchSoft = true;
        this.gesture.moved = true;
      }
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.gesture || pointer.id !== this.gesture.id) return;
      if (this.status === 'playing' && !this.gesture.moved) this.turn(true);
      this.gesture = null;
      this.touchSoft = false;
    });
    this.input.on('gameout', () => {
      this.gesture = null;
      this.touchSoft = false;
    });
    this.begin();
    const unsubscribe = useSettings.subscribe((state, previous) => {
      if (state.language !== previous.language) this.draw();
    });
    this.events.once('shutdown', unsubscribe);
    this.controls.onReset(() => {
      this.gesture = null;
      this.touchSoft = false;
    });
    this.draw();
    if (this.state.phase === 'over') this.endGame();
  }

  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.held = 0;
      this.repeat = 0;
      this.syncMusic();
      if (this.status === 'over' && this.controls.consume('START'))
        this.scene.restart({ snapshot: null });
      return;
    }
    this.clock += Math.min(delta, 100);
    if (this.state.phase === 'ready') {
      if (this.controls.consume('LEFT')) this.changeLevel(-1);
      if (this.controls.consume('RIGHT')) this.changeLevel(1);
      if (this.controls.consume('UP')) this.changeSpeed(-1);
      if (this.controls.consume('DOWN')) this.changeSpeed(1);
      if (this.controls.consume('START')) this.start();
    } else if (this.state.phase === 'cleared') {
      this.syncMusic();
      if (this.controls.consume('START')) this.start();
    } else {
      this.syncMusic();
      const left = this.controls.consume('LEFT');
      const right = this.controls.consume('RIGHT');
      if (left || right) {
        this.held = left ? -1 : 1;
        this.repeat = -150;
        this.state = moveCapsule(this.state, this.held);
      }
      if (this.held && this.controls.down(this.held < 0 ? 'LEFT' : 'RIGHT')) {
        this.repeat += delta;
        if (this.repeat >= 90) {
          this.repeat = 0;
          this.state = moveCapsule(this.state, this.held);
        }
      } else this.held = 0;
      if (this.controls.consume('UP') || this.controls.consume('START'))
        this.turn(true);
      if (this.controls.consume('SPECIAL')) this.turn(false);
      const before = this.state;
      this.state = tickDrMario(
        this.state,
        Math.min(delta, 100),
        this.controls.down('DOWN') || this.touchSoft,
      );
      if (
        this.state.phase !== before.phase ||
        this.state.capsules !== before.capsules
      ) {
        if (this.state.phase === 'clearing') Audio.play('clear');
        else if (this.state.capsules !== before.capsules) Audio.play('click');
        this.score = this.state.score;
        this.publish();
        this.persist();
        if (
          this.state.phase === 'over' ||
          (this.state.phase === 'cleared' && this.state.level === 20)
        )
          this.endGame();
      }
    }
    this.draw();
  }

  protected snapshot() {
    return this.state;
  }

  private addFrames() {
    const texture = this.textures.get('dr-mario-sprites');
    for (let color = 0; color < 3; color++) {
      for (const [shape, y] of [
        ['top', 8],
        ['bottom', 16],
        ['left', 24],
        ['right', 32],
        ['single', 40],
      ] as const)
        if (!texture.has(`${shape}-${color}`))
          texture.add(`${shape}-${color}`, 0, color * 8, y, 7, 7);
      for (let frame = 0; frame < 2; frame++)
        if (!texture.has(`virus-${color}-${frame}`))
          texture.add(
            `virus-${color}-${frame}`,
            0,
            0,
            88 + color * 24 + frame * 8,
            7,
            7,
          );
    }
    if (!texture.has('doctor')) texture.add('doctor', 0, 0, 201, 23, 39);
    const bottle = this.textures.get('dr-mario-misc');
    if (!bottle.has('bottle')) bottle.add('bottle', 0, 153, 290, 78, 174);
  }

  private label(x: number, y: number, text: string, size: number) {
    return this.add
      .text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: `${size}px`,
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5, 0);
  }

  private makePanel() {
    this.panel = this.add.container().setDepth(30);
    this.panel.add(
      this.add
        .graphics()
        .fillStyle(0x000050, 0.97)
        .fillRect(68, 246, 504, 360)
        .lineStyle(4, 0xace7ff)
        .strokeRect(68, 246, 504, 360),
    );
    this.panelLevel = this.label(320, 278, '', 24);
    this.panelSpeed = this.label(320, 360, '', 24);
    this.panelHint = this.label(320, 526, '', 16);
    this.panel.add([this.panelLevel, this.panelSpeed, this.panelHint]);
    const button = (
      x: number,
      y: number,
      label: string,
      action: () => void,
    ) => {
      const text = this.add
        .text(x, y, label, {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: '#ffff4f',
          backgroundColor: '#193c88',
          padding: { x: 18, y: 12 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        if (this.status === 'playing' || this.status === 'over') action();
      });
      this.panel.add(text);
      return text;
    };
    this.settingsObjects.push(
      button(118, 298, '−', () => this.changeLevel(-1)),
      button(522, 298, '+', () => this.changeLevel(1)),
      button(118, 380, '←', () => this.changeSpeed(-1)),
      button(522, 380, '→', () => this.changeSpeed(1)),
    );
    this.panelButton = button(320, 470, '', () => {
      if (this.status === 'over') this.scene.restart({ snapshot: null });
      else this.start();
    });
  }

  private changeLevel(amount: number) {
    if (this.state.phase !== 'ready') return;
    this.state = newDrMario(
      Math.max(0, Math.min(20, this.state.level + amount)),
      this.state.speed,
    );
    Audio.play('click');
  }

  private changeSpeed(amount: number) {
    if (this.state.phase !== 'ready') return;
    this.state = {
      ...this.state,
      speed: ((this.state.speed + amount + 3) % 3) as Speed,
    };
    Audio.play('click');
  }

  private start() {
    if (this.state.phase === 'ready') this.state = startDrMario(this.state);
    else if (this.state.phase === 'cleared')
      this.state = nextDrLevel(this.state);
    else return;
    this.controls.reset();
    this.repeat = 0;
    this.held = 0;
    this.syncMusic();
    this.publish();
    this.persist();
  }

  private turn(clockwise: boolean) {
    const next = rotateCapsule(this.state, clockwise);
    if (next !== this.state) Audio.play('click');
    this.state = next;
  }

  private endGame() {
    this.finish(
      t(
        this.state.phase === 'cleared'
          ? 'games.drMario.complete'
          : 'games.drMario.gameOver',
        { score: this.state.score },
      ),
    );
    this.syncMusic();
  }

  private syncMusic() {
    const wanted =
      this.status === 'playing' &&
      ['falling', 'clearing', 'gravity'].includes(this.state.phase);
    if (wanted && this.musicId === undefined) this.musicId = this.music.play();
    else if (wanted && this.musicPaused) {
      this.music.play(this.musicId);
      this.musicPaused = false;
    } else if (!wanted && this.musicId !== undefined && !this.musicPaused) {
      this.music.pause(this.musicId);
      this.musicPaused = true;
    }
  }

  private draw() {
    const bonds = new Map<number, number[]>();
    this.state.board.forEach((cell, index) => {
      if (cell?.bond === null || cell?.bond === undefined) return;
      const group = bonds.get(cell.bond) ?? [];
      group.push(index);
      bonds.set(cell.bond, group);
    });
    this.pieces.forEach((sprite, index) => {
      const cell = this.state.board[index];
      sprite.setVisible(Boolean(cell));
      if (!cell) return;
      let frame: string;
      if (cell.kind === 'virus')
        frame = `virus-${cell.color}-${Math.floor(this.clock / 250) % 2}`;
      else {
        const other =
          cell.bond === null
            ? undefined
            : bonds.get(cell.bond)?.find((n) => n !== index);
        const shape =
          other === undefined
            ? 'single'
            : other === index + 1
              ? 'left'
              : other === index - 1
                ? 'right'
                : other > index
                  ? 'top'
                  : 'bottom';
        frame = `${shape}-${cell.color}`;
      }
      sprite
        .setFrame(frame)
        .setAlpha(
          this.state.clear.includes(index) &&
            Math.floor(this.state.timer / 65) % 2 === 0
            ? 0.2
            : 1,
        );
    });
    this.activePieces.forEach((sprite) => {
      sprite.setVisible(Boolean(this.state.active));
    });
    if (this.state.active) {
      const cells = capsuleCells(this.state.active);
      cells.forEach((cell, index) => {
        const other = cells[1 - index];
        const shape =
          other.x > cell.x
            ? 'left'
            : other.x < cell.x
              ? 'right'
              : other.y > cell.y
                ? 'top'
                : 'bottom';
        this.activePieces[index]
          .setFrame(`${shape}-${cell.color}`)
          .setPosition(
            LEFT + (cell.x + 0.5) * CELL,
            TOP + (cell.y + 0.5) * CELL,
          );
      });
    }
    this.nextPieces.forEach((sprite, index) => {
      sprite.setFrame(`${index ? 'right' : 'left'}-${this.state.next[index]}`);
    });
    this.hud.setText(t('games.drMario.score', { score: this.state.score }));
    this.viruses.setText(
      t('games.drMario.viruses', { count: virusCount(this.state.board) }),
    );
    this.levelLabel.setText(
      t('games.drMario.level', { level: this.state.level }),
    );
    this.speedLabel.setText(
      t('games.drMario.speed', { speed: t(SPEED_KEYS[this.state.speed]) }),
    );
    this.hintLabel.setText(t('games.drMario.hint'));
    this.touchLabel.setText(t('games.drMario.touchHint'));
    const ready = this.state.phase === 'ready';
    const over = this.status === 'over';
    this.panel.setVisible(ready || over || this.state.phase === 'cleared');
    this.settingsObjects.forEach((object) => {
      object.setVisible(ready);
    });
    this.panelLevel.setText(
      ready
        ? t('games.drMario.level', { level: this.state.level })
        : t(
            this.state.phase === 'cleared'
              ? 'games.drMario.cleared'
              : 'games.drMario.name',
          ),
    );
    this.panelSpeed.setText(
      ready
        ? t('games.drMario.speed', { speed: t(SPEED_KEYS[this.state.speed]) })
        : t('games.drMario.score', { score: this.state.score }),
    );
    this.panelButton.setText(
      t(
        over
          ? 'games.drMario.replay'
          : ready
            ? 'games.drMario.start'
            : 'games.drMario.nextLevel',
      ),
    );
    this.panelHint.setText(
      t(ready ? 'games.drMario.menuHint' : 'games.drMario.hint'),
    );
  }
}

import type Phaser from 'phaser';
import { useSettings } from '../../../app/store';
import { SessionScene } from '../../../core/session-scene';
import type { Action } from '../../../core/types';
import { t } from '../../../i18n';
import { Audio } from '../../../shared/audio';
import dynamite from '../../gold-miner/assets/dynamite.png';
import bonk from '../assets/bonk.wav';
import background from '../assets/game_bg.png';
import hearts from '../assets/hearts.png';
import mole from '../assets/mole.png';
import nope from '../assets/nope.wav';
import {
  isMoleState,
  LEVELS,
  type MoleState,
  newMole,
  startRound,
  stepMole,
  whack,
} from '../logic';

const key = (name: string) => `whack-a-mole-${name}`;
const ACTIONS: Action[] = [
  'DROP',
  'SPECIAL',
  'SECONDARY',
  'THRUST',
  'REVERSE',
  'AIM_UP',
  'AIM_DOWN',
  'MODE',
  'FIRE_LEFT',
];
const LETTERS = ['Q', 'W', 'E', 'A', 'S', 'D', 'Z', 'X', 'C'];
const position = (i: number) => ({
  x: 120 + (i % 3) * 150,
  y: 324 + Math.floor(i / 3) * 124,
});
const THEMES = [0xffffff, 0xffe4a6, 0xffc3a1, 0xb5b9ed, 0x9cc9da];

export class MainScene extends SessionScene {
  protected inputBindings = {
    ...Object.fromEntries(
      ACTIONS.flatMap((action, i) => [
        [`Digit${i + 1}`, action],
        [`Numpad${i + 1}`, action],
        [`Key${LETTERS[i]}`, action],
      ]),
    ),
    Enter: 'START',
    Space: 'START',
    Escape: 'PAUSE',
    KeyP: 'PAUSE',
  } satisfies Record<string, Action>;
  protected gamepadButtons = {};
  private state!: MoleState;
  private cells: Phaser.GameObjects.Image[] = [];
  private bombs: Phaser.GameObjects.Image[] = [];
  private heartIcons: Phaser.GameObjects.Image[] = [];
  private feedback: { time: number; hit: boolean }[] = [];
  private hud!: Phaser.GameObjects.Text;
  private round!: Phaser.GameObjects.Text;
  private clock!: Phaser.GameObjects.Text;
  private combo!: Phaser.GameObjects.Text;
  private meter!: Phaser.GameObjects.Rectangle;
  private sky!: Phaser.GameObjects.Image;
  private grass!: Phaser.GameObjects.TileSprite;
  private panel!: Phaser.GameObjects.Container;
  private panelKey = '';
  private announced = '';

  preload() {
    this.load.spritesheet(key('mole'), mole, {
      frameWidth: 46,
      frameHeight: 37,
      spacing: 1,
    });
    this.load.spritesheet(key('heart'), hearts, {
      frameWidth: 22,
      frameHeight: 16,
      spacing: 1,
    });
    this.load.image(key('bg'), background);
    this.load.image(key('bomb'), dynamite);
  }
  create() {
    this.state = isMoleState(this.savedSnapshot)
      ? this.savedSnapshot
      : newMole();
    this.score = this.state.score;
    this.cells = [];
    this.bombs = [];
    this.heartIcons = [];
    this.feedback = Array.from({ length: 9 }, () => ({ time: 0, hit: false }));
    this.panelKey = '';
    this.announced = this.state.phase;
    const bg = this.textures.get(key('bg'));
    if (!bg.has('sky')) {
      bg.add('sky', 0, 0, 0, 1280, 360);
      bg.add('grass', 0, 0, 640, 1280, 80);
    }
    this.sky = this.add
      .image(270, 130, key('bg'), 'sky')
      .setDisplaySize(810, 260);
    this.grass = this.add.tileSprite(270, 530, 540, 540, key('bg'), 'grass');
    this.add
      .rectangle(270, 110, 500, 184, 0x172a2b, 0.96)
      .setStrokeStyle(3, 0x39584c);
    this.text(42, 36, 'MOLE PATROL', 15, '#a6d487');
    this.text(497, 36, '01 — 05', 15, '#a6d487').setOrigin(1, 0);
    this.hud = this.text(42, 66, '', 27, '#fff3cd');
    this.round = this.text(42, 110, '', 18);
    for (let i = 0; i < 5; i++)
      this.heartIcons.push(
        this.add.image(54 + i * 36, 166, key('heart'), 0).setScale(1.35),
      );
    this.clock = this.text(494, 157, '', 22, '#ffe393').setOrigin(1, 0);
    this.add.rectangle(270, 226, 484, 12, 0x263b33);
    this.meter = this.add.rectangle(28, 226, 1, 8, 0xffd76d).setOrigin(0, 0.5);
    this.combo = this.text(270, 254, '', 16, '#1e3429').setOrigin(0.5);
    this.add
      .rectangle(270, 452, 486, 376, 0x243f35, 0.92)
      .setStrokeStyle(4, 0x527858);
    for (let i = 0; i < 9; i++) {
      const { x, y } = position(i);
      const cell = this.add
        .image(x, y, key('mole'), 4)
        .setScale(2.8)
        .setInteractive({ useHandCursor: true });
      cell.on('pointerdown', () => this.hit(i));
      this.cells.push(cell);
      this.bombs.push(
        this.add
          .image(x, y - 6, key('bomb'))
          .setDisplaySize(60, 48)
          .setVisible(false),
      );
      this.text(x, y + 45, `${i + 1} / ${LETTERS[i]}`, 13, '#f9efda').setOrigin(
        0.5,
      );
    }
    const legends: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < 3; i++) {
      const x = 110 + i * 160;
      this.add.rectangle(x, 703, 148, 88, 0x203c31, 0.94);
      if (i === 2)
        this.add.image(x - 37, 687, key('bomb')).setDisplaySize(42, 34);
      else
        this.add
          .image(x - 37, 687, key('mole'), 0)
          .setScale(1.1)
          .setTint(i === 1 ? 0xffd35d : 0xffffff);
      this.text(
        x + 20,
        682,
        i === 0 ? '+10' : i === 1 ? '+30' : '−1',
        19,
        i === 2 ? '#ffa294' : '#ffe393',
      ).setOrigin(0.5);
      legends.push(this.text(x, 726, '', 12, '#e2ead5').setOrigin(0.5));
    }
    const hint = this.text(270, 775, '', 14, '#1b3428').setOrigin(0.5);
    this.panel = this.add.container(0, 0).setDepth(20);
    this.begin();
    const localizeLegend = () => {
      legends[0].setText(t('games.whackAMole.legendMole'));
      legends[1].setText(t('games.whackAMole.legendGold'));
      legends[2].setText(t('games.whackAMole.legendBomb'));
      hint.setText(t('games.whackAMole.hint'));
    };
    this.events.on('postupdate', localizeLegend);
    this.events.once('shutdown', () =>
      this.events.off('postupdate', localizeLegend),
    );
    this.draw();
  }
  update(_time: number, delta: number) {
    const active = this.frame(delta);
    const start = this.controls.consume('START');
    if (this.status === 'over') {
      if (start) this.scene.restart({ snapshot: null });
    } else if (active) {
      if (start) this.advance();
      for (let i = 0; i < 9; i++)
        if (this.controls.consume(ACTIONS[i])) this.hit(i);
      const dt = Math.min(delta, 100) / 1000;
      for (const feedback of this.feedback)
        feedback.time = Math.max(0, feedback.time - dt);
      const escaped = stepMole(this.state, dt);
      for (const i of escaped) this.feedback[i] = { time: 0.25, hit: false };
      if (escaped.length) Audio.playAsset(nope);
      this.settle();
    }
    this.draw();
  }
  protected snapshot() {
    return this.state.phase === 'won' || this.state.phase === 'over'
      ? null
      : this.state;
  }
  private advance() {
    if (this.status !== 'playing') return;
    if (startRound(this.state)) {
      this.feedback.forEach((f) => {
        f.time = 0;
      });
      Audio.play('click');
      this.persist();
    }
  }
  private hit(index: number) {
    if (this.status !== 'playing' || this.state.phase !== 'playing') return;
    const result = whack(this.state, index);
    if (!result) {
      Audio.play('click');
      return;
    }
    this.feedback[index] = { time: 0.22, hit: result.kind !== 'bomb' };
    Audio.playAsset(result.kind === 'bomb' ? nope : bonk);
    const { x, y } = position(index);
    const label = this.text(
      x,
      y - 40,
      result.kind === 'bomb' ? '−1 ♥' : `+${result.points}`,
      25,
      result.kind === 'bomb' ? '#ffb7a8' : '#fff0a3',
    )
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({
      targets: label,
      y: y - 85,
      alpha: 0,
      duration: 550,
      onComplete: () => label.destroy(),
    });
    this.score = this.state.score;
    this.publish();
    this.settle();
    this.draw();
  }
  private settle() {
    if (this.announced === this.state.phase) return;
    this.announced = this.state.phase;
    if (this.state.phase === 'clear') {
      Audio.play('clear');
      this.persist();
    } else if (this.state.phase === 'won') {
      Audio.play('clear');
      this.finish(t('games.whackAMole.won'), false);
    } else if (this.state.phase === 'over')
      this.finish(t('games.whackAMole.over'));
  }
  private text(
    x: number,
    y: number,
    value: string,
    size = 20,
    color = '#e9efdc',
  ) {
    return this.add.text(x, y, value, {
      fontFamily: 'Arial, "PingFang SC", sans-serif',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
    });
  }
  private draw() {
    const s = this.state;
    const config = LEVELS[s.level - 1];
    this.sky.setTint(THEMES[s.level - 1]);
    this.grass.setTint(THEMES[s.level - 1]);
    this.hud.setText(t('games.whackAMole.score', { score: s.score }));
    this.round.setText(
      t('games.whackAMole.round', {
        level: s.level,
        score: s.roundScore,
        goal: config.goal,
      }),
    );
    this.clock
      .setText(`${Math.ceil(s.remaining)}s`)
      .setColor(s.remaining <= 5 ? '#ff9d94' : '#ffe393');
    this.combo.setText(t('games.whackAMole.combo', { count: s.combo }));
    this.meter.setDisplaySize(
      Math.max(1, 484 * Math.min(1, s.roundScore / config.goal)),
      8,
    );
    this.heartIcons.forEach((image, i) => {
      image.setFrame(i < s.lives ? 0 : 1);
    });
    for (let i = 0; i < 9; i++) {
      const target = s.holes[i];
      const feedback = this.feedback[i];
      let frame = 4;
      if (feedback.time > 0 && !target) frame = feedback.hit ? 2 : 5;
      else if (target && target.kind !== 'bomb') {
        const age = target.lifetime - target.remaining;
        frame = age < 0.1 || target.remaining < 0.13 ? 1 : 0;
      }
      this.cells[i]
        .setFrame(frame)
        .setTint(target?.kind === 'gold' ? 0xffd35d : 0xffffff);
      this.bombs[i].setVisible(target?.kind === 'bomb');
    }
    const panelKey = `${s.phase}-${useSettings.getState().language}`;
    if (panelKey === this.panelKey) return;
    this.panelKey = panelKey;
    this.panel.removeAll(true);
    if (s.phase === 'playing') return;
    const ready = s.phase === 'ready';
    const clear = s.phase === 'clear';
    this.panel.add(this.add.rectangle(270, 442, 540, 476, 0x122520, 0.55));
    this.panel.add(
      this.add
        .rectangle(270, 425, 478, 434, 0x142c29, 0.98)
        .setStrokeStyle(3, 0xe6c577),
    );
    const title = ready
      ? t('games.whackAMole.name')
      : clear
        ? t('games.whackAMole.clear')
        : s.phase === 'won'
          ? t('games.whackAMole.won')
          : t('games.whackAMole.over');
    this.panel.add(this.text(270, 244, title, 32, '#ffe393').setOrigin(0.5));
    this.panel.add(
      this.text(
        270,
        290,
        ready
          ? t('games.whackAMole.intro')
          : t('games.whackAMole.result', { score: s.score, hits: s.hits }),
        17,
      ).setOrigin(0.5),
    );
    for (let i = 0; i < 3; i++) {
      const x = 124 + i * 146;
      const icon =
        i === 2
          ? this.add.image(x, 365, key('bomb')).setDisplaySize(66, 54)
          : this.add
              .image(x, 365, key('mole'), 0)
              .setScale(1.9)
              .setTint(i === 1 ? 0xffd35d : 0xffffff);
      this.panel.add(icon);
      this.panel.add(
        this.text(
          x,
          418,
          t(
            i === 0
              ? 'games.whackAMole.normal'
              : i === 1
                ? 'games.whackAMole.gold'
                : 'games.whackAMole.bomb',
          ),
          15,
        ).setOrigin(0.5),
      );
    }
    this.panel.add(
      this.text(
        270,
        467,
        clear ? t('games.whackAMole.nextHint') : t('games.whackAMole.rules'),
        16,
      )
        .setOrigin(0.5)
        .setAlign('center')
        .setWordWrapWidth(430),
    );
    const button = this.text(
      270,
      545,
      ready
        ? t('games.whackAMole.start')
        : clear
          ? t('games.whackAMole.next')
          : t('games.whackAMole.restart'),
      22,
      '#20352c',
    )
      .setOrigin(0.5)
      .setPadding(30, 16)
      .setBackgroundColor('#f4d47c')
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      if (this.status === 'paused') return;
      if (this.status === 'over') this.scene.restart({ snapshot: null });
      else this.advance();
    });
    this.panel.add(button);
    this.panel.add(
      this.text(270, 609, 'ART: AUGSEU · CC0', 12, '#9cbca4').setOrigin(0.5),
    );
  }
}

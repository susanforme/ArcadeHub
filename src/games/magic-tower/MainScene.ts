import type Phaser from 'phaser';
import { SessionScene } from '../../core/session-scene';
import type { Direction } from '../../core/types';
import { t } from '../../i18n';
import type { TranslationKey } from '../../i18n/translate';
import { Audio } from '../../shared/audio';
import animates from './assets/animates.png';
import enemys from './assets/enemys.png';
import hero from './assets/hero.png';
import items from './assets/items.png';
import npcs from './assets/npcs.png';
import terrains from './assets/terrains.png';
import { enemyFor, FLOOR_COUNT, SIZE } from './levels';
import {
  buyUpgrade,
  damageFor,
  isTowerState,
  moveTower,
  newTower,
  retryFloor,
  type TowerState,
  undoTower,
} from './logic';

const CELL = 56,
  X = 44,
  Y = 152;
const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowUp: 'UP',
    KeyW: 'UP',
    ArrowDown: 'DOWN',
    KeyS: 'DOWN',
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    KeyZ: 'SPECIAL',
    KeyR: 'SECONDARY',
    KeyB: 'MODE',
    Enter: 'START',
    Space: 'START',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  protected gamepadButtons = {
    0: 'MODE',
    1: 'SPECIAL',
    2: 'SECONDARY',
    9: 'PAUSE',
  } as const;
  private state!: TowerState;
  private board!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private panel!: Phaser.GameObjects.Container;
  private book = true;
  private shop = false;
  private repeat = 0;

  preload() {
    for (const [key, url] of Object.entries({
      terrains,
      animates,
      enemys,
      items,
      npcs,
    }))
      this.load.spritesheet(`tower-${key}`, url, {
        frameWidth: 32,
        frameHeight: 32,
      });
    this.load.spritesheet('tower-hero', hero, {
      frameWidth: 32,
      frameHeight: 48,
    });
  }
  create() {
    this.state = isTowerState(this.savedSnapshot)
      ? this.savedSnapshot
      : newTower();
    this.book = true;
    this.shop = false;
    this.repeat = 0;
    this.cameras.main.setBackgroundColor('#111923');
    this.title = this.add.text(X, 22, '', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#f8dda0',
      fontStyle: 'bold',
    });
    this.hud = this.add.text(X + 34, 68, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#e7edf6',
      lineSpacing: 12,
    });
    this.add.image(X + 12, 80, 'tower-items', 20).setDisplaySize(28, 28);
    [0, 1, 2].forEach((frame, i) => {
      this.add
        .image(X + 16 + i * 112, 118, 'tower-items', frame)
        .setDisplaySize(28, 28);
    });
    this.board = this.add.container();
    this.hint = this.add
      .text(352, 787, t('games.magicTower.hint'), {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#bed0dd',
        align: 'center',
        wordWrap: { width: 630 },
      })
      .setOrigin(0.5);
    this.button(136, 843, 'games.magicTower.undo', () => this.undo());
    this.button(352, 843, 'games.magicTower.book', () => {
      this.book = !this.book;
      this.render();
    });
    this.button(568, 843, 'games.magicTower.retry', () => this.retry());
    this.panel = this.add.container().setDepth(20);
    const point = (pointer: Phaser.Input.Pointer) => {
      if (this.status !== 'playing' || this.shop) return;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const x = Math.floor((world.x - X) / CELL),
        y = Math.floor((world.y - Y) / CELL);
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
      const playerX = this.state.player % SIZE,
        playerY = Math.floor(this.state.player / SIZE);
      const dx = x - playerX,
        dy = y - playerY;
      if (Math.abs(dx) + Math.abs(dy) === 1)
        this.move(dx < 0 ? 'LEFT' : dx > 0 ? 'RIGHT' : dy < 0 ? 'UP' : 'DOWN');
      else this.inspect(y * SIZE + x);
    };
    this.input.on('pointerdown', point);
    this.events.once('shutdown', () => this.input.off('pointerdown', point));
    this.begin();
    this.render();
  }
  private button(
    x: number,
    y: number,
    key: TranslationKey,
    action: () => void,
  ) {
    const button = this.add
      .text(x, y, t(key), {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#f7e5bc',
        backgroundColor: '#283749',
        padding: { x: 18, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => {
      if (this.status === 'playing') action();
    });
    return button;
  }
  private inspect(cell: number) {
    const token = this.state.maps[this.state.floor][cell];
    if (token !== 'm' && token !== 'G') return;
    const enemy = enemyFor(this.state.floor, token === 'G');
    const damage = damageFor(this.state, enemy);
    this.hint.setText(
      t('games.magicTower.enemy', {
        hp: enemy.hp,
        attack: enemy.attack,
        defense: enemy.defense,
        damage: Number.isFinite(damage) ? damage : '∞',
      }),
    );
  }
  private move(direction: Direction) {
    const result = moveTower(this.state, direction);
    this.state = result.state;
    const messages = {
      wall: 'games.magicTower.hint',
      key: 'games.magicTower.noKey',
      danger: 'games.magicTower.danger',
      battle: 'games.magicTower.battle',
      item: 'games.magicTower.collected',
      move: 'games.magicTower.hint',
      stairs: 'games.magicTower.hint',
      shop: 'games.magicTower.shopHint',
      win: 'games.magicTower.won',
    } as const;
    this.hint.setText(t(messages[result.outcome]));
    if (result.outcome === 'item') Audio.play('eat');
    if (result.outcome === 'battle') Audio.play('clear');
    this.render();
    if (result.outcome === 'shop') this.openShop();
    if (result.outcome === 'stairs' || result.outcome === 'battle')
      this.persist();
    if (result.outcome === 'win') this.finish('games.magicTower.won');
  }
  private undo() {
    this.closeShop();
    this.state = undoTower(this.state);
    this.render();
  }
  private retry() {
    this.closeShop();
    this.state = retryFloor(this.state);
    this.render();
    this.hint.setText(t('games.magicTower.retryHint'));
  }
  private openShop() {
    this.shop = true;
    this.panel.removeAll(true);
    this.panel.add(
      this.add
        .rectangle(352, 440, 580, 330, 0x111923, 0.98)
        .setStrokeStyle(2, 0xc2a666),
    );
    this.panel.add(
      this.add
        .text(
          352,
          320,
          t('games.magicTower.shopTitle', { price: 20 + this.state.floor * 5 }),
          { fontFamily: 'Arial', fontSize: '22px', color: '#f7e5bc' },
        )
        .setOrigin(0.5),
    );
    const choices = ['attack', 'defense', 'hp'] as const;
    choices.forEach((kind, i) => {
      const button = this.button(
        352,
        376 + i * 55,
        `games.magicTower.buy.${kind}`,
        () => {
          const next = buyUpgrade(this.state, kind);
          this.hint.setText(
            t(
              next === this.state
                ? 'games.magicTower.noGold'
                : 'games.magicTower.collected',
            ),
          );
          this.state = next;
          this.render();
        },
      );
      this.panel.add(button);
    });
    this.panel.add(
      this.button(352, 555, 'games.magicTower.close', () => this.closeShop()),
    );
  }
  private closeShop() {
    this.shop = false;
    this.panel.removeAll(true);
  }
  private render() {
    this.board.removeAll(true);
    this.title.setText(
      t('games.magicTower.floor', {
        floor: this.state.floor + 1,
        total: FLOOR_COUNT,
      }),
    );
    this.hud.setText(
      t('games.magicTower.stats', {
        hp: this.state.hp,
        attack: this.state.attack,
        defense: this.state.defense,
        gold: this.state.gold,
      }),
    );
    for (let i = 0; i < 3; i++)
      this.board.add(
        this.add.text(X + 40 + i * 112, 107, String(this.state.keys[i]), {
          fontSize: '19px',
          color: '#f8dda0',
        }),
      );
    const sheet = (cell: number, key: string, frame: number, height = CELL) => {
      const x = X + (cell % SIZE) * CELL + CELL / 2,
        y = Y + Math.floor(cell / SIZE) * CELL + CELL / 2;
      this.board.add(
        this.add
          .image(x, y, `tower-${key}`, frame)
          .setDisplaySize(CELL, height),
      );
    };
    this.state.maps[this.state.floor].forEach((token, cell) => {
      sheet(cell, 'terrains', 0);
      if (token === '#') sheet(cell, 'animates', 10 * 4);
      if (token === '<' || token === '>')
        sheet(cell, 'terrains', token === '<' ? 5 : 6);
      const key = 'ybr'.indexOf(token);
      if (key >= 0) sheet(cell, 'items', key);
      const door = 'YBR'.indexOf(token);
      if (door >= 0) sheet(cell, 'animates', (door + 4) * 4);
      if (token === 'a') sheet(cell, 'items', 16);
      if (token === 'd') sheet(cell, 'items', 17);
      if (token === 'p') sheet(cell, 'items', 20);
      if (token === 's') sheet(cell, 'npcs', 20);
      if (token === 'm' || token === 'G') {
        const enemy = enemyFor(this.state.floor, token === 'G');
        sheet(cell, 'enemys', enemy.frame * 2);
        if (this.book) {
          const damage = damageFor(this.state, enemy);
          this.board.add(
            this.add
              .text(
                X + (cell % SIZE) * CELL + CELL / 2,
                Y + Math.floor(cell / SIZE) * CELL + CELL - 4,
                Number.isFinite(damage) ? String(damage) : '∞',
                {
                  fontFamily: 'Arial',
                  fontSize: '14px',
                  color: damage >= this.state.hp ? '#ff6e6e' : '#fff4a3',
                  backgroundColor: '#17202b',
                },
              )
              .setOrigin(0.5, 1),
          );
        }
      }
    });
    sheet(this.state.player, 'hero', 0, CELL * 1.35);
    this.score =
      this.state.kills * 100 +
      this.state.floor * 500 +
      (this.state.won ? 5000 : 0);
    this.publish();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) return;
    if (this.shop) {
      if (this.controls.consume('START') || this.controls.consume('SPECIAL'))
        this.closeShop();
      return;
    }
    if (this.controls.consume('SPECIAL')) this.undo();
    if (this.controls.consume('SECONDARY')) this.retry();
    if (this.controls.consume('MODE')) {
      this.book = !this.book;
      this.render();
    }
    this.repeat = Math.max(0, this.repeat - delta);
    for (const direction of directions) {
      const pressed = this.controls.consume(direction);
      if (pressed || (this.controls.down(direction) && this.repeat === 0)) {
        this.move(direction);
        this.repeat = 160;
        break;
      }
    }
  }
  protected snapshot() {
    return this.state;
  }
}

import type Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import { t } from '../../../i18n';
import type { TranslationKey } from '../../../i18n/translate';
import { Audio } from '../../../shared/audio';
import back from '../assets/back.png';
import cards from '../assets/cards.png';
import empty from '../assets/empty.png';
import recycle from '../assets/recycle.png';
import {
  advanceTime,
  autoFoundation,
  canAutoComplete,
  drawStock,
  findHint,
  flip,
  isKlondikeState,
  type KlondikeState,
  type Location,
  move,
  newGame,
  selectedCards,
  undoMove,
} from '../logic';

interface CardView {
  image: Phaser.GameObjects.Image;
  location: Location;
  id: number | null;
  x: number;
  y: number;
}
interface Save {
  version: 1;
  board: KlondikeState;
  history: KlondikeState[];
}
const W = 84,
  H = 114,
  LEFT = 18,
  GAP = 97,
  TOP = 130,
  TABLEAU = 280;
const same = (a: Location | null, b: Location) =>
  JSON.stringify(a) === JSON.stringify(b);
function restore(value: unknown): Save | null {
  if (!value || typeof value !== 'object') return null;
  const saved = value as Partial<Save>;
  if (
    saved.version !== 1 ||
    !isKlondikeState(saved.board) ||
    !Array.isArray(saved.history) ||
    saved.history.length > 60 ||
    !saved.history.every(isKlondikeState)
  )
    return null;
  return structuredClone(saved as Save);
}

export class MainScene extends SessionScene {
  protected inputBindings = {
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    Enter: 'START',
    Space: 'DROP',
    KeyZ: 'SPECIAL',
    KeyH: 'MODE',
    KeyF: 'SECONDARY',
    KeyP: 'PAUSE',
    Escape: 'PAUSE',
  } as const;
  protected gamepadButtons = {
    0: 'START',
    1: 'DROP',
    2: 'SPECIAL',
    3: 'MODE',
    9: 'PAUSE',
  } as const;
  private board!: KlondikeState;
  private history: KlondikeState[] = [];
  private drawCount: 1 | 3 = 1;
  private views: CardView[] = [];
  private selection: Location | null = null;
  private cursor: Location | null = null;
  private highlight!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private notice!: Phaser.GameObjects.Text;
  private menu: { text: Phaser.GameObjects.Text; key: TranslationKey }[] = [];
  private modeLabel!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private hintTarget: Location | null = null;
  private hintTime = 0;
  private press: {
    x: number;
    y: number;
    from: Location;
    moved: boolean;
    time: number;
    id: number;
  } | null = null;
  private lastTap: { id: number; time: number } | null = null;
  private completing = false;
  private completeTime = 0;
  private message: TranslationKey = 'games.klondike.help';
  preload() {
    this.load.spritesheet('kl-cards', cards, {
      frameWidth: 71,
      frameHeight: 96,
    });
    this.load.image('kl-back', back);
    this.load.image('kl-empty', empty);
    this.load.image('kl-recycle', recycle);
  }
  create() {
    const saved = restore(this.savedSnapshot);
    this.board = saved?.board ?? newGame(this.drawCount);
    this.history = saved?.history ?? [];
    this.drawCount = this.board.drawCount;
    this.score = this.board.score;
    this.views = [];
    this.menu = [];
    this.selection = null;
    this.cursor = null;
    this.press = null;
    this.lastTap = null;
    this.completing = false;
    this.completeTime = 0;
    this.hintTime = 0;
    this.hintTarget = null;
    this.message = 'games.klondike.help';
    this.cameras.main.setBackgroundColor('#008000');
    this.add.rectangle(360, 24, 720, 48, 0x000080);
    this.title = this.label(18, 24, '', 26)
      .setColor('#ffffff')
      .setOrigin(0, 0.5);
    this.add.rectangle(360, 78, 720, 60, 0xc0c0c0).setStrokeStyle(2, 0xffffff);
    this.modeLabel = this.button(75, 'games.klondike.drawOne', () => {
      this.drawCount = this.drawCount === 1 ? 3 : 1;
      this.scene.restart({ snapshot: null });
    });
    this.button(220, 'games.klondike.undo', () => this.undo());
    this.button(360, 'games.klondike.hint', () => this.hint());
    this.button(500, 'games.klondike.auto', () => {
      if (canAutoComplete(this.board)) this.completing = true;
      else {
        this.message = 'games.klondike.autoWait';
        this.updateHud();
      }
    });
    this.button(644, 'games.klondike.new', () =>
      this.scene.restart({ snapshot: null }),
    );
    this.highlight = this.add.graphics().setDepth(200);
    this.add.rectangle(360, 780, 720, 40, 0xc0c0c0);
    this.hud = this.label(18, 781, '', 20).setOrigin(0, 0.5);
    this.notice = this.label(360, 258, '', 18)
      .setOrigin(0.5)
      .setColor('#ffffff')
      .setStyle({ align: 'center', wordWrap: { width: 680 } });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.status !== 'playing' || this.completing) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const hit = this.hit(point.x, point.y);
      if (!hit) {
        this.selection = null;
        this.paintHighlight();
        return;
      }
      this.cursor = null;
      this.press = {
        x: point.x,
        y: point.y,
        from: hit.location,
        moved: false,
        time: this.time.now,
        id: pointer.id,
      };
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const press = this.press;
      if (!press || press.id !== pointer.id || this.status !== 'playing')
        return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const dx = point.x - press.x,
        dy = point.y - press.y;
      if (
        Math.hypot(dx, dy) > 8 &&
        selectedCards(this.board, press.from).length
      )
        press.moved = true;
      if (!press.moved) return;
      this.selection = press.from;
      const ids = selectedCards(this.board, press.from);
      this.views.forEach((view) => {
        if (view.id !== null && ids.includes(view.id))
          view.image
            .setPosition(view.x + dx, view.y + dy)
            .setDepth(100 + ids.indexOf(view.id));
      });
      this.highlight.clear();
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const press = this.press;
      if (!press || press.id !== pointer.id) return;
      this.press = null;
      if (this.status !== 'playing') {
        this.drawBoard();
        return;
      }
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (press.moved) {
        const to = this.dropTarget(point.x, point.y);
        if (to) this.perform(() => move(this.board, press.from, to));
        this.selection = null;
        this.drawBoard();
      } else {
        const hit = this.hit(point.x, point.y);
        if (hit && same(press.from, hit.location)) this.activate(hit.location);
      }
    });
    this.input.on('pointerupoutside', () => {
      this.press = null;
      this.selection = null;
      this.drawBoard();
    });
    this.begin();
    this.controls.onReset(() => {
      this.press = null;
      this.selection = null;
      this.drawBoard();
    });
    this.drawBoard();
    this.updateHud();
  }
  private label(x: number, y: number, text: string, size: number) {
    return this.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${size}px`,
      color: '#111111',
    });
  }
  private button(x: number, key: TranslationKey, action: () => void) {
    const bg = this.add
      .rectangle(x, 78, 126, 42, 0xc0c0c0)
      .setStrokeStyle(2, 0xffffff);
    const label = this.label(x, 78, t(key), 19).setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (this.status !== 'playing' && key !== 'games.klondike.new') return;
      this.press = null;
      this.selection = null;
      action();
    });
    this.menu.push({ text: label, key });
    return label;
  }
  private addCard(
    location: Location,
    x: number,
    y: number,
    id: number | null,
    up = true,
    texture?: string,
  ) {
    const image = this.add
      .image(
        x,
        y,
        texture ?? (id === null ? 'kl-empty' : up ? 'kl-cards' : 'kl-back'),
        up && id !== null && !texture ? id : undefined,
      )
      .setOrigin(0)
      .setDisplaySize(W, H)
      .setDepth(1 + this.views.length);
    this.views.push({ image, location, id, x, y });
  }
  private drawBoard() {
    for (const view of this.views) view.image.destroy();
    this.views = [];
    this.addCard(
      { kind: 'stock' },
      LEFT,
      TOP,
      null,
      false,
      this.board.stock.length ? 'kl-back' : 'kl-recycle',
    );
    if (!this.board.waste.length)
      this.addCard({ kind: 'waste' }, LEFT + GAP, TOP, null);
    else {
      const visible = this.board.waste.slice(-this.board.drawCount);
      visible.forEach((id, i) => {
        this.addCard({ kind: 'waste' }, LEFT + GAP + i * 15, TOP, id);
      });
    }
    this.board.foundations.forEach((pile, p) => {
      this.addCard(
        { kind: 'foundation', pile: p },
        LEFT + GAP * (p + 3),
        TOP,
        pile[pile.length - 1] ?? null,
      );
    });
    this.board.tableau.forEach((pile, p) => {
      if (!pile.length)
        this.addCard(
          { kind: 'tableau', pile: p, index: 0 },
          LEFT + GAP * p,
          TABLEAU,
          null,
        );
      const total = pile
        .slice(0, -1)
        .reduce((n, card) => n + (card.up ? 28 : 14), 0);
      const compression = Math.min(1, (752 - TABLEAU - H) / Math.max(1, total));
      let y = TABLEAU;
      pile.forEach((card, index) => {
        this.addCard(
          { kind: 'tableau', pile: p, index },
          LEFT + GAP * p,
          y,
          card.id,
          card.up,
        );
        y += (card.up ? 28 : 14) * compression;
      });
    });
    this.paintHighlight();
  }
  private hit(x: number, y: number) {
    for (let i = this.views.length - 1; i >= 0; i--) {
      const view = this.views[i];
      if (x >= view.x && x <= view.x + W && y >= view.y && y <= view.y + H)
        return view;
    }
    return null;
  }
  private dropTarget(x: number, y: number): Location | null {
    if (y >= TOP && y <= TOP + H) {
      const pile = Math.floor((x - LEFT) / GAP) - 3;
      if (pile >= 0 && pile < 4 && x <= LEFT + GAP * (pile + 3) + W)
        return { kind: 'foundation', pile };
    }
    if (y >= TABLEAU && y < 755) {
      const pile = Math.floor((x - LEFT) / GAP);
      if (pile >= 0 && pile < 7 && x <= LEFT + GAP * pile + W)
        return {
          kind: 'tableau',
          pile,
          index: this.board.tableau[pile].length,
        };
    }
    return null;
  }
  private activate(location: Location) {
    if (location.kind === 'stock') {
      this.perform(() => drawStock(this.board));
      return;
    }
    if (
      this.selection &&
      !same(this.selection, location) &&
      this.perform(() => move(this.board, this.selection as Location, location))
    )
      return;
    if (location.kind === 'tableau') {
      const pile = this.board.tableau[location.pile];
      if (location.index === pile.length - 1 && !pile[location.index].up) {
        this.perform(() => flip(this.board, location.pile));
        return;
      }
    }
    const ids = selectedCards(this.board, location);
    if (!ids.length) {
      this.selection = null;
      this.paintHighlight();
      return;
    }
    if (
      ids.length === 1 &&
      this.lastTap?.id === ids[0] &&
      this.time.now - this.lastTap.time < 400
    ) {
      this.perform(() => autoFoundation(this.board, location));
      this.lastTap = null;
      return;
    }
    this.lastTap = { id: ids[0], time: this.time.now };
    this.selection = same(this.selection, location) ? null : location;
    this.paintHighlight();
  }
  private perform(action: () => boolean) {
    const before = structuredClone(this.board);
    if (!action()) return false;
    this.history.push(before);
    if (this.history.length > 60) this.history.shift();
    this.selection = null;
    this.hintTarget = null;
    this.message = 'games.klondike.help';
    this.score = this.board.score;
    Audio.play('click');
    this.publish();
    this.drawBoard();
    this.updateHud();
    if (this.board.won) {
      this.completing = false;
      this.finish('games.klondike.won', false);
      Audio.play('clear');
    }
    return true;
  }
  private undo() {
    const old = undoMove(this.board, this.history);
    if (!old) return;
    this.board = old;
    this.score = this.board.score;
    this.selection = null;
    this.hintTarget = null;
    this.completing = false;
    this.drawBoard();
    this.updateHud();
    this.publish();
  }
  private hint() {
    const hint = findHint(this.board);
    if (hint) {
      this.selection = hint.from;
      this.hintTarget = hint.to;
      this.message = 'games.klondike.hintMove';
    } else {
      const hidden = this.board.tableau.findIndex(
        (pile) => pile.length && !pile[pile.length - 1].up,
      );
      this.selection =
        hidden >= 0
          ? {
              kind: 'tableau',
              pile: hidden,
              index: this.board.tableau[hidden].length - 1,
            }
          : { kind: 'stock' };
      this.message =
        hidden >= 0 ? 'games.klondike.hintFlip' : 'games.klondike.hintDraw';
    }
    this.hintTime = 4;
    this.paintHighlight();
    this.updateHud();
  }
  private paintHighlight() {
    if (!this.highlight) return;
    this.highlight.clear();
    for (const [location, color] of [
      [this.cursor, 0xffffff],
      [this.selection, 0xffff00],
      [this.hintTarget, 0x00ffff],
    ] as const) {
      if (!location) continue;
      const view =
        this.views.find((view) => same(view.location, location)) ??
        this.views.find(
          (view) =>
            view.location.kind === location.kind &&
            'pile' in location &&
            'pile' in view.location &&
            view.location.pile === location.pile,
        );
      if (view)
        this.highlight
          .lineStyle(3, color)
          .strokeRect(view.x - 2, view.y - 2, W + 4, H + 4);
    }
  }
  private navigate(dx: number, dy: number) {
    let location = this.cursor ?? { kind: 'stock' };
    if (location.kind === 'tableau') {
      const pile = this.board.tableau[location.pile];
      if (dx) {
        const p = (location.pile + dx + 7) % 7;
        location = {
          kind: 'tableau',
          pile: p,
          index: Math.max(0, this.board.tableau[p].length - 1),
        };
      } else if (dy < 0 && location.index === 0) location = { kind: 'stock' };
      else
        location = {
          ...location,
          index: Math.max(0, Math.min(pile.length - 1, location.index + dy)),
        };
    } else if (dy > 0) {
      const p =
        location.kind === 'stock'
          ? 0
          : location.kind === 'waste'
            ? 1
            : location.pile + 3;
      location = {
        kind: 'tableau',
        pile: p,
        index: Math.max(0, this.board.tableau[p].length - 1),
      };
    } else if (dx) {
      const index =
        location.kind === 'stock'
          ? 0
          : location.kind === 'waste'
            ? 1
            : location.pile + 2;
      const next = (index + dx + 6) % 6;
      location =
        next === 0
          ? { kind: 'stock' }
          : next === 1
            ? { kind: 'waste' }
            : { kind: 'foundation', pile: next - 2 };
    }
    this.cursor = location;
    this.paintHighlight();
  }
  update(_time: number, delta: number) {
    const running = this.frame(delta);
    this.updateHud();
    if (!running) return;
    advanceTime(this.board, Math.min(delta, 100) / 1000);
    if (this.score !== this.board.score) {
      this.score = this.board.score;
      this.publish();
    }
    if (this.hintTime > 0) {
      this.hintTime -= delta / 1000;
      if (this.hintTime <= 0) {
        this.hintTarget = null;
        this.paintHighlight();
      }
    }
    if (this.controls.consume('LEFT')) this.navigate(-1, 0);
    if (this.controls.consume('RIGHT')) this.navigate(1, 0);
    if (this.controls.consume('UP')) this.navigate(0, -1);
    if (this.controls.consume('DOWN')) this.navigate(0, 1);
    if (this.controls.consume('START'))
      this.activate(this.cursor ?? { kind: 'stock' });
    if (this.controls.consume('DROP'))
      this.perform(() => drawStock(this.board));
    if (this.controls.consume('SPECIAL')) this.undo();
    if (this.controls.consume('MODE')) this.hint();
    if (this.controls.consume('SECONDARY') && this.selection)
      this.perform(() =>
        autoFoundation(this.board, this.selection as Location),
      );
    if (this.completing) {
      this.completeTime += delta;
      if (this.completeTime >= 120) {
        this.completeTime = 0;
        const hint = findHint(this.board);
        if (hint?.to.kind === 'foundation')
          this.perform(() => move(this.board, hint.from, hint.to));
        else this.completing = false;
      }
    }
  }
  private updateHud() {
    this.title.setText(t('games.klondike.name'));
    for (const item of this.menu) item.text.setText(t(item.key));
    this.modeLabel.setText(
      t(
        this.board.drawCount === 1
          ? 'games.klondike.drawOne'
          : 'games.klondike.drawThree',
      ),
    );
    this.hud.setText(
      t('games.klondike.hud', {
        score: this.board.score,
        moves: this.board.moves,
        seconds: Math.floor(this.board.seconds),
      }),
    );
    this.notice.setText(
      t(this.board.won ? 'games.klondike.won' : this.message),
    );
  }
  protected snapshot(): Save {
    return { version: 1, board: this.board, history: this.history };
  }
}

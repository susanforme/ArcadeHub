import { t } from '../../i18n';
import type { LodeGame, SpriteState } from './vendor/engine';

export const WIDTH = 1120;
export const HEIGHT = 832;
export class LodeRenderer {
  constructor(
    private context: CanvasRenderingContext2D,
    private images: Record<string, HTMLImageElement>,
  ) {}
  private sprite(sprite: SpriteState) {
    const image = this.images[sprite.spriteSheet];
    if (!image || sprite.alpha === 0) return;
    let sx = 0,
      sy = 0,
      sw = 40,
      sh = 44;
    if (['runner', 'guard', 'redhat'].includes(sprite.spriteSheet)) {
      const columns = image.width / 40;
      sx = (sprite.currentFrame % columns) * 40;
      sy = Math.floor(sprite.currentFrame / columns) * 44;
    } else if (sprite.spriteSheet === 'hole') {
      const frame = sprite.currentFrame;
      if (frame < 16) {
        sx = (frame % 8) * 40;
        sy = Math.floor(frame / 8) * 88;
        sh = 88;
      } else {
        sx = frame === 16 ? 280 : 320;
        sy = [88, 44, 0, 132][frame - 16];
      }
    } else {
      sw = image.width;
      sh = image.height;
    }
    const ctx = this.context;
    ctx.globalAlpha = sprite.alpha;
    ctx.drawImage(image, sx, sy, sw, sh, sprite.x, sprite.y, sw, sh);
    ctx.globalAlpha = 1;
  }
  draw(game: LodeGame, menu: boolean) {
    const ctx = this.context;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (const sprite of game.objects()) this.sprite(sprite);
    for (let x = 0; x < 28; x++) ctx.drawImage(this.images.ground, x * 40, 704);
    ctx.fillStyle = '#081725';
    ctx.fillRect(0, 724, WIDTH, 108);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#12a4f8';
    ctx.fillText(t('games.lodeRunner.score', { score: game.score }), 20, 754);
    ctx.fillStyle = '#ff920b';
    ctx.textAlign = 'right';
    ctx.fillText(
      t('games.lodeRunner.level', { level: game.level + 1 }),
      1100,
      754,
    );
    ctx.drawImage(this.images.runner, 0, 0, 40, 44, 470, 732, 32, 35);
    ctx.drawImage(this.images.gold, 610, 736, 32, 35);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`× ${game.lives}`, 512, 754);
    ctx.fillText(`× ${game.gold}`, 652, 754);
    ctx.font = '24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d1d9e4';
    ctx.fillText(t('games.lodeRunner.digHint'), WIDTH / 2, 803);
    if (menu) {
      ctx.fillStyle = '#000b';
      ctx.fillRect(0, 0, WIDTH, 724);
      ctx.fillStyle = '#071828';
      ctx.fillRect(160, 178, 800, 430);
      ctx.strokeStyle = '#0fa0ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(160, 178, 800, 430);
      ctx.fillStyle = '#ff8b06';
      ctx.font = 'bold 60px monospace';
      ctx.fillText('LODE RUNNER', 560, 242);
      ctx.font = '27px system-ui, sans-serif';
      ctx.fillStyle = '#e8f1ff';
      ctx.fillText(t('games.lodeRunner.instructions'), 560, 307);
      ctx.fillStyle = '#082b43';
      ctx.fillRect(240, 345, 120, 72);
      ctx.fillRect(760, 345, 120, 72);
      ctx.fillStyle = '#fff';
      ctx.fillText('◀', 300, 381);
      ctx.fillText('▶', 820, 381);
      ctx.fillText(
        t('games.lodeRunner.level', { level: game.level + 1 }),
        560,
        381,
      );
      ctx.fillStyle = '#0b72ad';
      ctx.fillRect(350, 444, 420, 80);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.fillText(t('games.lodeRunner.play'), 560, 484);
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillStyle = '#aac5dd';
      ctx.fillText(t('games.lodeRunner.menuHint'), 560, 564);
    } else if (game.phase !== 'playing') {
      const messages = {
        ready: 'games.lodeRunner.ready',
        dead: 'games.lodeRunner.dead',
        clear: 'games.lodeRunner.cleared',
        over: 'games.lodeRunner.gameOver',
        won: 'games.lodeRunner.won',
      } as const;
      ctx.fillStyle = '#000c';
      ctx.fillRect(180, 310, 760, 82);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText(t(messages[game.phase]), WIDTH / 2, 350);
    }
  }
}

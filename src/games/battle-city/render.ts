import { localizeText } from '../../i18n';
import type GameSession from './vendor/engine/GameSession';
import SpriteAtlas, { brickShapeKey } from './vendor/render/SpriteAtlas';
import { tankColor } from './vendor/render/tankColor';

const rotation = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};
export class BattleRenderer {
  private atlas = new SpriteAtlas();
  private terrain = document.createElement('canvas');
  private forest = document.createElement('canvas');
  private mounted: GameSession['scene'] = null;
  private version = -1;
  constructor(private ctx: CanvasRenderingContext2D) {
    for (const canvas of [this.terrain, this.forest])
      canvas.width = canvas.height = 208;
    ctx.imageSmoothingEnabled = false;
  }
  private sprite(key: string, x: number, y: number) {
    this.ctx.drawImage(this.atlas.get(key), Math.round(x), Math.round(y));
  }
  private text(
    text: string,
    x: number,
    y: number,
    color = '#fff',
    size = 8,
    centered = false,
  ) {
    const c = this.ctx;
    c.fillStyle = color;
    c.font = `bold ${size}px monospace`;
    c.textAlign = centered ? 'center' : 'left';
    c.textBaseline = 'top';
    c.fillText(localizeText(text), x, y);
  }
  draw(s: GameSession) {
    const c = this.ctx;
    c.fillStyle = '#757575';
    c.fillRect(0, 0, 256, 240);
    c.fillStyle = '#000';
    c.fillRect(16, 16, 208, 208);
    const scene = s.scene;
    if (scene) {
      const map = scene.map;
      if (this.mounted !== scene || this.version !== map.version) {
        const t = this.terrain.getContext('2d');
        const f = this.forest.getContext('2d');
        if (!t || !f) throw new Error('Canvas 2D unavailable');
        t.clearRect(0, 0, 208, 208);
        map.forEachSnow((x, y) => t.drawImage(this.atlas.get('snow'), x, y));
        map.forEachSteel((x, y) => t.drawImage(this.atlas.get('steel'), x, y));
        map.forEachBrick((x, y) =>
          t.drawImage(this.atlas.get(brickShapeKey(y / 4, x / 4)), x, y),
        );
        if (this.mounted !== scene) {
          f.clearRect(0, 0, 208, 208);
          map.forEachForest((x, y) =>
            f.drawImage(this.atlas.get('forest'), x, y),
          );
        }
        this.mounted = scene;
        this.version = map.version;
      }
      c.save();
      c.translate(16, 16);
      map.forEachRiver((x, y) =>
        this.sprite(`river/${Math.floor(scene.time / 200) % 2}`, x, y),
      );
      c.drawImage(this.terrain, 0, 0);
      if (map.eagle)
        this.sprite(
          `eagle/${map.eagleBroken ? 'broken' : 'initial'}`,
          map.eagle.x,
          map.eagle.y,
        );
      for (const b of scene.bullets) this.sprite('bullet', b.x, b.y);
      for (const t of scene.tanks) {
        if (!t.alive || !t.visible) continue;
        const shape = t.moving ? Math.floor(scene.time / 80) % 2 : 0;
        c.save();
        c.translate(Math.round(t.x) + 8, Math.round(t.y) + 8);
        c.rotate(rotation[t.direction]);
        this.sprite(
          `tank/${t.side}/${t.level}/${tankColor(t, scene.time)}/${shape}`,
          -8,
          -8,
        );
        c.restore();
        if (t.helmetDuration > 0)
          this.sprite(`helmet/${Math.floor(scene.time / 50) % 2}`, t.x, t.y);
      }
      c.drawImage(this.forest, 0, 0);
      for (const p of scene.powerUps)
        if (p.visible) this.sprite(`powerup/${p.name}`, p.x, p.y);
      for (const e of scene.explosions) {
        const image = this.atlas.get(`explosion/${e.shape()}`);
        c.drawImage(
          image,
          Math.round(e.cx - image.width / 2),
          Math.round(e.cy - image.height / 2),
        );
      }
      for (const f of scene.flickers)
        this.sprite(`flicker/${f.shape()}`, f.x, f.y);
      for (const p of scene.scorePopups)
        if (p.visible) this.sprite(`score/${p.score}`, p.x, p.y);
      c.restore();
      if (s.hudVisible) {
        for (let i = 0; i < scene.remainingBotCount; i++) {
          c.save();
          c.translate(232 + (i % 2) * 8, 18 + Math.floor(i / 2) * 8);
          c.scale(0.5, 0.5);
          this.sprite('tank/bot/basic/silver/0', 0, 0);
          c.restore();
        }
        s.players.forEach((p, i) => {
          this.text(`${i + 1}P`, 232, 125 + i * 28, '#000');
          this.text(`${p.lives}`, 240, 137 + i * 28, '#000');
          c.save();
          c.translate(230, 135 + i * 28);
          c.scale(0.5, 0.5);
          this.sprite(`tank/player/basic/${p.color}/0`, 0, 0);
          c.restore();
        });
        this.text('⚑', 232, 184, '#000', 16);
        this.text(String(s.stageIndex + 1), 236, 202, '#000');
        this.text(
          s.players
            .map((p, i) => `${i + 1}P ${String(p.score).padStart(6, '0')}`)
            .join('   '),
          16,
          228,
          '#000',
        );
      }
    }
    if (s.phase === 'enter') {
      const height = 104 * s.curtain;
      c.fillStyle = '#757575';
      c.fillRect(16, 16, 208, height);
      c.fillRect(16, 224 - height, 208, height);
      if (s.curtain === 1)
        this.text(`STAGE ${s.stageIndex + 1}`, 120, 116, '#000', 10, true);
    }
    if (s.phase === 'statistics') {
      c.fillStyle = '#000';
      c.fillRect(0, 0, 256, 240);
      this.text(`STAGE ${s.stageIndex + 1}`, 128, 24, '#fff', 12, true);
      this.text('native.battleResults', 128, 47, '#e79c21', 10, true);
      s.players.forEach((p, i) => {
        this.text(`${i + 1}P  ${p.score}`, 30 + i * 128, 70, '#b53121');
      });
      const levels = ['basic', 'fast', 'power', 'armor'] as const;
      levels.forEach((level, row) => {
        this.sprite(`tank/bot/${level}/silver/0`, 120, 94 + row * 24);
        s.statistics?.counts.forEach((counts, i) => {
          if (counts[level] >= 0)
            this.text(
              `${counts[level]} × ${(row + 1) * 100}`,
              20 + i * 140,
              98 + row * 24,
            );
        });
      });
      if (s.statistics?.showTotal)
        this.text(
          `TOTAL ${s.scores.reduce((a, b) => a + b, 0)}`,
          128,
          203,
          '#e79c21',
          10,
          true,
        );
    }
    if (s.phase === 'gameover') {
      const y = 224 - s.gameoverProgress * 116;
      c.fillStyle = '#000';
      c.fillRect(91, y - 3, 58, 27);
      this.text('native.game', 120, y, '#b53121', 12, true);
      this.text('native.over', 120, y + 12, '#b53121', 12, true);
    }
    if (s.phase === 'ended') {
      c.fillStyle = '#000';
      c.fillRect(0, 0, 256, 240);
      this.text(
        s.cleared ? 'native.congratulations' : 'native.gameOver',
        128,
        72,
        '#b53121',
        16,
        true,
      );
      this.text(`STAGE ${s.stageIndex + 1}`, 128, 112, '#fff', 12, true);
      s.players.forEach((p, i) => {
        this.text(
          `${i + 1}P SCORE  ${p.score}`,
          128,
          140 + i * 18,
          '#e79c21',
          10,
          true,
        );
      });
      this.text('native.restartToPlayAgain', 128, 203, '#adadad', 9, true);
    }
  }
  menu(twoPlayers: boolean, stage: number) {
    const c = this.ctx;
    c.fillStyle = '#000';
    c.fillRect(0, 0, 256, 240);
    this.text('native.battle', 128, 35, '#b53121', 32, true);
    this.text('native.city', 128, 67, '#b53121', 32, true);
    this.text('native.1Player', 99, 120, twoPlayers ? '#adadad' : '#fff', 10);
    this.text('native.2Players', 99, 143, twoPlayers ? '#fff' : '#adadad', 10);
    this.sprite('tank/player/basic/yellow/0', 76, twoPlayers ? 139 : 116);
    this.text(
      `‹  STAGE ${String(stage + 1).padStart(2, '0')}  ›`,
      128,
      173,
      '#e79c21',
      10,
      true,
    );
    this.text('native.pressSpaceEnter', 128, 198, '#fff', 9, true);
    this.text('© feichao93 · MIT', 128, 222, '#757575', 7, true);
  }
}

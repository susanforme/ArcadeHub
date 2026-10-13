import Phaser from 'phaser';
import { SessionScene } from '../../../core/session-scene';
import type { Action } from '../../../core/types';
import { Audio } from '../../../shared/audio';
import {
  type Checkpoint,
  checkpoint,
  isCheckpoint,
  newBattle,
  stages,
} from '../logic';
import { BattleRenderer } from '../render';
import type GameSession from '../vendor/engine/GameSession';
import type { AudioPort, SoundName } from '../vendor/engine/types';
import EngineInput from '../vendor/input/InputManager';

const soundModules = import.meta.glob<string>('../vendor/audio/sounds/*.ogg', {
  eager: true,
  import: 'default',
});
const sounds = Object.fromEntries(
  Object.entries(soundModules).map(([path, url]) => [
    path.split('/').pop()?.replace('.ogg', ''),
    url,
  ]),
);
const directions: [Action, string][] = [
  ['UP', 'KeyW'],
  ['DOWN', 'KeyS'],
  ['LEFT', 'KeyA'],
  ['RIGHT', 'KeyD'],
  ['DROP', 'Space'],
];
const moveKeys = new Set([
  'KeyW',
  'KeyS',
  'KeyA',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);
export class MainScene extends SessionScene {
  private battle: GameSession | null = null;
  private engineInput = new EngineInput();
  private texture!: Phaser.Textures.CanvasTexture;
  private battleRenderer!: BattleRenderer;
  private twoPlayers = false;
  private selectedStage = 0;
  private accumulator = 0;
  private opening: Checkpoint | null = null;
  private physical = new Set<string>();
  private audio: AudioPort = {
    play: (name: SoundName) => {
      if (sounds[name]) Audio.playAsset(sounds[name]);
    },
  };
  create() {
    this.battle = null;
    this.opening = null;
    this.engineInput = new EngineInput();
    this.twoPlayers = false;
    this.selectedStage = 0;
    this.accumulator = 0;
    this.physical.clear();
    const texture = this.textures.createCanvas('battle-city-screen', 256, 240);
    if (!texture) throw new Error('Cannot create Battle City canvas');
    this.texture = texture;
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, texture.key).setOrigin(0).setScale(2);
    this.battleRenderer = new BattleRenderer(texture.getContext());
    this.begin();
    const keyboard = (e: KeyboardEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest('input, textarea, select, button, a')
      )
        return;
      const down = e.type === 'keydown';
      if (
        e.code === 'Enter' &&
        down &&
        !e.repeat &&
        !this.battle &&
        this.status === 'playing'
      ) {
        e.preventDefault();
        this.startBattle();
        return;
      }
      if (
        ['KeyJ', 'Slash'].includes(e.code) ||
        (this.battle && this.twoPlayers && moveKeys.has(e.code))
      ) {
        if (this.status === 'playing') {
          if (down) {
            this.physical.add(e.code);
            this.engineInput.keyDown(e.code);
          } else {
            this.physical.delete(e.code);
            this.engineInput.keyUp(e.code);
          }
          if (!this.battle && down && !e.repeat && e.code === 'KeyJ')
            this.startBattle();
        }
        e.preventDefault();
        // Double-player arrows belong to P2; keep shared touch/gamepad actions on P1.
        if (moveKeys.has(e.code)) e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', keyboard, true);
    window.addEventListener('keyup', keyboard, true);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', keyboard, true);
      window.removeEventListener('keyup', keyboard, true);
      this.textures.remove(texture.key);
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.battle || this.status !== 'playing') return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const x = point.x / 2,
        y = point.y / 2;
      if (y >= 111 && y < 159) {
        this.twoPlayers = y >= 136;
        this.startBattle();
      } else if (y >= 162 && y < 189) {
        this.selectedStage =
          (this.selectedStage + (x < 128 ? stages.length - 1 : 1)) %
          stages.length;
        this.draw();
      } else if (y >= 189 && y < 216) this.startBattle();
    });
    if (isCheckpoint(this.savedSnapshot)) this.startBattle(this.savedSnapshot);
    else this.draw();
  }
  private startBattle(saved?: Checkpoint) {
    this.battle = newBattle(
      this.audio,
      this.selectedStage,
      this.twoPlayers,
      saved,
    );
    this.twoPlayers = this.battle.players.length === 2;
    this.opening = checkpoint(this.battle);
    this.score = this.battle.scores.reduce((a, b) => a + b, 0);
    this.controls.reset();
    this.engineInput.releaseAll();
    this.publish('保护老鹰基地，消灭全部敌军');
    this.persist();
    this.draw();
  }
  update(_time: number, delta: number) {
    if (!this.frame(delta)) {
      this.accumulator = 0;
      this.engineInput.releaseAll();
      this.physical.clear();
      return;
    }
    if (!this.battle) {
      if (this.controls.consume('UP') || this.controls.consume('DOWN'))
        this.twoPlayers = !this.twoPlayers;
      if (this.controls.consume('LEFT'))
        this.selectedStage =
          (this.selectedStage + stages.length - 1) % stages.length;
      if (this.controls.consume('RIGHT'))
        this.selectedStage = (this.selectedStage + 1) % stages.length;
      if (this.controls.consume('DROP')) this.startBattle();
      this.draw();
      return;
    }
    for (const [action, code] of directions) {
      // Shared keyboard, touch and gamepad feed P1; P2 keys are handled separately.
      if (this.controls.down(action) || this.physical.has(code))
        this.engineInput.keyDown(code);
      else this.engineInput.keyUp(code);
    }
    // Space is a second P1 fire key alongside J.
    const control = this.battle.players[0].control;
    const fire = control.fire;
    if (this.controls.down('DROP')) control.fire = 'Space';
    this.accumulator += Math.min(delta, 100);
    while (this.accumulator >= 1000 / 60) {
      const before = this.battle.stageIndex;
      this.battle.step(1000 / 60, this.engineInput);
      this.engineInput.endTick();
      this.accumulator -= 1000 / 60;
      if (this.battle.stageIndex !== before) {
        this.opening = checkpoint(this.battle);
        this.persist();
      }
    }
    control.fire = fire;
    const score = this.battle.scores.reduce((a, b) => a + b, 0);
    if (score !== this.score) {
      this.score = score;
      this.publish();
    }
    this.draw();
    if (this.battle.phase === 'ended')
      this.finish(
        this.battle.cleared ? '恭喜通关全部 35 关！' : '基地失守或生命耗尽',
        false,
      );
  }
  private draw() {
    if (this.battle) this.battleRenderer.draw(this.battle);
    else this.battleRenderer.menu(this.twoPlayers, this.selectedStage);
    this.texture.refresh();
  }
  protected snapshot() {
    // Stage checkpoints avoid pretending the upstream diagnostic snapshot is restorable.
    return this.opening;
  }
}

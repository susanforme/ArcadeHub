import Phaser from 'phaser';
import { Audio } from '../shared/audio';
import { Input, InputManager } from '../shared/input';
import { writeSave } from '../shared/storage';
import { events } from './event-bus';
import type { SessionState } from './types';

export abstract class SessionScene extends Phaser.Scene {
  protected controls!: InputManager;
  protected score = 0;
  protected status: SessionState['status'] = 'playing';
  protected savedSnapshot: unknown;
  private saveElapsed = 0;
  private unsubscribers: (() => void)[] = [];
  private onBlur = () => {
    if (this.status === 'playing') this.togglePause();
  };
  private onVisibility = () => {
    if (document.hidden) this.onBlur();
  };
  init(data: { snapshot?: unknown; score?: number } = {}) {
    this.savedSnapshot = data.snapshot;
    this.score = data.snapshot ? (data.score ?? 0) : 0;
    this.status = 'playing';
    this.saveElapsed = 0;
  }
  protected begin() {
    this.controls = new InputManager();
    Input.current = this.controls;
    this.unsubscribers = [
      events.on('pause', () => this.togglePause()),
      events.on('restart', () => this.scene.restart({ snapshot: null })),
    ];
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once('shutdown', () => {
      this.persist();
      for (const unsubscribe of this.unsubscribers) unsubscribe();
      window.removeEventListener('blur', this.onBlur);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.controls.destroy();
      if (Input.current === this.controls) Input.current = null;
      Audio.stop();
    });
    this.publish();
  }
  protected frame(delta: number) {
    this.controls.poll();
    if (this.controls.consume('PAUSE')) this.togglePause();
    if (this.status !== 'playing') return false;
    this.saveElapsed += delta;
    if (this.saveElapsed >= 5000) {
      this.saveElapsed = 0;
      this.persist();
    }
    return true;
  }
  protected publish(message?: string) {
    events.emit('state', { score: this.score, status: this.status, message });
  }
  protected finish(message = '游戏结束', playSound = true) {
    this.status = 'over';
    if (playSound) Audio.play('over');
    this.publish(message);
    this.persist();
  }
  private togglePause() {
    if (this.status === 'over') return;
    this.status = this.status === 'paused' ? 'playing' : 'paused';
    this.controls.reset();
    this.publish();
    if (this.status === 'paused') this.persist();
  }
  private persist() {
    const id: string = this.game.registry.get('gameId');
    void writeSave(
      id,
      this.score,
      this.status === 'over' ? null : this.snapshot(),
    )
      .then(() => events.emit('saved', undefined))
      .catch(() =>
        events.emit(
          'storageError',
          '无法写入本地存档，请检查浏览器的存储权限。',
        ),
      );
  }
  protected abstract snapshot(): unknown;
}

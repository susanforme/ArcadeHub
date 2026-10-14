import type Phaser from 'phaser';
import { useSettings } from '../../app/store';
import type { SoundHost } from './types';

export class SceneAudio implements SoundHost {
  private ctx?: AudioContext;
  private gain?: GainNode;
  private paused = false;
  private timers = new Set<Phaser.Time.TimerEvent>();
  private unsubscribe: () => void;
  constructor(private scene: Phaser.Scene) {
    this.unsubscribe = useSettings.subscribe(() => this.configure());
  }
  context() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
      this.configure();
    }
    if (!this.paused && this.ctx.state === 'suspended')
      void this.ctx.resume().catch(() => {});
    return this.ctx;
  }
  destination() {
    this.context();
    return this.gain as GainNode;
  }
  private configure() {
    if (!this.gain || !this.ctx) return;
    const { muted, volume } = useSettings.getState();
    this.gain.gain.setValueAtTime(muted ? 0 : volume, this.ctx.currentTime);
  }
  after(callback: () => void, delay: number) {
    const timer = this.scene.time.delayedCall(delay, () => {
      this.timers.delete(timer);
      callback();
    });
    timer.paused = this.paused;
    this.timers.add(timer);
    return timer;
  }
  every(callback: () => void, delay: number) {
    const timer = this.scene.time.addEvent({ delay, callback, loop: true });
    timer.paused = this.paused;
    this.timers.add(timer);
    return timer;
  }
  cancel(timer: object) {
    const event = timer as Phaser.Time.TimerEvent;
    event.remove(false);
    this.timers.delete(event);
  }
  setPaused(paused: boolean) {
    if (paused === this.paused) return;
    this.paused = paused;
    for (const timer of this.timers) timer.paused = paused;
    if (this.ctx && this.ctx.state !== 'closed')
      void (paused ? this.ctx.suspend() : this.ctx.resume()).catch(() => {});
  }
  destroy() {
    this.unsubscribe();
    for (const timer of this.timers) timer.remove(false);
    this.timers.clear();
    if (this.ctx && this.ctx.state !== 'closed')
      void this.ctx.close().catch(() => {});
  }
}

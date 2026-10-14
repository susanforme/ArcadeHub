import { expect, test } from '@rstest/core';
import type Phaser from 'phaser';
import { useSettings } from '../src/app/store';
import { SceneAudio } from '../src/games/browser-arcade/audio';

test('scene audio follows volume/mute, pauses timers and closes its context on exit', async () => {
  const oldContext = globalThis.AudioContext;
  const settings = useSettings.getState();
  let output = 0,
    closed = 0,
    suspended = 0,
    resumed = 0,
    removed = 0;
  const gain = {
    gain: {
      setValueAtTime: (value: number) => {
        output = value;
      },
    },
    connect() {},
  };
  class Context {
    destination = {};
    currentTime = 0;
    state = 'running';
    createGain() {
      return gain;
    }
    async resume() {
      resumed++;
      this.state = 'running';
    }
    async suspend() {
      suspended++;
      this.state = 'suspended';
    }
    async close() {
      closed++;
      this.state = 'closed';
    }
  }
  globalThis.AudioContext = Context as unknown as typeof AudioContext;
  const timers: { paused: boolean; remove: () => void }[] = [];
  const add = () => {
    const timer = {
      paused: false,
      remove: () => {
        removed++;
      },
    };
    timers.push(timer);
    return timer;
  };
  const scene = {
    time: { delayedCall: add, addEvent: add },
  } as unknown as Phaser.Scene;
  const audio = new SceneAudio(scene);
  try {
    useSettings.getState().setMuted(false);
    useSettings.getState().setVolume(0.7);
    audio.context();
    expect(output).toBe(0.7);
    useSettings.getState().setMuted(true);
    expect(output).toBe(0);
    useSettings.getState().setMuted(false);
    expect(output).toBe(0.7);
    audio.after(() => {}, 100);
    audio.every(() => undefined, 100);
    audio.setPaused(true);
    expect(suspended).toBe(1);
    expect(timers.every((timer) => timer.paused)).toBe(true);
    audio.setPaused(false);
    expect(resumed).toBe(1);
    expect(timers.every((timer) => !timer.paused)).toBe(true);
    audio.destroy();
    expect(closed).toBe(1);
    expect(removed).toBe(2);
    useSettings.getState().setVolume(0.2);
    expect(output).toBe(0.7);
  } finally {
    globalThis.AudioContext = oldContext;
    useSettings.getState().setMuted(settings.muted);
    useSettings.getState().setVolume(settings.volume);
  }
});

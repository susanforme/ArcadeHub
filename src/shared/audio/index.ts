import { Howl, Howler } from 'howler';
import clear from './clear.wav';
import click from './click.wav';
import eat from './eat.wav';
import over from './over.wav';

const sounds = { click, eat, over, clear };
const loaded = new Map<string, Howl>();
function playSource(source: string) {
  let sound = loaded.get(source);
  if (!sound) {
    sound = new Howl({ src: [source], preload: true });
    loaded.set(source, sound);
  }
  sound.play();
}
export const Audio = {
  configure(muted: boolean, volume: number) {
    Howler.mute(muted);
    Howler.volume(volume);
  },
  play(name: keyof typeof sounds) {
    playSource(sounds[name]);
  },
  playAsset(source: string) {
    playSource(source);
  },
  stop() {
    Howler.stop();
  },
};

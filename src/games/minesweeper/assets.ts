import zero from './assets/0.png';
import one from './assets/1.png';
import two from './assets/2.png';
import three from './assets/3.png';
import four from './assets/4.png';
import five from './assets/5.png';
import six from './assets/6.png';
import seven from './assets/7.png';
import eight from './assets/8.png';
import flagSound from './assets/audio/flag.ogg';
import lose from './assets/audio/lose.ogg';
import reveal from './assets/audio/reveal.ogg';
import win from './assets/audio/win.ogg';
import clock from './assets/clock.png';
import flag from './assets/flag.png';
import mine from './assets/mine.png';
import hit from './assets/mine_hit.png';
import covered from './assets/unexplored.png';
export const images = {
  zero,
  one,
  two,
  three,
  four,
  five,
  six,
  seven,
  eight,
  clock,
  flag,
  mine,
  hit,
  covered,
};
export const numbers = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
] as const;
export const sounds = { reveal, flag: flagSound, lose, win };

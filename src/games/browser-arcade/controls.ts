import type { Action, VirtualGamepadConfig } from '../../core/types';
import type { InputManager } from '../../shared/input';
import type { EngineInput, EngineKey } from './types';

export interface ArcadeControls {
  keys: Record<string, Action>;
  tokens: Partial<Record<Action, [string, string]>>;
  buttons: Record<number, Action>;
}
const commonTokens: ArcadeControls['tokens'] = {
  LEFT: ['ArrowLeft', 'ArrowLeft'],
  RIGHT: ['ArrowRight', 'ArrowRight'],
  UP: ['ArrowUp', 'ArrowUp'],
  DOWN: ['ArrowDown', 'ArrowDown'],
  DROP: [' ', 'Space'],
  START: ['Enter', 'Enter'],
};
export function controlsFor(id: string): ArcadeControls {
  const keys: Record<string, Action> = {
    ArrowLeft: 'LEFT',
    KeyA: 'LEFT',
    ArrowRight: 'RIGHT',
    KeyD: 'RIGHT',
    ArrowUp: 'UP',
    KeyW: 'UP',
    ArrowDown: 'DOWN',
    KeyS: 'DOWN',
    Space: 'DROP',
    Enter: 'START',
    Escape: 'PAUSE',
    KeyP: 'PAUSE',
  };
  const tokens = { ...commonTokens };
  const buttons: Record<number, Action> = { 0: 'DROP', 1: 'START', 9: 'PAUSE' };
  if (id === 'lunar-lander') {
    buttons[0] = 'UP';
    buttons[2] = 'DROP';
  }
  if (['breakout', 'pac-man', 'pong'].includes(id)) buttons[0] = 'START';
  if (id === 'asteroids') {
    Object.assign(keys, { ShiftLeft: 'SPECIAL', ShiftRight: 'SPECIAL' });
    tokens.SPECIAL = ['Shift', 'ShiftLeft'];
    buttons[2] = 'SPECIAL';
  }
  if (id === 'defender') {
    Object.assign(keys, {
      KeyA: 'REVERSE',
      KeyD: 'SPECIAL',
      KeyZ: 'SPECIAL',
      KeyH: 'SECONDARY',
      ShiftLeft: 'THRUST',
      ShiftRight: 'THRUST',
    });
    Object.assign(tokens, {
      REVERSE: ['a', 'KeyA'],
      SPECIAL: ['d', 'KeyD'],
      SECONDARY: ['h', 'KeyH'],
      THRUST: ['Shift', 'ShiftLeft'],
    });
    Object.assign(buttons, {
      2: 'SPECIAL',
      3: 'SECONDARY',
      4: 'REVERSE',
      5: 'THRUST',
    });
  }
  if (id === 'gun-fight') {
    Object.assign(keys, {
      KeyF: 'DROP',
      KeyQ: 'AIM_UP',
      KeyE: 'AIM_DOWN',
      KeyM: 'MODE',
      ArrowUp: 'P2_UP',
      ArrowDown: 'P2_DOWN',
      ArrowLeft: 'P2_LEFT',
      ArrowRight: 'P2_RIGHT',
      Comma: 'P2_AIM_UP',
      Period: 'P2_AIM_DOWN',
      Slash: 'P2_FIRE',
    });
    Object.assign(tokens, {
      LEFT: ['a', 'KeyA'],
      RIGHT: ['d', 'KeyD'],
      UP: ['w', 'KeyW'],
      DOWN: ['s', 'KeyS'],
      DROP: ['f', 'KeyF'],
      AIM_UP: ['q', 'KeyQ'],
      AIM_DOWN: ['e', 'KeyE'],
      MODE: ['m', 'KeyM'],
      P2_UP: ['ArrowUp', 'ArrowUp'],
      P2_DOWN: ['ArrowDown', 'ArrowDown'],
      P2_LEFT: ['ArrowLeft', 'ArrowLeft'],
      P2_RIGHT: ['ArrowRight', 'ArrowRight'],
      P2_AIM_UP: [',', 'Comma'],
      P2_AIM_DOWN: ['.', 'Period'],
      P2_FIRE: ['/', 'Slash'],
    });
    Object.assign(buttons, { 2: 'AIM_UP', 3: 'AIM_DOWN', 8: 'MODE' });
  }
  if (id === 'missile-command') {
    Object.assign(keys, {
      Digit1: 'FIRE_LEFT',
      Digit2: 'DROP',
      Digit3: 'FIRE_RIGHT',
    });
    Object.assign(tokens, {
      FIRE_LEFT: ['1', 'Digit1'],
      DROP: ['2', 'Digit2'],
      FIRE_RIGHT: ['3', 'Digit3'],
    });
    Object.assign(buttons, { 2: 'FIRE_LEFT', 3: 'FIRE_RIGHT' });
  }
  return { keys, tokens, buttons };
}
export function controllerFor(id: string): VirtualGamepadConfig {
  const buttons: NonNullable<VirtualGamepadConfig['buttons']> = [
    { id: 'A', action: 'DROP', label: 'controls.fire' },
    { id: 'B', action: 'START', label: 'controls.startRestart' },
  ];
  if (id === 'lunar-lander')
    buttons[0] = { id: 'A', action: 'UP', label: 'controls.thrust' };
  if (id === 'pac-man')
    buttons[0] = { id: 'A', action: 'START', label: 'controls.startRestart' };
  if (id === 'pong')
    buttons[0] = { id: 'A', action: 'START', label: 'controls.startRestart' };
  if (id === 'breakout')
    buttons[0] = { id: 'A', action: 'START', label: 'controls.startRestart' };
  if (id === 'lunar-lander')
    buttons.push({ id: 'X', action: 'DROP', label: 'controls.abort' });
  if (id === 'asteroids')
    buttons.push({ id: 'X', action: 'SPECIAL', label: 'controls.hyperspace' });
  if (id === 'defender')
    buttons.push(
      { id: 'X', action: 'SPECIAL', label: 'controls.smartBomb' },
      { id: 'Y', action: 'SECONDARY', label: 'controls.hyperspace' },
      { id: 'L', action: 'REVERSE', label: 'controls.reverse' },
      { id: 'R', action: 'THRUST', label: 'controls.thrust' },
    );
  if (id === 'gun-fight')
    buttons.push(
      { id: 'X', action: 'AIM_UP', label: 'controls.aimUp' },
      { id: 'Y', action: 'AIM_DOWN', label: 'controls.aimDown' },
      { id: 'L', action: 'MODE', label: 'controls.switchPlayers' },
    );
  if (id === 'missile-command')
    buttons.push(
      { id: 'X', action: 'FIRE_LEFT', label: 'controls.leftBattery' },
      { id: 'Y', action: 'FIRE_RIGHT', label: 'controls.rightBattery' },
    );
  return {
    directions:
      id === 'pong'
        ? ['UP', 'DOWN']
        : id === 'breakout'
          ? ['LEFT', 'RIGHT']
          : ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    directionMode: id === 'pac-man' ? 'four-way' : 'eight-way',
    buttons,
  };
}
export class EngineInputBridge {
  private held = new Set<Action>();
  constructor(
    private input: EngineInput,
    private mapping: ArcadeControls['tokens'],
  ) {}
  private event(action: Action): EngineKey {
    const [key, code] = this.mapping[action] ?? ['', ''];
    return { key, code, repeat: false, preventDefault() {} };
  }
  tick(controls: InputManager) {
    for (const action of Object.keys(this.mapping) as Action[]) {
      const tapped = controls.consume(action);
      const active = controls.down(action) || tapped;
      if (active && !this.held.has(action)) {
        this.input.keyDown(this.event(action));
        this.held.add(action);
      } else if (!active && this.held.delete(action))
        this.input.keyUp(this.event(action));
    }
  }
  reset() {
    for (const action of this.held) this.input.keyUp(this.event(action));
    this.held.clear();
    for (const key of [
      'keysDown',
      'keysJustPressed',
      'keys',
      'justPressedKeys',
      '_keys',
      '_keyDownBuffer',
      '_prevKeys',
      '_prev',
      '_justPressed',
      'justPressed',
    ]) {
      const value = this.input[key];
      if (value instanceof Set) value.clear();
      else if (value && typeof value === 'object')
        for (const entry of Object.keys(value))
          delete (value as Record<string, unknown>)[entry];
    }
  }
}

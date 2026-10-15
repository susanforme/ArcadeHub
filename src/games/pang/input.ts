import type { InputManager } from '../../shared/input';
import type { PangInput } from './logic';

export function readPangInput(
  controls: Pick<InputManager, 'consume' | 'down'>,
  tapStart = false,
): PangInput & { restart: boolean } {
  const startPressed = controls.consume('START');
  const firePressed = controls.consume('DROP');
  return {
    horizontal: Number(controls.down('RIGHT')) - Number(controls.down('LEFT')),
    vertical: Number(controls.down('DOWN')) - Number(controls.down('UP')),
    fire: controls.down('DROP'),
    start: startPressed || tapStart,
    restart: startPressed || firePressed,
  };
}

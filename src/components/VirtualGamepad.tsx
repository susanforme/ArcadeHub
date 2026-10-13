import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  Action,
  Direction,
  GamepadPosition,
  VirtualGamepadConfig,
} from '../core/types';
import { Input } from '../shared/input';
import { padDirections, VirtualInput } from '../shared/input/virtual';
import styles from './VirtualGamepad.module.css';

const symbols: Record<Direction, string> = {
  UP: '▲',
  DOWN: '▼',
  LEFT: '◀',
  RIGHT: '▶',
};
const labels: Record<Direction, string> = {
  UP: '向上',
  DOWN: '向下',
  LEFT: '向左',
  RIGHT: '向右',
};
const defaults: Record<'dpad' | 'A' | 'B', GamepadPosition> = {
  dpad: { anchor: 'bottom-left', x: 16, y: 16, size: 132 },
  A: { anchor: 'bottom-right', x: 92, y: 64, size: 60 },
  B: { anchor: 'bottom-right', x: 16, y: 16, size: 60 },
};
function positionStyle(
  config: VirtualGamepadConfig,
  id: 'dpad' | 'A' | 'B',
): CSSProperties {
  const style: Record<string, string | number> = {};
  for (const orientation of ['portrait', 'landscape'] as const) {
    const position = { ...defaults[id], ...config.layout?.[orientation]?.[id] };
    for (const edge of ['top', 'bottom', 'left', 'right']) {
      style[`--${orientation}-${edge}`] = position.anchor.includes(edge)
        ? `calc(${edge === 'left' || edge === 'right' ? position.x : position.y}px + env(safe-area-inset-${edge}, 0px))`
        : 'auto';
    }
    style[`--${orientation}-size`] = `${position.size}px`;
  }
  return style as CSSProperties;
}

export function VirtualGamepad({
  config,
  disabled,
}: {
  config: VirtualGamepadConfig;
  disabled: boolean;
}) {
  const controller = useRef<VirtualInput | null>(null);
  const pointers = useRef(new Set<number>());
  const [active, setActive] = useState(new Set<Action>());
  const mode = config.directionMode ?? 'four-way';
  useEffect(() => {
    if (disabled || !Input.current) return;
    const input = new VirtualInput(Input.current, mode, (actions, reset) => {
      if (reset) pointers.current.clear();
      setActive(actions);
    });
    controller.current = input;
    const clear = () => {
      input.clear();
      pointers.current.clear();
    };
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener('blur', clear);
    window.addEventListener('resize', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      input.destroy();
      controller.current = null;
      pointers.current.clear();
      window.removeEventListener('blur', clear);
      window.removeEventListener('resize', clear);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [disabled, mode]);
  const press = (
    event: PointerEvent<HTMLElement>,
    action: Action,
    capture = event.currentTarget,
    directional = false,
  ) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0))
      return;
    event.preventDefault();
    capture.setPointerCapture(event.pointerId);
    pointers.current.add(event.pointerId);
    controller.current?.set(
      `pointer:${event.pointerId}`,
      [action],
      directional,
    );
  };
  const release = (event: PointerEvent<HTMLElement>) => {
    pointers.current.delete(event.pointerId);
    controller.current?.release(`pointer:${event.pointerId}`);
  };
  const keyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    action: Action,
    directional: boolean,
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat && !disabled)
      controller.current?.set(
        `button:${action}:${event.code}`,
        [action],
        directional,
      );
  };
  const keyUp = (event: KeyboardEvent<HTMLButtonElement>, action: Action) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    controller.current?.release(`button:${action}:${event.code}`);
  };
  const buttonProps = (action: Action, directional = false) => ({
    disabled,
    'aria-pressed': !disabled && active.has(action),
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
      keyDown(event, action, directional),
    onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => keyUp(event, action),
    onBlur: () => {
      controller.current?.release(`button:${action}:Enter`);
      controller.current?.release(`button:${action}:Space`);
    },
    // Assistive technologies can activate a button without pointer/key events.
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.detail === 0 && !disabled) {
        controller.current?.set('activation', [action], directional);
        controller.current?.release('activation');
      }
    },
  });
  return (
    <section
      className={styles.pad}
      aria-label="虚拟手柄"
      style={{ '--pad-opacity': config.opacity ?? 0.65 } as CSSProperties}
    >
      {!!config.directions?.length && (
        <fieldset
          className={`${styles.position} ${styles.dpad}`}
          style={positionStyle(config, 'dpad')}
          aria-label="方向键"
          onPointerMove={(event) => {
            if (!pointers.current.has(event.pointerId)) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const actions = padDirections(
              (event.clientX - rect.left - rect.width / 2) / (rect.width / 2),
              (event.clientY - rect.top - rect.height / 2) / (rect.height / 2),
              mode,
            ).filter((action) => config.directions?.includes(action));
            controller.current?.set(`pointer:${event.pointerId}`, actions);
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          {config.directions.map((action) => (
            <button
              type="button"
              key={action}
              className={`${styles.direction} ${styles[action]}`}
              aria-label={labels[action]}
              {...buttonProps(action, true)}
              onPointerDown={(event) =>
                press(
                  event,
                  action,
                  event.currentTarget.parentElement ?? event.currentTarget,
                  true,
                )
              }
            >
              {symbols[action]}
            </button>
          ))}
        </fieldset>
      )}
      {config.buttons?.map(({ id, action, label, color }) => (
        <button
          type="button"
          key={id}
          className={`${styles.position} ${styles.action} ${styles[id]}`}
          style={
            {
              ...positionStyle(config, id),
              ...(color ? { '--button-color': color } : {}),
            } as CSSProperties
          }
          aria-label={`${id}：${label}`}
          {...buttonProps(action)}
          onPointerDown={(event) => press(event, action)}
        >
          <span>{id}</span>
          <small>{label}</small>
        </button>
      ))}
    </section>
  );
}

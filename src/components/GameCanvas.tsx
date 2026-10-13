import { useEffect, useRef, useState } from 'react';
import styles from '../app/App.module.css';
import { events } from '../core/event-bus';
import { runtime } from '../core/game-runtime';
import type { GameManifest, SessionState } from '../core/types';
import { Input } from '../shared/input';

export function GameCanvas({
  game,
  resume,
  onState,
  bestScore,
}: {
  game: GameManifest;
  resume: boolean;
  bestScore: number;
  onState: (state: SessionState) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const ownsFullscreen = useRef(false);
  const fullscreenSupported =
    !!document.documentElement.requestFullscreen && document.fullscreenEnabled;
  const parent = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<SessionState>({
    status: 'loading',
    score: 0,
  });
  const [error, setError] = useState('');
  useEffect(() => {
    const unsubscribe = events.on('state', (state) => {
      setState(state);
      onState(state);
    });
    if (parent.current)
      void runtime
        .start(parent.current, game, resume)
        .catch((error) =>
          setError(error instanceof Error ? error.message : '游戏加载失败'),
        );
    container.current?.focus();
    return () => {
      unsubscribe();
      runtime.stop();
    };
  }, [game, resume, onState]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  useEffect(() => {
    const change = () => {
      setFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) ownsFullscreen.current = false;
    };
    document.addEventListener('fullscreenchange', change);
    return () => {
      document.removeEventListener('fullscreenchange', change);
      if (ownsFullscreen.current && document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
    };
  }, []);
  const toggleFullscreen = async () => {
    setFullscreenError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        setExpanded(true);
        await document.documentElement.requestFullscreen();
        ownsFullscreen.current = true;
      }
      container.current?.focus();
    } catch {
      setFullscreenError('无法进入浏览器全屏，请检查浏览器权限或使用 F11。');
    }
  };
  const toggleExpanded = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        setFullscreenError('无法退出浏览器全屏，请按 Esc 后重试。');
        return;
      }
    }
    setExpanded(!expanded);
    container.current?.focus();
  };
  return (
    <div
      className={`${styles.gamePlayer} ${expanded ? styles.expandedPlayer : ''}`}
    >
      <header className={styles.playerToolbar}>
        <div className={styles.playerSummary}>
          <b>{game.name}</b>
          <span>
            得分 <strong>{state.score}</strong>
          </span>
          <span>最高 {Math.max(bestScore, state.score)}</span>
        </div>
        <div className={styles.playerActions}>
          <button
            type="button"
            disabled={state.status === 'loading' || state.status === 'over'}
            onClick={() => {
              events.emit('pause', undefined);
              container.current?.focus();
            }}
          >
            {state.status === 'paused' ? '继续' : '暂停'}
          </button>
          <button
            type="button"
            aria-pressed={expanded}
            onClick={() => void toggleExpanded()}
          >
            {expanded ? '切回小屏' : '网页全屏'}
          </button>
          <button
            type="button"
            disabled={!fullscreenSupported}
            title={fullscreenSupported ? undefined : '当前浏览器不支持全屏 API'}
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? '退出浏览器全屏' : '浏览器全屏'}
          </button>
          <a href="#/">返回大厅</a>
        </div>
      </header>
      {fullscreenError && (
        <p className={styles.error} role="alert">
          {fullscreenError}
        </p>
      )}
      <section
        className={styles.gameStage}
        ref={container}
        tabIndex={-1}
        aria-label={`${game.name}游戏区域`}
      >
        <div className={styles.canvas} ref={parent} />
        {(state.status !== 'playing' || error) && (
          <div className={styles.overlay}>
            <span className={styles.eyebrow}>{game.subtitle}</span>
            <h2>
              {error
                ? '加载失败'
                : state.status === 'loading'
                  ? '正在准备游戏…'
                  : state.status === 'paused'
                    ? '休息一下'
                    : '下次一定更高分'}
            </h2>
            <p>
              {error ||
                (state.status === 'paused'
                  ? '暂停时自动保存进度，准备好就继续。'
                  : state.status === 'over'
                    ? `${state.message} · 得分 ${state.score}`
                    : '马上就好，精彩即将开始。')}
            </p>
            {state.status === 'paused' && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  events.emit('pause', undefined);
                  container.current?.focus();
                }}
              >
                继续游戏 →
              </button>
            )}
            {state.status === 'over' && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  events.emit('restart', undefined);
                  container.current?.focus();
                }}
              >
                再玩一次 →
              </button>
            )}
            {error && (
              <button type="button" onClick={() => window.location.reload()}>
                重新加载
              </button>
            )}
          </div>
        )}
      </section>
      <section className={styles.touchControls} aria-label="触屏控制">
        {game.touchControls.map(({ action, label, symbol }) => (
          <button
            type="button"
            key={action}
            aria-label={label}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              Input.current?.press(action);
            }}
            onPointerUp={() => Input.current?.release(action)}
            onPointerCancel={() => Input.current?.release(action)}
            onLostPointerCapture={() => Input.current?.release(action)}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !event.repeat)
                Input.current?.press(action);
            }}
            onKeyUp={() => Input.current?.release(action)}
          >
            {symbol}
          </button>
        ))}
      </section>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import styles from '../app/App.module.css';
import { events } from '../core/event-bus';
import { runtime } from '../core/game-runtime';
import type { GameManifest, SessionState } from '../core/types';
import { useI18n } from '../i18n';
import { VirtualGamepad } from './VirtualGamepad';

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
  const { t, text } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const [showGamepad, setShowGamepad] = useState(
    () =>
      window.matchMedia('(any-pointer: coarse)').matches ||
      navigator.maxTouchPoints > 0,
  );
  const gamepad = game.virtualGamepad;
  const gamepadEnabled = showGamepad && !!gamepad;

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
          setError(error instanceof Error ? error.message : 'errors.gameLoad'),
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
      setFullscreenError('errors.enterFullscreen');
    }
  };
  const toggleExpanded = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        setFullscreenError('errors.exitFullscreen');
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
          <b>{t(game.name)}</b>
          <span>
            {t('game.score')} <strong>{state.score}</strong>
          </span>
          <span>
            {t('game.best')} {Math.max(bestScore, state.score)}
          </span>
        </div>
        <div className={styles.playerActions}>
          {gamepad && (
            <button
              type="button"
              aria-pressed={showGamepad}
              onClick={() => {
                setShowGamepad(!showGamepad);
                container.current?.focus();
              }}
            >
              {showGamepad ? t('player.hideGamepad') : t('player.showGamepad')}
            </button>
          )}
          <button
            type="button"
            disabled={state.status === 'loading' || state.status === 'over'}
            onClick={() => {
              events.emit('pause', undefined);
              container.current?.focus();
            }}
          >
            {state.status === 'paused' ? t('player.resume') : t('player.pause')}
          </button>
          <button
            type="button"
            aria-pressed={expanded}
            onClick={() => void toggleExpanded()}
          >
            {expanded ? t('player.smallScreen') : t('player.expand')}
          </button>
          <button
            type="button"
            disabled={!fullscreenSupported}
            title={
              fullscreenSupported
                ? undefined
                : t('errors.fullscreenUnsupported')
            }
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? t('player.exitFullscreen') : t('player.fullscreen')}
          </button>
          <a href="#/">{t('navigation.back')}</a>
        </div>
      </header>
      {fullscreenError && (
        <p className={styles.error} role="alert">
          {text(fullscreenError)}
        </p>
      )}
      <section
        className={styles.gameStage}
        ref={container}
        tabIndex={-1}
        aria-label={t('game.areaLabel', { name: t(game.name) })}
      >
        <div className={styles.canvas} ref={parent} />
        {gamepadEnabled && (
          <VirtualGamepad
            config={gamepad}
            disabled={state.status !== 'playing' || !!error}
          />
        )}
        {(state.status !== 'playing' || error) && (
          <div className={styles.overlay}>
            <span className={styles.eyebrow}>{t(game.subtitle)}</span>
            <h2>
              {error
                ? t('player.loadFailed')
                : state.status === 'loading'
                  ? t('player.loadingTitle')
                  : state.status === 'paused'
                    ? t('player.pausedTitle')
                    : t('player.gameOverTitle')}
            </h2>
            <p>
              {text(error) ||
                (state.status === 'paused'
                  ? t('player.pausedDescription')
                  : state.status === 'over'
                    ? `${text(state.message ?? 'game.gameOver')} · ${t('game.score')} ${state.score}`
                    : t('player.loadingDescription'))}
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
                {t('game.resumeAction')}{' '}
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
                {t('game.playAgainAction')}{' '}
              </button>
            )}
            {error && (
              <button type="button" onClick={() => window.location.reload()}>
                {t('player.reload')}{' '}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

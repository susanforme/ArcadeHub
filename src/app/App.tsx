import { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from '../components/GameCanvas';
import { GameList } from '../components/GameList';
import { Icon } from '../components/Icon';
import { LanguageSelect } from '../components/LanguageSelect';
import { events } from '../core/event-bus';
import { games } from '../core/game-registry';
import type { GameManifest, SessionState } from '../core/types';
import { useI18n } from '../i18n';
import { translate } from '../i18n/translate';
import { Audio } from '../shared/audio';
import { registerOfflineWorker, requestOffline } from '../shared/offline';
import { type GameSave, listSaves } from '../shared/storage';
import styles from './App.module.css';
import snakeCartridge from './assets/snake-cartridge.webp';
import { useRoute } from './router';
import { useSettings } from './store';

function GameDetail({ game, save }: { game: GameManifest; save?: GameSave }) {
  const { t, text } = useI18n();
  const [run, setRun] = useState<{ resume: boolean } | null>(null);
  const [state, setState] = useState<SessionState>({
    score: 0,
    status: 'loading',
  });
  const onState = useCallback((state: SessionState) => setState(state), []);
  const start = (resume: boolean) => {
    Audio.play('click');
    setRun({ resume });
  };
  return (
    <>
      <a className={styles.back} href="#/">
        {t('navigation.backToLibrary')}{' '}
      </a>
      <div className={styles.detailHeading}>
        <div>
          <span className={styles.eyebrow}>
            {t(game.subtitle)} / {t(game.category)}
          </span>
          <h1>
            {t(game.name)}
            <span className={styles.headingDot}>.</span>
          </h1>
        </div>
        <span className={styles.pill}>
          {game.localPlayers === 2
            ? t('game.oneOrTwoPlayers')
            : t('game.singlePlayer')}{' '}
          {t('game.offline')}{' '}
        </span>
      </div>
      <div className={styles.detailGrid}>
        <div>
          {run ? (
            <GameCanvas
              game={game}
              resume={run.resume}
              onState={onState}
              bestScore={save?.bestScore ?? 0}
            />
          ) : (
            <div className={styles.startStage}>
              <img
                src={game.cover}
                alt={t('game.imageAlt', { name: t(game.name) })}
              />
              <div className={styles.startActions}>
                {save?.snapshot != null && (
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => start(true)}
                  >
                    {t('game.resumeLast')}{' '}
                  </button>
                )}
                <button
                  type="button"
                  className={
                    save?.snapshot != null ? styles.secondary : styles.primary
                  }
                  onClick={() => start(false)}
                >
                  {t('game.startNew')}{' '}
                </button>
              </div>
            </div>
          )}
        </div>
        <aside className={styles.gameInfo}>
          <div className={styles.scoreCard}>
            <span>{t('game.currentScore')}</span>
            <strong>{state.score.toLocaleString()}</strong>
            <div>
              <span>{t('game.highScore')}</span>
              <b>
                {Math.max(save?.bestScore ?? 0, state.score).toLocaleString()}
              </b>
            </div>
          </div>
          <h3>{t('game.howToPlay')}</h3>
          <div className={styles.controlList}>
            {game.controls.map((control) => (
              <div key={control.key}>
                <span>{t(control.description)}</span>
                <kbd>{text(control.key)}</kbd>
              </div>
            ))}
          </div>
          <p className={styles.helper}>{t('game.controlsHint')}</p>
          <h3>{t('game.about')}</h3>
          <p>{t(game.description)}</p>
          {game.source && (
            <p className={styles.helper}>
              {t('game.sourceLabel')}{' '}
              <a href={game.source} target="_blank" rel="noreferrer">
                {game.source.replace('https://github.com/', '')} ↗
              </a>
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

export default function App() {
  const { t, text, language } = useI18n();
  const route = useRoute();
  const { muted, volume, setMuted, setVolume, favoriteIds } = useSettings();
  const [saves, setSaves] = useState<GameSave[]>([]);
  const [storageError, setStorageError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('categories.all');
  const [offlineReady, setOfflineReady] = useState(false);
  const [offlineWorker, setOfflineWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [offlineState, setOfflineState] = useState<
    'loading' | 'idle' | 'caching' | 'error' | 'unavailable'
  >('loading');
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = `ArcadeHub · ${t('library.readyBadge').replace('✦ ', '')}`;
  }, [language, t]);
  const refresh = useCallback(() => {
    void listSaves()
      .then(setSaves)
      .catch(() => setStorageError('errors.saveRead'));
  }, []);
  useEffect(() => {
    refresh();
    const unsubscribe = events.on('saved', refresh);
    const error = events.on('storageError', setStorageError);
    return () => {
      unsubscribe();
      error();
    };
  }, [refresh]);
  useEffect(() => {
    Audio.configure(muted, volume);
  }, [muted, volume]);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      setOfflineState('unavailable');
      return;
    }
    let disposed = false;
    const refreshOffline = async () => {
      try {
        const worker = await registerOfflineWorker();
        const ready = await requestOffline(worker, 'OFFLINE_STATUS');
        if (!disposed) {
          setOfflineWorker(worker);
          setOfflineReady(ready);
          setOfflineState('idle');
        }
      } catch {
        if (!disposed) setOfflineState('unavailable');
      }
    };
    void refreshOffline();
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      refreshOffline,
    );
    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        refreshOffline,
      );
    };
  }, []);
  const cacheOffline = async () => {
    if (!offlineWorker || offlineState === 'caching') return;
    setOfflineState('caching');
    try {
      const ready = await requestOffline(offlineWorker, 'CACHE_OFFLINE');
      setOfflineReady(ready);
      setOfflineState(ready ? 'idle' : 'error');
    } catch {
      setOfflineState('error');
    }
  };
  const currentGame = route.startsWith('/game/')
    ? games.find((game) => game.id === route.slice(6))
    : undefined;
  const filtered = games.filter(
    (game) =>
      (category === 'categories.all' ||
        (category === 'favorites.title'
          ? favoriteIds.includes(game.id)
          : game.category === category)) &&
      `${translate(game.name, 'zh')} ${translate(game.name, 'en')} ${translate(game.subtitle, 'en')}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const nav = [
    { href: '/', name: 'navigation.library' },
    { href: '/saves', name: 'navigation.saves' },
    { href: '/settings', name: 'navigation.settings' },
  ] as const;
  const lastSave = [...saves]
    .filter(
      (save) =>
        save.snapshot != null && games.some((game) => game.id === save.id),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const lastGame = games.find((game) => game.id === lastSave?.id);
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <a href="#/" className={styles.brand} aria-label="ArcadeHub">
          <span className={styles.brandIcon}>
            <Icon name="games" size={25} />
          </span>
          arcade<span>hub</span>
        </a>
        <span className={styles.mastheadNote}>
          PLAY SMALL GAMES.
          <br />
          LIVE HAPPIER.
        </span>
        <nav className={styles.navigation} aria-label={t('navigation.main')}>
          {nav.map((item) => (
            <a
              key={item.href}
              href={`#${item.href}`}
              className={`${styles.navLink} ${route === item.href || (item.href === '/' && currentGame) ? styles.active : ''}`}
              aria-current={
                route === item.href || (item.href === '/' && currentGame)
                  ? 'page'
                  : undefined
              }
            >
              {t(item.name)}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <LanguageSelect />
          <button
            type="button"
            className={styles.soundButton}
            aria-label={muted ? t('audio.enable') : t('audio.disable')}
            aria-pressed={!muted}
            onClick={() => setMuted(!muted)}
          >
            <Icon name="sound" size={18} />
            {muted ? t('audio.off') : t('audio.on')}
          </button>
        </div>
        <span className={styles.mastheadEnd}>
          GOOD GAMES.
          <br />
          BETTER DAYS.
        </span>
      </header>
      <div
        className={`${styles.workspace} ${route === '/' ? styles.withSidebar : ''}`}
      >
        {route === '/' && (
          <aside className={styles.sidebar}>
            <h2>{t('sidebar.tagline')}</h2>
            <nav
              className={styles.categoryNav}
              aria-label={t('library.categories')}
            >
              {(
                [
                  'categories.all',
                  'favorites.title',
                  'categories.arcade',
                  'categories.puzzle',
                ] as const
              ).map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={category === item}
                  className={category === item ? styles.selected : ''}
                  onClick={() => setCategory(item)}
                >
                  <Icon
                    name={
                      item === 'favorites.title'
                        ? 'heart'
                        : item === 'categories.puzzle'
                          ? 'settings'
                          : 'games'
                    }
                    size={24}
                  />
                  {t(item)}
                  {item === 'categories.all' && (
                    <span className={styles.count}>{games.length}</span>
                  )}
                </button>
              ))}
            </nav>
            {lastGame && (
              <section className={styles.resumeSection}>
                <h2>{t('library.resume.title')}</h2>
                <a
                  className={styles.continueCard}
                  href={`#/game/${lastGame.id}`}
                >
                  <img src={lastGame.cover} alt="" />
                  <div>
                    <b>{t(lastGame.name)}</b>
                    <span>
                      {t('library.resume.lastScore')} {lastSave.score}
                    </span>
                    <span className={styles.resumeAction}>
                      {t('game.resume')}
                      <Icon name="arrow" size={16} />
                    </span>
                  </div>
                </a>
              </section>
            )}
            <div className={styles.sidebarBottom}>
              <p>
                A SMALL GAME.
                <br />A BRIGHTER YOU.
              </p>
              <span className={styles.localBadge}>
                {offlineReady ? t('offline.ready') : t('sidebar.noAccount')}
              </span>
            </div>
          </aside>
        )}
        <main className={styles.main}>
          {storageError && (
            <p className={styles.error} role="alert">
              {text(storageError)}
            </p>
          )}
          {route === '/' ? (
            <>
              <section className={styles.hero}>
                <div className={styles.heroCopy}>
                  <div className={styles.edition}>
                    <span>{t('library.eyebrow')}</span>
                  </div>
                  <h1>
                    <span>{t('library.hero.titleFirst')}</span>
                    {t('library.hero.titleSecond')}
                  </h1>
                  <div className={styles.heroFootnote}>
                    <span>{t('library.hero.badge')}</span>
                    <p>{t('library.hero.descriptionFirst')}</p>
                    <small>THE ARCADE EDIT.</small>
                  </div>
                </div>
                <div className={styles.featuredGame}>
                  <a href="#/game/snake" className={styles.heroArt}>
                    <img
                      src={snakeCartridge}
                      alt={t('library.hero.imageAlt')}
                      fetchPriority="high"
                    />
                  </a>
                  <div className={styles.featuredCaption}>
                    <div>
                      <b>{t('games.snake.name')}</b>
                      <span>{t('categories.arcade')}</span>
                      <p>{t('library.hero.descriptionSecond')}</p>
                    </div>
                    <a className={styles.primary} href="#/game/snake">
                      {t('library.hero.playSnake')}
                      <Icon name="arrow" size={21} />
                    </a>
                  </div>
                </div>
              </section>
              <section className={styles.library}>
                <div className={styles.libraryHeading}>
                  <h2>
                    {t(
                      category === 'favorites.title'
                        ? 'favorites.title'
                        : 'library.collection',
                    )}{' '}
                    <span>{filtered.length.toString().padStart(2, '0')}</span>
                  </h2>
                  <label className={styles.search}>
                    <Icon name="search" size={17} />
                    <input
                      aria-label={t('library.searchLabel')}
                      placeholder={t('library.searchPlaceholder')}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                </div>
                <GameList games={filtered} saves={saves} />
              </section>
            </>
          ) : currentGame ? (
            <GameDetail
              key={currentGame.id}
              game={currentGame}
              save={saves.find((save) => save.id === currentGame.id)}
            />
          ) : route === '/settings' ? (
            <>
              <span className={styles.eyebrow}>{t('settings.eyebrow')}</span>
              <h1>{t('settings.title')}</h1>
              <p>{t('settings.savedLocally')}</p>
              <section className={styles.settingsPanel}>
                <div>
                  <div>
                    <h3>{t('settings.languageLabel')}</h3>
                    <p>{t('settings.languageHint')}</p>
                  </div>
                  <LanguageSelect />
                </div>
                <div>
                  <div>
                    <h3>{t('settings.audio')}</h3>
                    <p>{t('settings.audioHint')}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondary}
                    aria-pressed={!muted}
                    onClick={() => setMuted(!muted)}
                  >
                    {muted ? t('common.disabled') : t('common.enabled')}
                  </button>
                </div>
                <div>
                  <label htmlFor="volume">{t('settings.volume')}</label>
                  <input
                    id="volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                  />
                  <span>{Math.round(volume * 100)}%</span>
                </div>
                <p>{t('saves.storageHint')} </p>
                <div className={styles.offlineControls}>
                  <div>
                    <h3>{t('offline.title')}</h3>
                    <p>{t('offline.instructions')}</p>
                    <p>{t('offline.updateHint')}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={
                      offlineState === 'loading' ||
                      offlineState === 'caching' ||
                      offlineState === 'unavailable'
                    }
                    onClick={() => void cacheOffline()}
                  >
                    {offlineState === 'caching'
                      ? t('offline.caching')
                      : offlineReady
                        ? t('offline.recache')
                        : t('offline.cacheAction')}
                  </button>
                </div>
                <p role="status" aria-live="polite">
                  {offlineState === 'error'
                    ? t('offline.failed')
                    : offlineState === 'unavailable'
                      ? t('offline.unavailable')
                      : offlineState === 'caching'
                        ? t('offline.cachingHint')
                        : offlineState === 'loading'
                          ? t('offline.checking')
                          : offlineReady
                            ? t('offline.cached')
                            : t('offline.notCached')}
                </p>
              </section>
            </>
          ) : route === '/saves' ? (
            <>
              <span className={styles.eyebrow}>{t('saves.eyebrow')}</span>
              <h1>{t('saves.title')}</h1>
              <p>{t('saves.description')}</p>
              <div className={styles.saveList}>
                {saves.length ? (
                  saves.map((save) => (
                    <article key={save.id} className={styles.saveCard}>
                      <Icon name="save" size={28} />
                      <div>
                        <h3>
                          {text(
                            games.find((game) => game.id === save.id)?.name ??
                              save.id,
                          )}
                        </h3>
                        <p>
                          {t('game.highScore')} {save.bestScore}{' '}
                          {t('saves.recentScore')} {save.score}
                        </p>
                        <small>
                          {new Date(save.updatedAt).toLocaleString(
                            language === 'zh' ? 'zh-CN' : 'en-US',
                          )}
                        </small>
                      </div>
                      {games.some((game) => game.id === save.id) && (
                        <a
                          className={styles.secondary}
                          href={`#/game/${save.id}`}
                        >
                          {save.snapshot != null
                            ? t('game.resume')
                            : t('game.playAgain')}{' '}
                          →
                        </a>
                      )}
                    </article>
                  ))
                ) : (
                  <div className={styles.empty}>
                    <Icon name="save" size={40} />
                    <h3>{t('saves.empty.title')}</h3>
                    <p>{t('saves.empty.description')}</p>
                    <a className={styles.primary} href="#/">
                      {t('navigation.openLibrary')}{' '}
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <h1>{t('game.notFound')}</h1>
              <a href="#/" className={styles.primary}>
                {t('navigation.backAction')}{' '}
              </a>
            </div>
          )}
          <footer className={styles.footer}>
            <span>
              © {new Date().getFullYear()} ArcadeHub · THE ARCADE EDIT.
            </span>
            <span>
              {t('footer.tagline')} <span>↗</span>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

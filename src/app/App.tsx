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
import { type GameSave, listSaves } from '../shared/storage';
import styles from './App.module.css';
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
  const { muted, volume, setMuted, setVolume } = useSettings();
  const [saves, setSaves] = useState<GameSave[]>([]);
  const [storageError, setStorageError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('categories.all');
  const [offlineReady, setOfflineReady] = useState(false);
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
    )
      return;
    void navigator.serviceWorker
      .register('/sw.js')
      .then(async () => {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) setOfflineReady(true);
      })
      .catch(() => setOfflineReady(false));
  }, []);
  const currentGame = route.startsWith('/game/')
    ? games.find((game) => game.id === route.slice(6))
    : undefined;
  const filtered = games.filter(
    (game) =>
      (category === 'categories.all' || game.category === category) &&
      `${translate(game.name, 'zh')} ${translate(game.name, 'en')} ${translate(game.subtitle, 'en')}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const nav = [
    { href: '/', name: 'navigation.library', icon: 'games' },
    { href: '/saves', name: 'navigation.saves', icon: 'save' },
    { href: '/settings', name: 'navigation.settings', icon: 'settings' },
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
      <aside className={styles.sidebar}>
        <a href="#/" className={styles.brand}>
          <span className={styles.brandIcon}>
            <Icon name="games" size={25} />
          </span>
          arcade<span>hub</span>
          <sup>®</sup>
        </a>
        <span className={styles.navLabel}>{t('sidebar.tagline')}</span>
        <nav>
          {nav.map((item) => (
            <a
              key={item.href}
              className={`${styles.navLink} ${route === item.href || (item.href === '/' && currentGame) ? styles.active : ''}`}
              href={`#${item.href}`}
            >
              <Icon name={item.icon} />
              {t(item.name)}
              {item.href === '/' && (
                <span className={styles.count}>
                  {games.length.toString().padStart(2, '0')}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.localBadge}>
            <span className={styles.liveDot} />
            {offlineReady ? t('offline.ready') : t('sidebar.localBadge')}
          </div>
          <p>
            {t('sidebar.noAccount')} <br />
            {t('sidebar.keepRecords')}{' '}
          </p>
          <div className={styles.profile}>
            <span>{t('sidebar.player')}</span>
            <div>
              <b>{t('sidebar.localPlayer')}</b>
              <small>{t('sidebar.playerHint')}</small>
            </div>
            <span className={styles.profileDot} />
          </div>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <span>{t('library.tagline')}</span>
          <div>
            <LanguageSelect />
            <span className={styles.localLabel}>
              <span className={styles.liveDot} /> {t('offline.localMode')}{' '}
            </span>
            <button
              type="button"
              className={styles.soundButton}
              aria-label={muted ? t('audio.enable') : t('audio.disable')}
              aria-pressed={!muted}
              onClick={() => setMuted(!muted)}
            >
              <Icon name="sound" />
              {muted ? t('audio.off') : t('audio.on')}
            </button>
          </div>
        </header>
        <main className={styles.main}>
          {storageError && (
            <p className={styles.error} role="alert">
              {text(storageError)}
            </p>
          )}
          {route === '/' ? (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <span className={styles.eyebrow}>
                    {t('library.eyebrow')}{' '}
                  </span>
                  <h1>
                    {t('library.title')}
                    <span className={styles.headingDot}>
                      {t('common.questionMark')}
                    </span>
                  </h1>
                  <p>{t('library.subtitle')}</p>
                </div>
                <span className={styles.pill}>{t('library.readyBadge')}</span>
              </div>
              <section className={styles.hero}>
                <div className={styles.heroCopy}>
                  <span className={styles.heroTag}>
                    {t('library.hero.badge')}
                  </span>
                  <h2>
                    {t('library.hero.titleFirst')} <br />
                    {t('library.hero.titleSecond')}
                    <span>{t('common.fullStop')}</span>
                  </h2>
                  <p>
                    {t('library.hero.descriptionFirst')} <br />
                    {t('library.hero.descriptionSecond')}{' '}
                  </p>
                  <a className={styles.primary} href="#/game/snake">
                    {t('library.hero.playSnake')}{' '}
                    <Icon name="arrow" size={18} />
                  </a>
                  <span className={styles.heroFootnote}>
                    {t('library.hero.features')}{' '}
                  </span>
                </div>
                <div className={styles.heroArt}>
                  <img
                    src={games.find((game) => game.id === 'snake')?.cover}
                    alt={t('library.hero.imageAlt')}
                  />
                  <span className={styles.artSticker}>
                    {t('library.hero.stickerFirst')} <br />
                    {t('library.hero.stickerSecond')}{' '}
                  </span>
                  <span className={styles.artCaption}>
                    {t('library.hero.caption')}
                  </span>
                </div>
              </section>
              {lastGame && (
                <a
                  className={styles.continueCard}
                  href={`#/game/${lastGame.id}`}
                >
                  <span className={styles.continueIcon}>↩</span>
                  <div>
                    <b>{t('library.resume.title')}</b>
                    <span>
                      {t(lastGame.name)} {t('library.resume.lastScore')}{' '}
                      {lastSave.score}
                    </span>
                  </div>
                  <span>{t('game.resumeAction')}</span>
                </a>
              )}
              <section className={styles.library}>
                <div className={styles.libraryHeading}>
                  <h2>
                    {t('library.collection')}{' '}
                    <span>{games.length.toString().padStart(2, '0')}</span>
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
                <div className={styles.filters}>
                  {(
                    [
                      'categories.all',
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
                      {t(item)}
                    </button>
                  ))}
                  <span>{t('library.collectionHint')}</span>
                </div>
                <GameList games={filtered} saves={saves} />
              </section>
              <div className={styles.bottomNote}>
                <span>✧</span>
                <div>
                  <b>{t('library.note.title')}</b>
                  <p>{t('library.note.description')} </p>
                </div>
                <span className={styles.noteStamp}>
                  {t('library.note.stampFirst')} <br />
                  {t('library.note.stampSecond')}{' '}
                </span>
              </div>
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
                <p>
                  {offlineReady
                    ? t('offline.cached')
                    : t('offline.instructions')}
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
            <span>© {new Date().getFullYear()} ArcadeHub</span>
            <span>
              {t('footer.tagline')} <span>↗</span>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

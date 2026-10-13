import { useCallback, useEffect, useState } from 'react';
import { GameCanvas } from '../components/GameCanvas';
import { GameList } from '../components/GameList';
import { Icon } from '../components/Icon';
import { events } from '../core/event-bus';
import { games } from '../core/game-registry';
import type { GameManifest, SessionState } from '../core/types';
import { Audio } from '../shared/audio';
import { type GameSave, listSaves } from '../shared/storage';
import styles from './App.module.css';
import { useRoute } from './router';
import { useSettings } from './store';

function GameDetail({ game, save }: { game: GameManifest; save?: GameSave }) {
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
        ← 返回游戏大厅
      </a>
      <div className={styles.detailHeading}>
        <div>
          <span className={styles.eyebrow}>
            {game.subtitle} / {game.category}
          </span>
          <h1>
            {game.name}
            <span className={styles.headingDot}>.</span>
          </h1>
        </div>
        <span className={styles.pill}>
          {game.localPlayers === 2 ? '单人 / 双人' : '单人'} · 离线可玩
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
              <img src={game.cover} alt={`${game.name}插画`} />
              <div className={styles.startActions}>
                {save?.snapshot != null && (
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => start(true)}
                  >
                    继续上次游戏 →
                  </button>
                )}
                <button
                  type="button"
                  className={
                    save?.snapshot != null ? styles.secondary : styles.primary
                  }
                  onClick={() => start(false)}
                >
                  开始新游戏 →
                </button>
              </div>
            </div>
          )}
        </div>
        <aside className={styles.gameInfo}>
          <div className={styles.scoreCard}>
            <span>本局得分</span>
            <strong>{state.score.toLocaleString()}</strong>
            <div>
              <span>最高纪录</span>
              <b>
                {Math.max(save?.bestScore ?? 0, state.score).toLocaleString()}
              </b>
            </div>
          </div>
          <h3>怎么玩</h3>
          <div className={styles.controlList}>
            {game.controls.map((control) => (
              <div key={control.key}>
                <span>{control.description}</span>
                <kbd>{control.key}</kbd>
              </div>
            ))}
          </div>
          <p className={styles.helper}>
            也支持屏幕按钮及手柄方向键。切换窗口时自动暂停，游戏进度每 5
            秒及暂停、退出时保存。
          </p>
          <h3>关于游戏</h3>
          <p>{game.description}</p>
        </aside>
      </div>
    </>
  );
}

export default function App() {
  const route = useRoute();
  const { muted, volume, setMuted, setVolume } = useSettings();
  const [saves, setSaves] = useState<GameSave[]>([]);
  const [storageError, setStorageError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部游戏');
  const [offlineReady, setOfflineReady] = useState(false);
  const refresh = useCallback(() => {
    void listSaves()
      .then(setSaves)
      .catch(() =>
        setStorageError('无法读取本地存档，请检查浏览器的存储权限。'),
      );
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
      (category === '全部游戏' || game.category === category) &&
      `${game.name} ${game.subtitle}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const nav = [
    { href: '/', name: '游戏大厅', icon: 'games' },
    { href: '/saves', name: '我的存档', icon: 'save' },
    { href: '/settings', name: '设置', icon: 'settings' },
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
        <span className={styles.navLabel}>你的快乐补给站</span>
        <nav>
          {nav.map((item) => (
            <a
              key={item.href}
              className={`${styles.navLink} ${route === item.href || (item.href === '/' && currentGame) ? styles.active : ''}`}
              href={`#${item.href}`}
            >
              <Icon name={item.icon} />
              {item.name}
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
            {offlineReady ? '已准备好离线游玩' : '你的私人游戏角落'}
          </div>
          <p>
            无需账号，无需等待。
            <br />
            快乐和纪录，都留在这里。
          </p>
          <div className={styles.profile}>
            <span>玩家</span>
            <div>
              <b>本地玩家</b>
              <small>准备好刷新纪录了吗？</small>
            </div>
            <span className={styles.profileDot} />
          </div>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <span>PLAY A LITTLE. FEEL A LOT.</span>
          <div>
            <span className={styles.localLabel}>
              <span className={styles.liveDot} /> 本地模式
            </span>
            <button
              type="button"
              className={styles.soundButton}
              aria-label={muted ? '开启音效' : '关闭音效'}
              aria-pressed={!muted}
              onClick={() => setMuted(!muted)}
            >
              <Icon name="sound" />
              {muted ? '音效关' : '音效开'}
            </button>
          </div>
        </header>
        <main className={styles.main}>
          {storageError && (
            <p className={styles.error} role="alert">
              {storageError}
            </p>
          )}
          {route === '/' ? (
            <>
              <div className={styles.pageHeading}>
                <div>
                  <span className={styles.eyebrow}>
                    YOUR DAILY DOSE OF PLAY
                  </span>
                  <h1>
                    今天，玩点什么<span className={styles.headingDot}>？</span>
                  </h1>
                  <p>把日常暂停，把快乐打开。</p>
                </div>
                <span className={styles.pill}>✦ 随时开玩</span>
              </div>
              <section className={styles.hero}>
                <div className={styles.heroCopy}>
                  <span className={styles.heroTag}>经典，永不过时</span>
                  <h2>
                    小小一局。
                    <br />
                    大大快乐<span>。</span>
                  </h2>
                  <p>
                    从熟悉的贪吃蛇开始，
                    <br />
                    找回那个「再玩一次」的自己。
                  </p>
                  <a className={styles.primary} href="#/game/snake">
                    来一局贪吃蛇 <Icon name="arrow" size={18} />
                  </a>
                  <span className={styles.heroFootnote}>
                    随开随玩 · 自动存档 · 没有压力
                  </span>
                </div>
                <div className={styles.heroArt}>
                  <img
                    src={games.find((game) => game.id === 'snake')?.cover}
                    alt="贪吃蛇游戏插画"
                  />
                  <span className={styles.artSticker}>
                    JUST
                    <br />
                    ONE MORE!
                  </span>
                  <span className={styles.artCaption}>01 — THE CLASSICS</span>
                </div>
              </section>
              {lastGame && (
                <a
                  className={styles.continueCard}
                  href={`#/game/${lastGame.id}`}
                >
                  <span className={styles.continueIcon}>↩</span>
                  <div>
                    <b>接着上次的快乐</b>
                    <span>
                      {lastGame.name} · 上次得分 {lastSave.score}
                    </span>
                  </div>
                  <span>继续游戏 →</span>
                </a>
              )}
              <section className={styles.library}>
                <div className={styles.libraryHeading}>
                  <h2>
                    游戏精选{' '}
                    <span>{games.length.toString().padStart(2, '0')}</span>
                  </h2>
                  <label className={styles.search}>
                    <Icon name="search" size={17} />
                    <input
                      aria-label="搜索游戏"
                      placeholder="寻找你的下一场快乐"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                </div>
                <div className={styles.filters}>
                  {['全部游戏', '街机', '益智'].map((item) => (
                    <button
                      type="button"
                      key={item}
                      aria-pressed={category === item}
                      className={category === item ? styles.selected : ''}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                  <span>简单上手，认真好玩。</span>
                </div>
                <GameList games={filtered} saves={saves} />
              </section>
              <div className={styles.bottomNote}>
                <span>✧</span>
                <div>
                  <b>好游戏，慢慢来。</b>
                  <p>
                    这里没有倒计时，也没有每日任务。按你的节奏，享受每一局。
                  </p>
                </div>
                <span className={styles.noteStamp}>
                  MADE FOR
                  <br />
                  GOOD TIMES
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
              <span className={styles.eyebrow}>MAKE IT YOURS</span>
              <h1>你的游戏，你的节奏。</h1>
              <p>设置自动保存在当前浏览器。</p>
              <section className={styles.settingsPanel}>
                <div>
                  <div>
                    <h3>游戏音效</h3>
                    <p>一点声音，让快乐更有感觉。</p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondary}
                    aria-pressed={!muted}
                    onClick={() => setMuted(!muted)}
                  >
                    {muted ? '已关闭' : '已开启'}
                  </button>
                </div>
                <div>
                  <label htmlFor="volume">音量</label>
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
                <p>
                  存档保存在 IndexedDB 中。清除浏览器站点数据会同时清除存档。
                </p>
                <p>
                  {offlineReady
                    ? '全部游戏资源已缓存，可以离线游玩。'
                    : '生产版本首次联网打开并完成缓存后，即可离线游玩。'}
                </p>
              </section>
            </>
          ) : route === '/saves' ? (
            <>
              <span className={styles.eyebrow}>YOUR LITTLE MILESTONES</span>
              <h1>每一局，都有迹可循。</h1>
              <p>你的进度与最高纪录，只保存在这台设备。</p>
              <div className={styles.saveList}>
                {saves.length ? (
                  saves.map((save) => (
                    <article key={save.id} className={styles.saveCard}>
                      <Icon name="save" size={28} />
                      <div>
                        <h3>
                          {games.find((game) => game.id === save.id)?.name ??
                            save.id}
                        </h3>
                        <p>
                          最高纪录 {save.bestScore} · 最近得分 {save.score}
                        </p>
                        <small>
                          {new Date(save.updatedAt).toLocaleString('zh-CN')}
                        </small>
                      </div>
                      {games.some((game) => game.id === save.id) && (
                        <a
                          className={styles.secondary}
                          href={`#/game/${save.id}`}
                        >
                          {save.snapshot != null ? '继续游戏' : '再玩一次'} →
                        </a>
                      )}
                    </article>
                  ))
                ) : (
                  <div className={styles.empty}>
                    <Icon name="save" size={40} />
                    <h3>第一份纪录，等你来写。</h3>
                    <p>开始一场游戏，进度会自动保存在这里。</p>
                    <a className={styles.primary} href="#/">
                      去游戏大厅 →
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <h1>游戏不在这里。</h1>
              <a href="#/" className={styles.primary}>
                返回大厅 →
              </a>
            </div>
          )}
          <footer className={styles.footer}>
            <span>© {new Date().getFullYear()} ArcadeHub</span>
            <span>
              少一点忙碌，多一点好玩。 <span>↗</span>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

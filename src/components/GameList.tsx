import styles from '../app/App.module.css';
import type { GameManifest } from '../core/types';
import type { GameSave } from '../shared/storage';
import { GameCard } from './GameCard';

export function GameList({
  games,
  saves,
}: {
  games: GameManifest[];
  saves: GameSave[];
}) {
  return (
    <div className={styles.gameGrid}>
      {games.length ? (
        games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            save={saves.find((save) => save.id === game.id)}
          />
        ))
      ) : (
        <p className={styles.empty}>没有找到游戏，试试其他关键词。</p>
      )}
    </div>
  );
}

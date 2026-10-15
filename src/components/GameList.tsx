import styles from '../app/App.module.css';
import type { GameManifest } from '../core/types';
import { useI18n } from '../i18n';
import type { GameSave } from '../shared/storage';
import { GameCard } from './GameCard';

export function GameList({
  games,
  saves,
}: {
  games: GameManifest[];
  saves: GameSave[];
}) {
  const { t } = useI18n();
  return (
    <div className={styles.gameGrid}>
      {games.length ? (
        games.map((game, index) => (
          <GameCard
            key={game.id}
            game={game}
            number={index + 1}
            save={saves.find((save) => save.id === game.id)}
          />
        ))
      ) : (
        <p className={styles.empty}>{t('library.empty')}</p>
      )}
    </div>
  );
}

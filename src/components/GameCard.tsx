import styles from '../app/App.module.css';
import type { GameManifest } from '../core/types';
import type { GameSave } from '../shared/storage';
import { Icon } from './Icon';

export function GameCard({
  game,
  save,
}: {
  game: GameManifest;
  save?: GameSave;
}) {
  return (
    <a className={styles.card} href={`#/game/${game.id}`}>
      <div className={styles.cover}>
        <img src={game.cover} alt={`${game.name}插画`} />
        <span className={styles.coverTag}>{game.category}</span>
        <span className={styles.cardPlay}>↗</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>
          <h3>{game.name}</h3>
          <span>{game.subtitle}</span>
        </div>
        <p>{game.description}</p>
        <div className={styles.cardFooter}>
          <span>
            {save
              ? `最高纪录 ${save.bestScore.toLocaleString()}`
              : '等待你的第一场挑战'}
          </span>
          <Icon name="arrow" size={18} />
        </div>
      </div>
    </a>
  );
}

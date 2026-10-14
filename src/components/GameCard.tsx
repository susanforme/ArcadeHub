import styles from '../app/App.module.css';
import type { GameManifest } from '../core/types';
import { useI18n } from '../i18n';
import type { GameSave } from '../shared/storage';
import { Icon } from './Icon';

export function GameCard({
  game,
  save,
}: {
  game: GameManifest;
  save?: GameSave;
}) {
  const { t } = useI18n();
  return (
    <a className={styles.card} href={`#/game/${game.id}`}>
      <div className={styles.cover}>
        <img
          src={game.cover}
          alt={t('game.imageAlt', { name: t(game.name) })}
        />
        <span className={styles.coverTag}>{t(game.category)}</span>
        <span className={styles.cardPlay}>↗</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitle}>
          <h3>{t(game.name)}</h3>
          <span>{t(game.subtitle)}</span>
        </div>
        <p>{t(game.description)}</p>
        <div className={styles.cardFooter}>
          <span>
            {save
              ? t('library.card.highScore', {
                  score: save.bestScore.toLocaleString(),
                })
              : t('library.card.firstChallenge')}
          </span>
          <Icon name="arrow" size={18} />
        </div>
      </div>
    </a>
  );
}

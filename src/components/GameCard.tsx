import styles from '../app/App.module.css';
import type { GameManifest } from '../core/types';
import { useI18n } from '../i18n';
import type { GameSave } from '../shared/storage';
import { Icon } from './Icon';

export function GameCard({
  game,
  save,
  number,
}: {
  game: GameManifest;
  save?: GameSave;
  number?: number;
}) {
  const { t } = useI18n();
  return (
    <a className={styles.card} href={`#/game/${game.id}`}>
      <div className={styles.cover}>
        <img
          src={game.cover}
          loading="lazy"
          decoding="async"
          alt={t('game.imageAlt', { name: t(game.name) })}
        />
      </div>
      <div className={styles.cardBody}>
        {number !== undefined && (
          <span className={styles.cardNumber} aria-hidden="true">
            {String(number).padStart(2, '0')}
          </span>
        )}
        <div className={styles.cardCopy}>
          <div className={styles.cardTitle}>
            <h3>{t(game.name)}</h3>
            <span>{t(game.category)}</span>
          </div>
          <p title={t(game.description)}>{t(game.description)}</p>
          {save && (
            <span className={styles.cardRecord}>
              {t('library.card.highScore', {
                score: save.bestScore.toLocaleString(),
              })}
            </span>
          )}
        </div>
        <Icon name="arrow" size={20} />
      </div>
    </a>
  );
}

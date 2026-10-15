import styles from '../app/App.module.css';
import { useSettings } from '../app/store';
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
  const favorite = useSettings((state) => state.favoriteIds.includes(game.id));
  const toggleFavorite = useSettings((state) => state.toggleFavorite);
  return (
    <article className={styles.card}>
      <a className={styles.cardLink} href={`#/game/${game.id}`}>
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
      <button
        type="button"
        className={styles.favoriteButton}
        aria-label={t(favorite ? 'favorites.remove' : 'favorites.add', {
          name: t(game.name),
        })}
        aria-pressed={favorite}
        onClick={() => toggleFavorite(game.id)}
      >
        <Icon name="heart" size={22} />
      </button>
    </article>
  );
}

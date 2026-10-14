import { useSettings } from '../app/store';
import { useI18n } from '../i18n';
import styles from './LanguageSelect.module.css';

export function LanguageSelect() {
  const { language, t } = useI18n();
  const setLanguage = useSettings((state) => state.setLanguage);
  return (
    <label className={styles.control} title={t('settings.language')}>
      <svg
        className={styles.icon}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </svg>
      <select
        className={styles.select}
        aria-label={t('settings.languageLabel')}
        value={language}
        onChange={(event) =>
          setLanguage(event.target.value === 'en' ? 'en' : 'zh')
        }
      >
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
      <svg
        className={styles.chevron}
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="m4 6 4 4 4-4" />
      </svg>
    </label>
  );
}

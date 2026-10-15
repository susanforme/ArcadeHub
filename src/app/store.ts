import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../i18n/translate';

interface Settings {
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  muted: boolean;
  volume: number;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
}
export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      favoriteIds: [],
      toggleFavorite: (id) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(id)
            ? state.favoriteIds.filter((favoriteId) => favoriteId !== id)
            : [...state.favoriteIds, id],
        })),
      language: 'zh',
      setLanguage: (language) => set({ language }),
      muted: false,
      volume: 0.5,
      setMuted: (muted) => set({ muted }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
    }),
    {
      name: 'arcadehub-settings',
      partialize: ({ muted, volume, language, favoriteIds }) => ({
        favoriteIds,
        muted,
        volume,
        language,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<Settings> | undefined;
        return {
          ...current,
          ...saved,
          favoriteIds: Array.isArray(saved?.favoriteIds)
            ? [
                ...new Set(
                  saved.favoriteIds.filter((id) => typeof id === 'string'),
                ),
              ]
            : [],
          language: saved?.language === 'en' ? 'en' : 'zh',
        };
      },
    },
  ),
);

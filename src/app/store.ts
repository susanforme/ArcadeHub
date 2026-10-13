import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  muted: boolean;
  volume: number;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
}
export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      muted: false,
      volume: 0.5,
      setMuted: (muted) => set({ muted }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
    }),
    {
      name: 'arcadehub-settings',
      partialize: ({ muted, volume }) => ({ muted, volume }),
    },
  ),
);

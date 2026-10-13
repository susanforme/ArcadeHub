import type { GameManifest } from './types';

export function createRegistry(manifests: GameManifest[]) {
  const ids = new Set<string>();
  for (const game of manifests) {
    if (!/^[a-z0-9-]+$/.test(game.id) || ids.has(game.id)) {
      throw new Error(`Invalid or duplicate game id: ${game.id}`);
    }
    ids.add(game.id);
  }
  return manifests.sort((a, b) => a.id.localeCompare(b.id));
}
const modules = import.meta.glob<{ default: GameManifest }>(
  '../games/*/manifest.ts',
  { eager: true },
);
export const games = createRegistry(
  Object.values(modules).map((module) => module.default),
);

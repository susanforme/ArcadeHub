import type { GameManifest } from './types';

export async function loadGame(manifest: GameManifest) {
  const { default: plugin } = await manifest.load();
  if (
    !plugin.scenes.length ||
    plugin.config.width <= 0 ||
    plugin.config.height <= 0
  ) {
    throw new Error('errors.gameConfig');
  }
  return plugin;
}

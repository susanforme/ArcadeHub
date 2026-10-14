# 保卫萝卜 / Carrot Fantasy

Phaser plugin for ArcadeHub. Includes the Sky theme's first 12 map layouts, five towers with three upgrade levels, obstacle clearing, target selection, waves, final-wave boss, health, results, best-health records, 2× speed, keyboard/touch controls, and complete resumable battle snapshots.

Select an empty tile, then choose a tower in the bottom toolbar. Select an existing tower to upgrade or sell. Tap an obstacle or enemy to focus fire; tap it again or Cancel to release the target. Enter/Space starts the waves. F toggles speed, R retries, L opens levels, and P/Esc pauses through the platform.

## Reused material

- [JezaChen/CarrotGuardGame](https://github.com/JezaChen/CarrotGuardGame): original Sky map art, paths, obstacle locations, initial money, wave counts, available towers, tower/monster parameters, and sprite atlases.
- [cocos-creator-demo/cocos-carrot-fantasy](https://github.com/cocos-creator-demo/cocos-carrot-fantasy): carrot sprite.
- `source/` retains upstream TMX, CSV, and XML data for inspection. `levels.json`, `towers.json`, and `monsters.json` contain the relevant converted configuration.
- `assets/NOTICE.txt` records provenance. The upstream repositories do not establish commercial redistribution permission for the original game's art.

The battle code is a new implementation. Enemy composition follows the source recreation's ten-monster wave pattern and five-wave tiers, with all ten final-wave enemies spawned before checking victory. Ball's direct lightning uses the damage values stored in the original tower table. Splash, piercing, chain lightning, obstacle rewards, and slow duration are adaptations; this is not a claim of exact official combat balance or an official release. Boss-only levels 13-16 and other themes are not included.

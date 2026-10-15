# 疯狂水族馆 / Insaniquarium

An independently implemented aquarium management loop for ArcadeHub, not the full PopCap game. Feed fish, collect falling money, grow the economy, fend off invaders and buy three egg pieces to advance to the next tank.

- Click/tap in the tank to drop food ($5), click coins to collect, click the alien to fire. Hungry fish swim toward the nearest food; fish gain growth by eating and produce more valuable coins as they mature.
- Four illustrated shop buttons buy fish ($100), upgrade food, upgrade the laser, or buy an egg piece. Food/laser cap at level 3 and fish cap at 12. The next tank resets purchases and retains score while increasing invasion pressure and egg cost.
- Keyboard: arrows move the visible aim cursor, Space performs the tank action, 1–4 activate the shop. P/Esc or the platform controls pause/restart.
- Losing every fish is recoverable while available money/coins can buy another fish. Otherwise the run ends. No offline time is simulated.
- Versioned save validation checks currency, upgrades, entity IDs, fish, food, coins and invasion state. Tests cover purchase boundaries, food/growth, collection, combat and snapshots.

## Community and artwork

Original/reimplementation sources researched:
- https://github.com/SaMeiers/insaniquarium-port
- https://github.com/Jake-Vellora/insaniquarium-mac
- https://github.com/abrampers/ArkavQuarium

The native-port projects require retail PopCap assets and explicitly do not redistribute those assets. No commercial PopCap art or code is bundled here. Fish, scenery and bubbles follow ASSETS.md and use Kenney's CC0 Fish Pack 2.0:
- https://opengameart.org/content/fish-pack-0
- https://opengameart.org/sites/default/files/kenney_fish-pack_2.0.zip
- `assets/License.txt` retained; PNGs copied from upstream `PNG/Default`.

Shop/alien icons from **Game-icons.net**, **CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/), credited in the game footer:
- Egg clutch — **Lorc**: https://game-icons.net/1x1/lorc/egg-clutch.html
- Laser blast — **Lorc**: https://game-icons.net/1x1/lorc/laser-blast.html
- Alien skull — **Lorc**: https://game-icons.net/1x1/lorc/alien-skull.html
- Grain — **Delapouite**: https://game-icons.net/1x1/delapouite/grain.html
- Original white/transparent PNG URLs use `https://game-icons.net/icons/ffffff/transparent/1x1/<author>/<name>.png`. Runtime scaling and tinting only.

Validation: targeted logic tests, typecheck and scoped Biome pass. Local Chromium exercised actual pointer/keyboard actions, pause, refresh and saved-session continuation. Feeding Frenzy and Insaniquarium were also checked at 390 × 844. Browser error logs were empty. Physical devices and full end-to-end campaign completion have not been tested.

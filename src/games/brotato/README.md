# 土豆兄弟 / Brotato

An ArcadeHub implementation of Brotato's base arena-survival loop. Original
TypeScript simulation and Phaser scene, with licensed community artwork/audio.

## Design references

- [Blobfish's official Steam description](https://store.steampowered.com/app/1942280/Brotato/): movement-led combat, automatic attacks, up to six weapons, character traits, materials and between-wave shopping.
- [Community wave reference](https://brotato.wiki.spellsandguns.com/Waves): 20 waves, 20 seconds initially, +5 seconds per wave to 60, 90-second finale; leveling and shopping after combat.
- [Shop reference](https://brotato.wiki.spellsandguns.com/Shop): four offers, paid rerolls, persistent locks, early weapon guarantees, matching-weapon bias and tiers I–IV.
- [Harvesting](https://brotato.wiki.spellsandguns.com/Harvesting): materials/XP at wave end and 5% positive harvesting growth.

Implemented: three character builds; six weapon types including melee arcs,
shotgun pellets, fast SMG and piercing magic; ten tradeoff items; four stat choices
per earned level; six slots; matching-tier purchase combination when slots are full / explicit combination; recycle;
locked offers preserved between waves; dropped materials bagged and used to double
next-wave pickups; food, trees and crates; chasers, chargers, tanks, ranged enemies
and a final radial-projectile boss. Survive wave 20 or defeat its boss to win.
Every two gun weapons give +1 ranged damage; every two blades give +2 melee.

Balance is tuned for the browser arena. This is not the complete commercial
content library: original exact item/character catalogs, DLC, Danger levels,
unlocks, local co-op, manual aiming and endless mode are not implemented.

## Architecture and controls

`manifest.ts` is discovered by the existing registry; `index.ts` lazily loads the
scene. `logic.ts` owns serializable simulation and shop rules. The scene uses the
existing SessionScene, InputManager, Audio and IndexedDB saves. All imported
assets ship with the offline build. No new dependency or platform API change.

- WASD/arrows, gamepad or eight-way virtual D-pad: move; firing is automatic.
- Drag on the arena to move toward the pointer. Release/cancel/blur resets it.
- Space/Enter starts a run/next wave; 1–4 chooses a stat or buys a shop card.
- Click/tap to pick characters, starting weapons, upgrades, locks or gear.
- R / virtual B rerolls the shop; virtual A confirms the highlighted card.
  Arrows move the card selection. B cycles the starting weapon on the ready screen.
- P/Esc or the platform toolbar pauses. Paused simulation does not advance.
- Tap an equipped weapon in the shop to select it for combination or recycling.
- Snapshots preserve random seed, phase, entities/projectiles/drops, timers,
  upgrades, loot, materials, purchased items, equipment and locked shop offers.

## Asset credits

See [assets/README.md](assets/README.md) for source URLs, transformations and
licenses. Gameplay images are community assets, not text placeholders.

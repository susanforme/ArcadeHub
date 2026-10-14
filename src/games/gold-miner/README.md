# 黄金矿工 / Gold Miner

Original Phaser implementation of the classic swinging-claw mining game.
Gameplay reference: https://www.crazygames.com/game/gold-miner

- 60-second rounds, cumulative cash goals, weight-dependent hauling, gold,
  diamonds, rocks and mystery bags. Revenue is the platform score; shop purchases
  reduce cash without reducing the high score.
- Space / Down / S / Enter / A: start, cast or continue from the shop.
  Up / W / B: destroy held cargo using one dynamite stick.
  1 / 2 / 3: buy dynamite, strength or diamond polish between rounds.
- Tap the mine to cast. Shop and round buttons support pointer/touch input.
  P / Escape and the platform pause button pause the countdown.
- Dynamite carries over. Strength and polish last one round; their prices are
  fixed. Reaching the target enables early completion, or you can keep mining.
- Versioned snapshots preserve the hook, field, timer, cash and purchases.

## Assets

Artwork comes from **Mining Pixel Game Asset** by **acdrnx**, published under
CC0 on OpenGameArt (one of the root `ASSETS.md` sources):
https://opengameart.org/content/mining-pixel-game-asset

The miner, gold ore, diamond, rock, bag, dynamite, power drink, diamond upgrade,
terrain and explosion are imported PNG sprites. Transparent margins are trimmed
without repainting. `assets/SOURCE.json` records source filenames, crop rectangles,
and SHA-256 hashes of the originals. `assets/cover.png` is a composition of these
same terrain and item sprites. Shop icons can be clicked to buy; item names and
prices supplement the images. No self-drawn SVG artwork is used.

The three OGG sound effects are from **Kenney Interface Sounds**, as recommended
by the root `ASSETS.md`: https://kenney.nl/assets/interface-sounds (CC0).
`cast.ogg` = `Audio/drop_001.ogg`, `collect.ogg` =
`Audio/confirmation_001.ogg`, `blast.ogg` = `Audio/close_001.ogg`.
The original Kenney license is retained in `assets/LICENSE.txt` and the artwork
credits in `assets/NOTICE.txt`. Imports ship with the application and its offline
cache; no runtime asset download is needed.

# 森林冰火人 / Fireboy & Watergirl

Original three-level cooperative platform puzzle, inspired by the classic game.
No original game code, characters or artwork is copied. The game's Watergirl is
shown as 冰女孩 in Chinese to match the requested naming; her element is water.

- Fireboy: Left / Right to move, Up to jump, Down to activate a nearby lever.
- Watergirl: A / D to move, W to jump, S to activate a nearby lever.
- Both sets work simultaneously. Q / virtual X switches the character controlled
  by the virtual directional pad and A (jump), B (lever). E also uses that lever.
  Switching leaves the other character in place, so cooperation works on touch.
- Enter / Space / Y starts, retries after failure, or continues after clearing.
  R retries the current level; the platform restart button restarts the full run.
- Fireboy survives fire, Watergirl survives water; both die in poison.
  Jump across the other element's pool and collect only your own colored gems.
- Pressure plates temporarily open linked gates. Push a stone crate onto a plate
  or leave a teammate there. A lever on the far side permanently opens its gate.
  Higher gates require the two characters to cooperate. Both must reach their
  own exits, with every gem collected, before the level timer runs out.
- Score: 100 per gem; 500 + remaining seconds × 5 per completed level. Retrying
  restores the score at the level's start. Pause, automatic save/resume, language,
  global volume, fullscreen and offline assets use the existing platform.

## Assets

Cover SVG and procedural character artwork are original. Gems, crates, terrain,
wall tiles, pools, switches and pressure plates use **Kenney Platformer Art Deluxe**
(CC0): https://kenney.nl/assets/platformer-art-deluxe. The selected PNG files
are unmodified; visual tint/size changes happen in Phaser. Its original license
is retained in `assets/LICENSE-platformer.txt`. Sound effects
are from **Kenney Interface Sounds**, recommended in the root `ASSETS.md`:
https://kenney.nl/assets/interface-sounds (CC0).
`gem.ogg` is `Audio/confirmation_001.ogg`; `jump.ogg` is `Audio/drop_001.ogg`.
They reuse the existing locally available Kenney pack, with its unmodified
`assets/LICENSE.txt`. All assets ship locally and need no runtime download.

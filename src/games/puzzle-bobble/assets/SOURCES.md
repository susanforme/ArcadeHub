# Puzzle Bobble resource provenance

Original game and artwork: Puzzle Bobble / Bust-A-Move, © 1994 Taito Corporation.
Original graphics remain the property of Taito; these files are **not CC0** and
no permissive artwork licence was found in the community repository. Public
availability is not a grant of commercial redistribution rights.

Community source: https://github.com/carcasanchez/Puzzle-Bobble
Pinned commit: 3afeb1b8c4797da6cd7e16909d969db31818c284
Art research: https://github.com/carcasanchez/Puzzle-Bobble/wiki/The-art-of-Puzzle-Bobble
The wiki identifies its sprites as original arcade sprites and points to
https://www.spriters-resource.com/resources/sheets/13/14029.png

Files copied unchanged from `Puzzle_Bobble/Game/`:

| Local file | Upstream file | Usage |
| --- | --- | --- |
| bubbles.png | Bobbles.png | Eight original bubble colours |
| characters.png | SpritesP1.png | Bub, launcher, arrow, bag |
| characters-blue.png | SpritesP2.png | Bob |
| arcade.png | two_player_background.png | Original metal frame / purple playfield |
| cover.png | Start_Screen.png | Original title-screen cover |

Frames are selected at runtime; alpha channels and pixel art are preserved.
Audio reuses ArcadeHub's existing shared sound effects; original music is not included.

## Level provenance

- Level 1: manually transcribed from `Photos_Images/Screens/0000.png` in the
  pinned community source (original arcade screenshot).
- Levels 2–10: new layouts arranged for this implementation, inspired by the
  classic clusters, bridges and suspended chains; not advertised as original levels.
- Levels 11–12: the community's `map1_left` and `map1_right` in
  `Puzzle_Bobble/ModuleLevel_1.cpp`, converted from zero-based colours to 1–8.
  The C++ engine was not ported or included.
- The wiki's old postimg.org links are incomplete/obsolete; this release does
  not claim to reproduce the original 30-level campaign.

Physics, hex-grid matching, falling clusters and Phaser integration are newly
implemented in TypeScript. The ceiling descends after every eight shots; colour
selection uses only colours still on the board. The next bubble can be swapped.

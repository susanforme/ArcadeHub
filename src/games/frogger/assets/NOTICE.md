# Frogger artwork

`sprites.png` and `board.gif` are copied without modification from the community
Frogger project by Den Odell:

- https://github.com/denodell/frogger
- Pinned commit: `37ad2f6f512725d1140de3eba6b6411996ca421c`
- Upstream files: `images/spritemap.png`, `images/gameboard.gif`.
- `cover.svg` arranges embedded copies of these images for the game library.

The game uses local imports, including for offline packaging. Sprites are sliced
at runtime using Phaser texture frames; gameplay code is written for ArcadeHub,
and does not include the upstream Canvas engine.

These are community-distributed renditions of classic Frogger graphics, not an
official asset release. The source repository does not declare an asset license.
Original Frogger artwork and trademarks remain the property of their respective
rights holders, including Konami. No CC0 or MIT license is asserted for these
images; public availability does not grant redistribution or commercial rights.

## Resource search

Consulted the project's ASSETS.md and these community sources:

- https://opengameart.org/content/flopper-frogger-sprites — CC0 alternative, but
  the fish, trains and neon artwork differ from the requested original look.
- https://classicgaming.cc/classics/frogger/graphics — cartoon redraw, not selected.
- https://www.spriters-resource.com/arcade/frogger/asset/11067/ — original arcade
  rip by GaryCXJk with contributions by 125scratch; direct image download returned
  HTTP 403, so this sheet is not included.
- https://github.com/denodell/frogger — selected for its classic frog, vehicles,
  logs, turtles and matching riverbank background.

Sound effects reuse ArcadeHub's existing shared audio and mute/volume settings.

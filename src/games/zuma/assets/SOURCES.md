# Zuma artwork and level provenance

Community source: https://github.com/19nkn80/Zuma-Deluxe-HD
Pinned commit: `5bbc256cc431ee56b5e14617b113fc466508e566`.
Upstream HD remake: https://github.com/GalaxyShad/Zuma-Deluxe-HD

This is the community HD remake's art, based on Zuma Deluxe, rather than a
claim of pixel-identical 2003 artwork. Zuma and the original artwork/audio
belong to PopCap / Electronic Arts. The repository's MIT code license does
not establish a permissive license for the original assets or HD derivatives.
No independent artwork redistribution grant was found. These are not CC0
assets; obtain appropriate rights before public/commercial redistribution.

Files copied unchanged from the pinned community repository:

| Local file | Upstream file | Use |
| --- | --- | --- |
| frog.png | content/images/frog.png | Stone frog body and eyes |
| objects.png | content/images/gameobjects.png | Six animated marbles, golden sun and skull |
| spiral.jpg / spiral.dat | content/levels/spiral/spiral.jpg / spiral.dat | Spiral of Doom background and original CURV track |
| claw.jpg / claw.dat | content/levels/claw/claw.jpg / claw.dat | Osprey Talon background and original CURV track |
| tiltspiral.jpg / tiltspiral.dat | content/levels/tiltspiral/tiltspiral.jpg / tiltspiral.dat | When Spirals Attack background and original CURV track |
| audio/fire.ogg | content/sounds/fireball1.ogg | Fire |
| audio/match.ogg | content/sounds/ballsdestroyed1.ogg | Marble destruction |
| audio/click.ogg | content/sounds/ballclick1.ogg | Insertion |

`cover.svg` composes the supplied spiral background and frog, with a text title.
`paths.json` is decoded from the three `.dat` files: read the little-endian
control-point count at offset 16, skip `20 + count * 10` bytes, then read an
int32 sample count and float32 starting x/y. Each later sample is four bytes:
two flags and two signed delta coordinates divided by 100. Accumulate the
deltas, keep every sixth point and the endpoint, round to two decimal places,
and add x=104 for the HD widescreen background and y=64 for ArcadeHub's HUD.
Frog positions are from the same repository's `content/levels/levels.xml`.

All gameplay, matching, collision, persistence and Phaser integration are new
TypeScript code; no C engine code is included. The nine-round progression
reuses these three maps with increasing speed and 4/5/6 colors. It is not the
original full campaign. Power-ups, coins and original music are not included.

# Hextris

Phaser plugin at `/#/game/hextris`. The original GPL-3.0-or-later engine's
six wave patterns, four colors, cross-edge flood fill, quadratic scoring,
combo window, acceleration, block geometry and animation are adapted directly
from the fixed upstream commit in `assets/SOURCE.json`.

Left/right (A/D), a gamepad or tapping either half rotates the hexagon.
Down/S/Space speeds up the simulation. Enter starts/replays. The platform owns
pause, sound, lifecycle and IndexedDB saves; all logic and draw-side animation
stop while paused. A data-only checkpoint restores blocks, waves and combo time
without evaluating serialized functions. The original desktop eight-row rules
are used consistently on phones, with the same logical 800 × 800 board.

Differences: responsive platform chrome and translated HUD replace upstream
DOM menus, social sharing and analytics. The HUD uses a system font. Platform
clear/over sounds are added; no new game rules or hand-made character art.
The Phaser Scene owns the only frame loop and uploads the original Canvas
drawing through CanvasTexture.

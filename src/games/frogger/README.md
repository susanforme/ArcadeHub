# Frogger

Phaser game plugin at `/#/game/frogger`, discovered through `manifest.ts`.
The portrait 480 × 640 board uses community classic-style artwork (see
`assets/NOTICE.md`) and the platform's pixel-art rendering mode.

Cross five road lanes and five river lanes, then enter each of the five empty
homes. Cars cost a life; water is safe only on logs or surfaced turtles. Currents
carry the frog, alternating turtle groups periodically dive, and occupied homes
and the river edges are lethal. Each frog gets 30 seconds and the run begins with
three lives. New highest rows award 10 points, homes award 50 plus a time bonus,
and completing all five adds 1,000 and starts a faster round. One extra life is
awarded at 20,000. Speed increases are capped after round 11.

Arrows/WASD and the D-pad hop in four directions; hold to repeat. Space/Enter or
gamepad A hops forward. Tap the board to hop forward, or swipe for a direction.
The start/replay buttons are touch targets. P/Esc, the platform pause button and
window blur pause the whole simulation. Timer, traffic, currents, turtle dive
phase, homes, lives and score resume from the platform save snapshot.

`logic.ts` is independent of Phaser. Tests in `tests/frogger.test.ts` cover the
crossing rules and corrupt saves.

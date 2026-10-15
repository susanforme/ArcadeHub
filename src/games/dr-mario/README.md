# Dr. Mario / 马里奥医生

Native single-player Phaser recreation at `/#/game/dr-mario`, using original
NES capsule, virus, doctor and bottle artwork distributed by the community
reference. It is not a ROM emulator. See `assets/NOTICE.txt` for the original
Nintendo rights and the community repository's missing independent license.

## Gameplay

The 8×16 bottle has red, yellow and blue viruses. Levels 0–20 start with
`4 × (level + 1)` viruses, up to 84, confined to the bottom 10/11/12 rows as the
level rises. Boards are generated without existing four-in-a-row matches.
Select the starting virus level and LOW/MED/HI speed before starting.

Capsules contain two connected halves. Rotate in either direction, move left
or right, and soft-drop. A horizontal or vertical run of at least four same-color
cells clears both viruses and capsule halves. Surviving halves disconnect;
intact pairs remain bonded and only fall if both destination cells are free.
Loose pieces fall one row per gravity tick, and new matches resolve before the
next capsule. Viruses stay fixed. Clearing every virus advances; blocking either
cell at the bottle neck loses. Completing level 20 ends this run.

Only viruses score: 100/200/300 base points by speed, doubled for subsequent
viruses eliminated by one capsule, capped at 32× base for each virus after the
sixth. Fall speed increases every ten capsules. A 320 ms clear flash and
75 ms gravity steps make chain reactions visible.

## Controls and integration

Arrows/A-D move, Down/S soft-drops, Up/W/X/Space/A rotates clockwise, Z/B rotates
counterclockwise. Enter/A starts or advances. In the menu, Left/Right chooses
level and Up/Down chooses speed. Touch: tap the bottle to rotate, swipe sideways
to move, and drag down and hold to soft-drop; the platform gamepad is also wired.

`SessionScene` supplies score publishing, pause/blur, restart and saved games.
The snapshot includes every bond, falling capsule, next capsule, phase timer,
clear animation, level, speed and score. Invalid saves restart at the menu.
Fever music uses Howler's global mute/volume and pauses with the session.

## Provenance and differences

- [kedholmmoch/Dr-Mario-JS](https://github.com/kedholmmoch/Dr-Mario-JS), commit
  `eee7bb5cb6f8be0abee5e03add9515cf7506d15b`. The two PNGs and Fever MP3 are
  copied byte-for-byte; the cover composes sprite regions. Upstream JS is not
  included. The bottle sheet credits Black Squirrel. No LICENSE file exists in
  this source; Nintendo artwork/music remain copyrighted Nintendo.
- Rules: [original NES manual transcription](https://www.world-of-nintendo.com/manuals/nes/dr_mario.shtml)
  and [community NES scoring guide](https://www.speedrun.com/ko-KR/drmariones/guides/3zqyb).
- These are generated levels; no fixed maps were invented or copied. The virus
  counts and playable rules follow the original. The RNG sequence, timings and
  rotation handling are native implementations, not cycle-accurate NES code.
  Two-player battles, endings/cutscenes, endless stages above 20, and the Chill
  music option are not included. Shared effects supplement original Fever music.

`assets/SOURCE.json` records exact upstream files, commits and SHA-256 values.
`tests/dr-mario.test.ts` covers all starting levels, rotation/obstructions,
match detection, bonded/split gravity, scoring, cascades, advancement, neck
failure, speed progression and snapshot validation.

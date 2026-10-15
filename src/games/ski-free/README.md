# SkiFree / 滑雪

A Phaser adaptation with community-preserved classic SkiFree pixel art. An independent 2,000 metre course provides steering, braking, jumping, ramps, obstacles and the familiar yeti chase; it does not reproduce every mode or map of the Windows original.

- Arrows/A/D or pointer/drag steer. Up/W or the on-screen brake button slow the skier. Space or the jump button jump, with a short cooldown.
- Trees and rocks cost one of three lives; jumping clears them. Ramps launch longer jumps and award 100 points. Speed/density rise along the course.
- The yeti appears after 1,000 metres. Maintaining speed opens a gap; collisions and sustained braking let it catch up. Reach 2,000 metres to win.
- P/Esc, platform pause and blur freeze the simulation. Validated saves retain obstacles, distance, speed, jump/cooldown, protection and yeti gap. Restart begins a clean run.
- `tests/ski-free.test.ts`: ground/air collisions, ramp launch, chase/braking and corrupt/duplicate snapshot entries.

## Community source and attribution

- Source: https://github.com/basicallydan/skifree.js
- Downloaded: https://codeload.github.com/basicallydan/skifree.js/zip/refs/heads/master
- Original `sprite-characters.png` and `skifree-objects.png` are used unchanged. Frame rectangles are documented in upstream `js/spriteInfo.js`; no upstream game engine code is copied.
- The SVG cover arranges frames from the same original sprite sheets, using nested SVG view boxes; no sprites are repainted.
- Upstream credits **Wing Wang Wao / The Spriters Resource** for providing the sprites and **Chris Pirih** for the original game: https://ski.ihoc.net/
- The community repository publishes the MIT license by **Daniel Hough (2013)**, preserved verbatim in `assets/license.md`. That repository license is not a claim that the original SkiFree artwork is CC0, or that the community author owns the original game's artwork. The original sprite attribution remains separate.

Validation: targeted logic tests, typecheck and scoped Biome pass. Local Chromium exercised actual pointer/keyboard actions, pause, refresh and saved-session continuation. Feeding Frenzy and Insaniquarium were also checked at 390 × 844. Browser error logs were empty. Physical devices and full end-to-end campaign completion have not been tested.

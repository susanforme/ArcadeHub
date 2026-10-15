# 大鱼吃小鱼 / Feeding Frenzy

A compact ArcadeHub adaptation of the eat-and-grow arcade loop, built with Phaser and SessionScene. This is an independently implemented five-stage run, not the complete commercial game or its original level set.

- Swim with arrows/WASD or move/drag the pointer. Orange is the player; red-tinted fish are currently too large to eat.
- Eat 50 fish within 150 seconds. Every ten meals grows the player and raises the score multiplier and spawn difficulty. Three lives, with 2.5 seconds of protection after a collision.
- The opening school provides immediate prey; subsequent schools enter from the sides. Fish images scale with the actual collision/eating size.
- P/Esc and the platform pause button suspend simulation. Blur auto-pauses. Validated versioned saves include every fish, growth, timer, lives and invulnerability; session restart clears the round.
- `tests/feeding-frenzy.test.ts` covers eating/growth, contact invulnerability, bounded time steps and malformed snapshots.

## Community and art research

- Original game sprite archive checked: https://www.spriters-resource.com/pc_computer/feedingfrenzy/page-1/
- Original gameplay reference: https://static-www.ec.popcap.com/support.popcap.com/sites/support.popcap.com/files/XBox_Vol1_manual.pdf
- Original sprites are archived but are not released under an open redistribution license. This adaptation uses the repository ASSETS.md recommendation: **Kenney Fish Pack 2.0, CC0**.
- Creator/community source: https://opengameart.org/content/fish-pack-0
- Download: https://opengameart.org/sites/default/files/kenney_fish-pack_2.0.zip
- `assets/*.png` are original files from `PNG/Default` in that archive, without repainting. `assets/License.txt` is retained. `cover.svg` arranges the same fish PNG with an original vector background.

Validation: targeted logic tests, typecheck and scoped Biome pass. Local Chromium exercised actual pointer/keyboard actions, pause, refresh and saved-session continuation. Feeding Frenzy and Insaniquarium were also checked at 390 × 844. Browser error logs were empty. Physical devices and full end-to-end campaign completion have not been tested.

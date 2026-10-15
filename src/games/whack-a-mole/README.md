# 打地鼠 / Whack-a-Mole

Original Phaser plugin at `/#/game/whack-a-mole`. Nine holes, five rounds of
30/30/35/35/40 seconds and round goals of 160/240/340/420/540 points.
The next round speeds up spawns and reduces exposure time. Each round must run
to the bell; meeting the goal early lets you keep scoring.

- Click/tap a hole, or use 1–9 / QWE, ASD, ZXC in screen reading order.
- Enter / Space starts, continues or retries. P / Esc pauses through SessionScene.
- Regular moles start at 10 points; gold starts at 30. Every five consecutive hits
  increases the next hit's bonus by 5, capped at +20. Empty hits break the combo.
- Start with five hearts. Missing a regular mole or hitting dynamite costs one
  heart; ignoring gold or dynamite is safe. Clearing a round restores one heart.
- Snapshots retain targets, their remaining exposure time, the round timer,
  hearts and scores. Ready / intermission screens do not spend time. Finished
  games clear the resumable snapshot while preserving the platform best score.

## Community assets

Sources follow the root ASSETS.md community-first guidance. No new dependency,
runtime download, custom-drawn mole or commercial ripped artwork is used.

- [Whack-A-Key by AugsEU](https://github.com/AugsEU/whack-a-key), **CC0-1.0**,
  pinned at `56d42ee5344d41fb0589475668be0687ce84e95f`: original `mole.png`
  (46×37 frames with one-pixel spacing), `hearts.png` (22×16), `game_bg.png`,
  `bonk.wav` and `nope.wav`. The background's landscape and grass are selected
  as texture frames; the original keyboard layout is replaced by nine cells.
  Gold is a runtime tint. The cover composes the same upstream images.
  Original license is `assets/LICENSE.txt`; original paths and SHA-256 hashes
  are recorded in `assets/SOURCE.json`. No Bevy logo or fonts are included.
- [Mining Pixel Game Asset by acdrnx](https://opengameart.org/content/mining-pixel-game-asset),
  **CC0**: dynamite is imported from the existing Gold Miner assets. Its original
  provenance is preserved in `../gold-miner/assets/SOURCE.json` and `NOTICE.txt`.
- Platform click, clear and game-over sounds use the existing shared audio service.

Also researched: OpenGameArt's `a Mole` (GPL-2.0, blade character) and itch.io's
`Moles Attack Game Assets` (paid). Neither pack is included.

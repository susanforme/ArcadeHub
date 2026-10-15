# Color Lines / 五子连珠

Native Phaser plugin at `/#/game/color-lines`. The game preserves the classic
9×9 board, seven colors, five starting balls, three-color preview, orthogonal
empty-cell pathfinding, and horizontal/vertical/diagonal lines of five or more.
A move that clears a line does not add balls or consume the preview. After an
ordinary move the preview is placed in random empty cells; any resulting lines
are cleared before checking for a full-board loss. Overlapping lines count each
ball once. Each removed ball scores 2 points; five balls score 10.

Click/tap a ball and a destination. Arrow keys/WASD or the gamepad move the
cursor; Enter/Space/A selects, Z/B cancels. The selected ball animates with the
community sprite's existing frames and legal moves visibly follow their path.
Pause, blur, restart, score, global sound settings, and IndexedDB resume use
`SessionScene`. A save during travel contains the committed move, so returning
cannot duplicate a turn. Dynamic HUD text follows the current language.

## Community resources and fidelity

- Rules/code reference: [cmsrs/balllines](https://github.com/cmsrs/balllines),
  commit `4ef152e7a47dbfbf3050132aa15303af116b5d0c`, MIT. Its JavaScript is
  not copied. That reference's optional board/color variants are not included.
- Actual ball sprite: [GNOME/five-or-more](https://github.com/GNOME/five-or-more),
  commit `3ab38fec52dfa58acb4791f5d1564759e8fa2658`, `data/balls.svg`.
  It is community artwork from a long-running Color Lines port, not the 1992
  Gamos or Windows graphics. Only an accessible SVG title was added. The full
  source SVG and GPL-2.0-or-later license are supplied in `assets`.
- Published gameplay reference:
  [i Color Lines rules](https://icolorlines.com/how-to-play-icolorlines/).
- No fixed community level pack is appropriate: classic Color Lines generates
  its board during play. The original DOS podium/leaderboard presentation is
  replaced by the platform's score UI. Original sound files were unavailable;
  effects use the existing shared audio pack.

`assets/SOURCE.json` records upstream commits and SHA-256 values.
`tests/color-lines.test.ts` covers legal/blocked paths, preview consumption,
long/diagonal/crossing lines, spawn clears, full boards, and snapshot validation.

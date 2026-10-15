# Puyo Puyo

Single-player endless Puyo-style puzzle game, implemented as a Phaser plugin.
The 6-column board has 12 visible rows and one hidden entrance row.

- Move a falling pair, rotate in either direction with wall/floor kicks, soft
  drop, or hard drop. A short landing delay allows a final adjustment.
- Each blob falls independently after landing. Groups of four or more
  orthogonally connected colors disappear; falling blobs can start a chain.
- Chain power, simultaneous colors and large groups increase the score.
  Clearing the board awards 1,000 points. Speed increases every 12 pairs.
- The next pair and landing preview are shown. Blocking the entrance ends
  the game after the current chain resolves.
- SessionScene provides pause, focus-loss pause, score, autosave and restart.
  Saves include resolution phases, so reloading a flashing chain does not
  award its score twice.

Controls: arrows / A D move, down / S soft drop, up / W / Space hard drop,
X / E rotate clockwise, Z / Q rotate anticlockwise, P / Esc pause. Touch
controls use the shared D-pad plus A (clockwise) and B (anticlockwise).
After game over, Enter / Space or a physical gamepad's A button restarts.

The PNG sprites are the CC0 OpenGameArt "Puyo Puyo Blobs" pack by
marie_iskandar. See `assets/NOTICE.txt` for source and licensing details.

Scope: single-player endless mode; no opponents, nuisance blobs or multiplayer.
Logic tests cover rotation, landing, chains, top-out and saved resolution.

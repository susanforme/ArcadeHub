# Lode Runner

The complete classic Apple II 150-level campaign from Simon Hung's
[LodeRunner TotalRecall](https://github.com/SimonHung/LodeRunner_TotalRecall),
pinned at `cceca5d5a15a21f724836654a46bf2501968e142` (2.30e / AI v4).

This integration retains the upstream runner and guard rules, 28 × 16 maps,
Apple II PNG sprite sheets, and MP3 effects. That includes four-way movement,
ladders, hanging from ropes, false bricks, timed digging and filling, guard
pursuit, carrying/dropping gold, escaping holes and respawning, hidden exit
ladders, 250-point gold, 75-point traps/burials, and 1500-point level completion.
It starts with five lives and grants one life per completed level, up to 100.
All 150 levels are available in the opening selector.

The host uses the existing `SessionScene`, keyboard/gamepad/touch input, global
Howler volume, pause and storage. It drives the original normal speed at 23
logic ticks per second and draws the original sprite sheets to a Phaser
CanvasTexture, refreshing that texture for WebGL. It adds no iframe, browser
global, CreateJS dependency, separate requestAnimationFrame, DOM controls,
network leaderboard or independent storage system.

Snapshots include the exact map, runner/guards, carried gold, active digging,
fill/shake/rebirth timers, sprite animation, score, life count, and seeded RNG.
The respawn column sequence is serializable, so restoring a checkpoint preserves
future random choices. Invalid snapshots are rejected. The scene owns all
sounds and unloads them on shutdown; pausing freezes both gameplay and audio.

Controls: arrows/WASD move, Z/J dig left, X/K/Space dig right, Enter starts the
selected level, R loses a life to retry a trapped position, P/Esc pauses. Gamepad
A digs right, B digs left, X retries. The menu supports pointer/touch selection.

The integration omits TotalRecall's editor, demonstrations, additional campaigns,
C64 theme, high-score server, and page-level menu. Its transitions use short,
simulation-driven delays instead of the upstream DOM/Tween/timer effects.

`tests/lode-runner.test.ts` covers all 150 level records, guard trapping and gold
release, hole timing, exit ladders, progression, lives, exact checkpoint resume,
and malformed saves. Focused tests and scoped Biome checks pass. Browser checks
covered the original graphics, keyboard movement and gold collection, pause and
reload/resume through IndexedDB, and virtual direction/dig buttons at a 390 ×
844 viewport. These checks do not replace a physical phone or gamepad check.

See [assets/NOTICE.txt](./assets/NOTICE.txt) for asset and license provenance. The
selected upstream does not provide a redistribution license; these assets are
not claimed to be CC0 or MIT.

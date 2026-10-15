# Snow Bros.

Single-player Phaser plugin at `/#/game/snow-bros`. Four stages use the original
arcade scenery and character sheets documented in `assets/SOURCES.md`.
Platform collision surfaces match the visible ledges in those scenes.

Move with Left/Right or A/D. Jump with Space, K, Up or W. Hold J/X to throw snow;
four hits freeze an enemy into a snowball. Stand close and fire again to push it.
Rolling balls knock out other enemies for increasing chain scores and drop food.
Frozen enemies thaw if left alone. Three enemy types walk, jump or spit fire.

The shared virtual gamepad uses A for snow/pushing and B for jumping. Enter, either
action or tapping the canvas starts a round and restarts after losing or winning.
P/Esc and the platform pause button freeze the simulation; losing window focus
also pauses. Session saves include actors, projectiles, pickups, timers, score,
lives and the current floor. Clearing all four floors wins the run.

`tests/snow-bros.test.ts` covers platform landing, freezing, rolling chains,
thawing, life loss, stage progression and invalid snapshots. This is a four-stage
interpretation with shared ArcadeHub sound effects, not the complete original
50-stage game or a two-player mode.

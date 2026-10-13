# Battle City

Engine, 35 stages, pixel sprite drawing routines and sound effects adapted from
[feichao93/battle-city](https://github.com/feichao93/battle-city), MIT license.
Upstream commit: `86c41c8c3c49cd27255bcf63167091d1061801fa`.
The original license is preserved in `LICENSE`.

ArcadeHub uses its existing Phaser runtime with a Canvas renderer adapter. No
PixiJS, upstream React UI, LAN server, gallery or editor dependencies are included.
Single-player and local two-player modes use the original engine. Saves preserve
current-stage opening lives, score and tank upgrades; continuing restarts that
stage rather than restoring mid-battle positions.

Vendor changes: sprite atlas stores Canvas images rather than Pixi textures;
unused Game/FireDemo/textView removed; formatting/import ordering adapted to Biome.

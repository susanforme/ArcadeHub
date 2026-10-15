# Doodle Jump artwork

Source: https://github.com/kubowania/Doodle-Jump
Pinned commit: caa860657407975354ca23cd4a48c7fda4031c92
Community author: Ania Kubow
Upstream license: MIT, declared in the repository README; notice retained in LICENSE.

Copied without modification:

- `doodler-guy.png`: classic-looking yellow/green Doodler, 87 × 85.
- `platform.png`: hand-drawn green platform, 85 × 15.
- `background.png`: warm graph paper, 400 × 600.

`cover.svg` arranges embedded copies of those three PNG files for the lobby.
The game loads local imports, including for offline packaging; it does not hotlink assets.
Jump and game-over sounds reuse ArcadeHub's shared audio service and settings.

This is a community remake resource set, not a verified official asset release.
The upstream MIT notice is preserved as provided; it does not establish ownership
of the original Doodle Jump character or trademarks, which belong to Lima Sky.

## Asset search

Consulted the project's ASSETS.md and searched OpenGameArt and GitHub for Doodle
Jump resources. Selected this community set for its classic character, platform
and paper appearance and its explicit upstream license notice.

## Gameplay

The 400 × 600 portrait game uses automatic bouncing and left/right steering only.
Every platform is permanent and generated from the previous one: vertical gaps
are 60–112 logical pixels, below the approximately 151-pixel jump apex. Horizontal
offsets use 60% of the available travel before descending to the next platform,
leaving a margin even when taking off near a platform edge. Difficulty increases
gradually over the first 6,000 pixels, then stops increasing. Platforms below the
view are removed and new reachable platforms are generated above it.

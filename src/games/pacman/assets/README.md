# Pac-Man reference and modifications

Reference: https://github.com/masonicGIT/pacman
Commit: 7407174c1d6a38be8cd230577489e39e0873145b
Copyright: 2012 Shaun Williams
License: GNU GPL version 3, retained in LICENSE.

Modified for ArcadeHub on 2026-10-13: the classic maze and selected original sounds are adapted into a TypeScript / Phaser 4 game plugin. The original page, Canvas renderer, menus, and native game loop are not embedded. The Phaser scene draws the maze and animated actors, handles swipe steering, and uses the existing SessionScene, InputManager, Howler audio, IndexedDB saves and DPR display. The ghost target and scatter/chase rules follow the reference; movement speeds, release delays, death animation, fruit graphics and transition timing are approximated. No Ms. Pac-Man, Crazy Otto, Cookie-Man, practice/rewind, turbo, or cutscenes are included.

Original start, death, ghost-eating, fruit-eating and extra-life sounds are distributed. Pellet and power sounds use the platform's existing short effects to avoid overlapping the reference's long eating recordings.

The modified Pac-Man plugin is distributed under GPL-3.0. There is no warranty. Production builds include `licenses/pacman.txt`; the application's source, assets, dependency lockfile and build configuration are available at https://github.com/susanforme/ArcadeHub. The in-game footer links to the license and repository. Other bundled assets retain their own license notices. Build with `bun install --frozen-lockfile` followed by `bun run build`.

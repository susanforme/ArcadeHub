# Community Sokoban levels

The playable levels are the complete **Microban II (135)** and **Sasquatch (50)** sets by **David W. Skinner**, `sasquatch@bentonrea.com`, totaling 185 levels. The previous ten ArcadeHub-authored maps have been removed.

Original author site: http://users.bentonrea.com/~sasquatch/sokoban/

Community mirror: https://github.com/rprouse/Arduban/tree/ebaf236540eb9329040eb434f536e69fcad79f9b/Assets/Levels

The raw `.txt` files are unmodified copies from that fixed commit. `SOURCE.json` records the upstream paths, Git blob IDs and SHA-256 values. `NOTICE.txt` preserves the author credit and distribution conditions, as recorded in the [Enigma developers' correspondence](https://lists.gnu.org/archive/html/enigma-devel/2003-12/msg00018.html). These level sets use those distribution terms, not Kenney's CC0 art license or the mirror's software license.

At runtime `levels.ts` reads the XSB text, preserves original collection order, level numbers, named puzzle titles, walls, crates, goals and player starts. Short rows are padded with exterior void; a boundary flood fill classifies outside spaces as non-playable. Disconnected crates already on goals remain intact, including the large one-crate maze levels. No puzzles are generated, rearranged, mirrored or simplified.

The in-game selector switches collections and pages of 25 levels. Each distinct puzzle awards 100 points once, including when reselected or undone. Saves record stable puzzle IDs, completed puzzles and undo history. Version 1 saves from the removed original maps are incompatible with the new layouts and start at Microban II #1; the platform retains historical best scores.

Tests verify raw file hashes, all 185 initial states and preservation of every source tile. Representative solutions are replayed through the actual movement rules, including both collections and a large maze. The full catalog is not exhaustively re-solved by the test suite.

Production builds distribute `levels/sokoban/` with the original files and credits, and include it in the offline cache.

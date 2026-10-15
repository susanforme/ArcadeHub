# Windows Solitaire / Klondike

Native Phaser plugin at `/#/game/klondike`. Uses the original Windows card
faces and back extracted by the community; exact provenance and copyright
status are in `assets/NOTICE.txt`. No generic replacement deck or text cards.

Implements the classic seven-column deal, alternating-color descending runs,
Kings in empty columns, same-suit ascending foundations, explicit hidden-card
flips, draw-one/draw-three stock and recycling. Standard scoring: +5 for a
flip or waste-to-tableau, +10 to a foundation, -15 from a foundation, -2 each
10 seconds, -100 draw-one recycling or -20 after the third draw-three pass.
Wins after 30 seconds award floor(700000 / seconds). Undo costs two points.

Drag a single card or valid stack, or tap source then destination. Double tap
a top card to send it to a foundation. Keyboard arrows/Enter select/place;
Space draws, Z undoes, H hints, F sends the selection to a foundation.
Gamepad directions and A/B/X/Y provide select/draw/undo/hint. The touchscreen
uses direct card manipulation rather than an overlay obscuring the cards.

Pause, restart, score, volume and IndexedDB saves use the platform. A save
includes the full 52-card permutation, face-up flags, draw mode, stock pass,
time and up to 60 undo states, validated before restoring. Hints suggest legal
moves; they are not a solver. Auto-complete is available when all cards are
exposed and the stock/waste are empty.

Differences from the original Windows executable: platform chrome with a
compact translated toolbar; no Vegas scoring, deck picker or bouncing-card
win animation. Deals are random and can be unwinnable, as in classic Klondike.

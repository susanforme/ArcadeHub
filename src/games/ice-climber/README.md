# Ice Climber

A 15-layer mountain platformer with Kenney CC0 winter sprite art. Jump to smash
breakable ice from below, drift sideways to land above, hammer approaching Topis,
collect mushroom bonuses, ride moving clouds and reach the summit. Topis repair holes;
subsequent mountains change opening positions and increase patrol speed.

Player 1: Left/Right, Up/Space jump, J/X hammer. Click/tap the board to jump.
Player 2: press 2 or click Join, then A/D, W jump, F hammer. Co-op shares three
lives and one camera that follows the highest climber; falling below the viewport
loses a life and respawns on a visible, unbreakable edge tile with protection.
The mobile virtual pad controls player 1. Local co-op needs a keyboard; two
separate touch/gamepad input sources are not advertised. P/Esc pauses.

The fixed 60 Hz simulation is independent of Phaser. Jump height is about 140 px
against 100 px layer spacing. `tests/ice-climber.test.ts` exercises actual jumps
between all 14 adjacent layer pairs across eight layouts, plus hammer combat,
shared lives, summit transitions, save validation and exact resume. Short input
edges stay queued until a simulation tick; browser focus loss pauses through
`SessionScene`. Saves include broken tiles, enemy/cloud positions, both players,
viewport, fruit, lives and score. Restart is supplied by the host UI.

Community research:
- [IceClimberClone](https://github.com/albertnadal/IceClimberClone): gameplay and entity behavior reference; its distribution-restricted graphics are excluded.
- [Community mountain 01](https://github.com/albertnadal/IceClimberClone/blob/master/levels/mountain01.dat) and its 32-mountain collection were inspected as level references.
- [Spriters Resource original NES sheet](https://www.spriters-resource.com/nes/iceclimbers/asset/34779/): reference for original characters and tiles.

The shipped layout is independently generated, not a 32-map ROM conversion.
This adaptation omits the separate timed condor bonus stage and exact NES enemy
AI/timing. See `assets/NOTICE.md`: graphics use Kenney CC0 packs from ASSETS.md
instead of the distribution-restricted original community atlas. Browser/device
validation is reported by the integration owner.

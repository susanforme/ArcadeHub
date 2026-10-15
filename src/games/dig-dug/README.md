# Dig Dug

An ArcadeHub adaptation with original arcade sprite artwork, excavated tunnels,
four-stage enemy inflation/deflation, temporary ghost movement, Fygar fire,
falling rocks with increasing multi-kill points, vegetable bonuses and escalating
rounds. Three lives, respawn protection, game over and the host's restart UI.

Arrows/WASD move and dig. Hold Space/J or touch Pump to inflate the first monster
in a clear three-cell line. Click/tap the board also pumps once. Dig under a rock,
then move away; rocks can kill the player as well as monsters. After two rock
drops, collect the vegetable at the central start point. P/Esc pauses. Keyboard,
gamepad and the existing mobile virtual pad use the same input contract.

`SessionScene` supplies pause, five-second autosave, exit-save, restore and score.
The fixed 100 ms simulation records all timers, dirt, rocks, monster inflation,
fire and player state. Saves are validated before use; terminal games restart.

Community research:
- [DigDugJS](https://github.com/lazyleung/DigDugJS): original sprite-sheet reference.
- [Original arcade operator manual](https://www.mamechannel.it/files_free/arcade_manuals_unpacked/digdugat.pdf): pump and falling-rock rules.
- [StrategyWiki gameplay](https://strategywiki.org/wiki/Dig_Dug/Gameplay) and [walkthrough](https://strategywiki.org/wiki/Dig_Dug/Walkthrough): tunnel tactics, rock support and sequential enemy inflation.

Maps are independent deterministic layouts, not a claim to reproduce original
ROM rounds or exact arcade timing. No emulator, upstream engine or dependencies
are added. `tests/dig-dug.test.ts` covers inflation, obstructed hoses, excavation,
rock multi-kills, lives, round transition and deterministic save recovery.
See `assets/NOTICE.md` for the original-art copyright boundary.

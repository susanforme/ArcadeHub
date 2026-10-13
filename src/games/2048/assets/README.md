# 2048 reference

Reference: https://github.com/gabrielecirulli/2048
Commit: 478b6ec346e3787f589e4af751378d06ded4cbbc
Copyright: (c) 2014 Gabriele Cirulli
License: MIT, retained in LICENSE and distributed as licenses/2048.txt.

Game rules and palette are adapted into the existing TypeScript / Phaser 4 plugin architecture. The original DOM actuator, HTML, CSS application, and localStorage game implementation are not embedded. Graphics, text, movement/merge animation and victory controls are rendered by Phaser; the platform provides React UI, input controls, audio, full-screen display, DPR rendering and IndexedDB saves.

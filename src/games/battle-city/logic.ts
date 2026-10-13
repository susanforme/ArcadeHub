import { PLAYER_SPAWN_POS } from './vendor/engine/constants';
import GameSession from './vendor/engine/GameSession';
import type { AudioPort, TankLevel } from './vendor/engine/types';
import { PLAYER1_CONTROL, PLAYER2_CONTROL } from './vendor/input/bindings';
import { stages } from './vendor/stages';

export { stages };
export interface Checkpoint {
  version: 1;
  stageIndex: number;
  players: { lives: number; score: number; level: TankLevel | null }[];
}
export function isCheckpoint(value: unknown): value is Checkpoint {
  if (!value || typeof value !== 'object') return false;
  const s = value as Checkpoint;
  return (
    s.version === 1 &&
    Number.isInteger(s.stageIndex) &&
    s.stageIndex >= 0 &&
    s.stageIndex < stages.length &&
    Array.isArray(s.players) &&
    s.players.length >= 1 &&
    s.players.length <= 2 &&
    s.players.every(
      (p) =>
        p &&
        Number.isInteger(p.lives) &&
        p.lives >= 0 &&
        p.lives <= 999 &&
        Number.isInteger(p.score) &&
        p.score >= 0 &&
        p.score <= 1e9 &&
        (p.level === null ||
          ['basic', 'fast', 'power', 'armor'].includes(p.level)),
    )
  );
}
export function checkpoint(session: GameSession): Checkpoint {
  return {
    version: 1,
    stageIndex: session.stageIndex,
    players: session.players.map((p) => ({
      lives: p.lives,
      score: p.score,
      level: p.reservedTankLevel,
    })),
  };
}
export function newBattle(
  audio: AudioPort,
  stageIndex = 0,
  twoPlayers = false,
  saved?: Checkpoint,
  random: () => number = Math.random,
) {
  const configs = [
    {
      control: PLAYER1_CONTROL,
      color: 'yellow' as const,
      spawnPos: PLAYER_SPAWN_POS.player1,
    },
    {
      control: PLAYER2_CONTROL,
      color: 'green' as const,
      spawnPos: PLAYER_SPAWN_POS.player2,
    },
  ];
  const session = new GameSession(
    stages,
    saved?.stageIndex ?? stageIndex,
    configs.slice(0, saved?.players.length ?? (twoPlayers ? 2 : 1)),
    audio,
    { autopilot: false, random },
  );
  saved?.players.forEach((p, i) => {
    session.players[i].lives = p.lives;
    session.players[i].score = p.score;
    session.players[i].reservedTankLevel = p.level;
  });
  return session;
}

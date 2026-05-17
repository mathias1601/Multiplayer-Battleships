import { BOARD_SIZE } from './fleet';

export type ShotMarker = null | 'hit' | 'miss';

export type ShotGrid = ShotMarker[][];

export function createEmptyShots(): ShotGrid {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function markShot(
  grid: ShotGrid,
  row: number,
  col: number,
  marker: 'hit' | 'miss'
): ShotGrid {
  return grid.map((r, ri) =>
    r.map((cell, ci) => (ri === row && ci === col ? marker : cell))
  );
}

export type FireResult =
  | {
      ok: true;
      row: number;
      col: number;
      hit: boolean;
      sunk?: boolean;
      gameOver?: boolean;
    }
  | { ok: false; error: string };

export type OpponentFiredPayload = {
  row: number;
  col: number;
  hit: boolean;
  sunk?: boolean;
};

export type GameOverPayload = {
  result: 'win' | 'lose';
};

import { BOARD_SIZE, FLEET_LENGTHS, type Placement, type Ship } from './fleet';

export type BoardGrid = (null | number)[][];

export function createEmptyBoard(): BoardGrid {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function getShipCells(ship: Ship | Placement): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let i = 0; i < ship.length; i++) {
    const row = ship.horizontal ? ship.row : ship.row + i;
    const col = ship.horizontal ? ship.col + i : ship.col;
    cells.push({ row, col });
  }
  return cells;
}

function inBounds(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function canPlaceShip(board: BoardGrid, ship: Ship): boolean {
  for (const { row, col } of getShipCells(ship)) {
    if (!inBounds(row, col)) return false;
    if (board[row][col] !== null) return false;
  }
  return true;
}

export function applyShip(board: BoardGrid, ship: Ship) {
  for (const { row, col } of getShipCells(ship)) {
    board[row][col] = ship.id;
  }
}

export function boardFromPlacements(placements: Placement[]): BoardGrid {
  const board = createEmptyBoard();
  placements.forEach((p, index) => {
    applyShip(board, { id: index + 1, ...p });
  });
  return board;
}

export function canPlaceAt(
  placements: Placement[],
  length: number,
  row: number,
  col: number,
  horizontal: boolean
): boolean {
  const board = boardFromPlacements(placements);
  const ship: Ship = { id: placements.length + 1, length, row, col, horizontal };
  return canPlaceShip(board, ship);
}

export function previewCells(
  length: number,
  row: number,
  col: number,
  horizontal: boolean
): { row: number; col: number }[] {
  return getShipCells({ id: 0, length, row, col, horizontal });
}

export function remainingShipLengths(placements: Placement[]): number[] {
  const pool = [...FLEET_LENGTHS];
  for (const p of placements) {
    const index = pool.indexOf(p.length);
    if (index >= 0) pool.splice(index, 1);
  }
  return pool;
}

export function isFleetComplete(placements: Placement[]): boolean {
  return remainingShipLengths(placements).length === 0;
}

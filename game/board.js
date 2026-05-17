export const BOARD_SIZE = 10;

export const FLEET_LENGTHS = [5, 4, 3, 3, 2];


// Create the grid, essentially two for loops iterating over BOARD_SIZE
export function createBoard() {
    return Array.from({length: BOARD_SIZE}, () =>
        Array.from({ length: BOARD_SIZE }, () => null)
    ); 
}

// Get the coordinates of a ship, eg. [[x1, y1], [x2, y2]]
function getShipCells(ship) {
    const cells = [];

    for (let i = 0; i < ship.length; i++) {
        const row = ship.horizontal ? ship.row : ship.row + i;
        const col = ship.horizontal ? ship.col + i : ship.col;
        cells.push({row, col});
    }

    return cells;
}


// Check if the x, y - coordinates are inside the map
function inBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}


// Check if you are allowed to place the ship there
export function canPlaceShip(board, ship) {
  const cells = getShipCells(ship);
  for (const { row, col } of cells) {
    if (!inBounds(row, col)) return false;
    if (board[row][col] !== null) return false; // overlap or already occupied
  }
  return true;
}

// Place a ship on the board
export function placeShip(board, ship) {
  if (!canPlaceShip(board, ship)) {
    return { ok: false, error: 'Invalid placement' };
  }
  for (const { row, col } of getShipCells(ship)) {
    board[row][col] = ship.id;
  }
  return { ok: true };
}


// Place all ships on the board
export function placeFleet(board, ships) {
  for (const ship of ships) {
    const result = placeShip(board, ship);
    if (!result.ok) return result;
  }
  return { ok: true };
}


// Fire and check if the (row, col) is not null. Either hit or miss
// Swap a cell's value from the shipid to hit
export function fire(board, row, col) {
  if (!inBounds(row, col)) {
    return { ok: false, error: 'Out of bounds' };
  }

  const cell = board[row][col];
  if (cell === 'miss' || cell === 'hit') {
    return { ok: false, error: 'Already shot here' };
  }

  if (cell === null) {
    board[row][col] = 'miss';
    return { ok: true, hit: false };
  }

  const shipId = cell;
  board[row][col] = 'hit';

  const sunk = isShipSunk(board, shipId);
  return { ok: true, hit: true, shipId, sunk };
}

// Check if the all rows and columns of a ship has been hit
function isShipSunk(board, shipId) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === shipId) return false;
    }
  }
  return true;
}

// Check if ALL ships have been sunk, game is over in that case
export function allShipsSunk(board) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (typeof cell === 'number') return false; // unhit ship segment
    }
  }
  return true;
}


// Helper function to check if client has given appropriate values
function isValidPlacement(p) {
  return (
    p &&
    typeof p.length === 'number' &&
    typeof p.row === 'number' &&
    typeof p.col === 'number' &&
    typeof p.horizontal === 'boolean' &&
    Number.isInteger(p.row) &&
    Number.isInteger(p.col) &&
    Number.isInteger(p.length)
  );
}


// Initialize a fleet, the placement of multiple ships when the player is finished
export function buildFleet(placements) {
  /* if (!Array.isArray(placements) || placements.length !== FLEET_LENGTHS.length) {
    return { ok: false, error: 'Must place exactly 5 ships' };
  } */

  for (const p of placements) {
    if (!isValidPlacement(p)) {
      return { ok: false, error: 'Invalid placement data' };
    }
  }

  const lengths = placements.map((p) => p.length).sort((a, b) => a - b);
  const expected = [...FLEET_LENGTHS].sort((a, b) => a - b);
  if (lengths.some((len, i) => len !== expected[i])) {
    return { ok: false, error: 'Ship lengths must match the fleet' };
  }

  const ships = placements.map((p, index) => ({
    id: index + 1,
    length: p.length,
    row: p.row,
    col: p.col,
    horizontal: p.horizontal,
  }));

  return { ok: true, ships };
}



export function setupBoard(placements) {
  const board = createBoard();
  const fleet = buildFleet(placements);
  if (!fleet.ok) return fleet;

  const placed = placeFleet(board, fleet.ships);
  if (!placed.ok) return placed;

  return { ok: true, board };
}
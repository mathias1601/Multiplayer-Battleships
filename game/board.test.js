import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBoard,
  placeShip,
  placeFleet,
  fire,
  allShipsSunk,
  BOARD_SIZE,
} from './board.js';

test('placeShip rejects overlap', () => {
  const board = createBoard();
  const a = { id: 1, length: 3, row: 0, col: 0, horizontal: false };
  const b = { id: 2, length: 2, row: 0, col: 1, horizontal: true }; // overlaps a

  assert.equal(placeShip(board, a).ok, true);
  assert.equal(placeShip(board, b).ok, false);
});

test('fire hit and sunk on length-1 ship', () => {
  const board = createBoard();
  placeShip(board, { id: 1, length: 1, row: 5, col: 5, horizontal: true });

  const shot = fire(board, 5, 5);
  assert.equal(shot.ok, true);
  assert.equal(shot.hit, true);
  assert.equal(shot.sunk, true);
  assert.equal(allShipsSunk(board), true);
});

test('fire rejects duplicate shot', () => {
  const board = createBoard();
  fire(board, 0, 0);
  const again = fire(board, 0, 0);
  assert.equal(again.ok, false);
});
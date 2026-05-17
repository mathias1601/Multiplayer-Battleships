import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { setupBoard, fire, allShipsSunk } from './game/board.js';

const PORT = 3001;
const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** @type {Map<string, { code: string, hostId: string, guestId?: string }>} */
const rooms = new Map();

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function allocateRoomCode() {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));
  return code;
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000'],
  },
});


// Helper function to get role
function getRole(room, socketId) {
  if (room.hostId === socketId) return 'host';
  if (room.guestId === socketId) return 'guest';
  return null;
}

io.on('connection', (socket) => {

  // Create room
  socket.on('createRoom', (callback) => {
    if (typeof callback !== 'function') return;

    if (socket.data.roomCode) {
      callback({ ok: false, error: 'Already in a room' });
      return;
    }

    const code = allocateRoomCode();
    rooms.set(code, { code, hostId: socket.id });
    socket.join(code);
    socket.data.roomCode = code;

    // Initialize the room
    rooms.set(code, {
      code,
      hostId: socket.id,
      phase: 'lobby',
      hostBoard: null,
      guestBoard: null,
      hostPlaced: false,
      guestPlaced: false,
    });

    console.log(`[room] created ${code} host=${socket.id}`);
    callback({ ok: true, roomCode: code });
  });


  // Join room
  socket.on('joinRoom', (payload, callback) => {
    if (typeof callback !== 'function') return;

    const roomCode = payload?.roomCode?.toUpperCase?.().trim();
    if (!roomCode) {
      callback({ ok: false, error: 'Room code required' });
      return;
    }

    if (socket.data.roomCode) {
      callback({ ok: false, error: 'Already in a room' });
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      callback({ ok: false, error: 'Room not found' });
      return;
    }
    if (room.guestId) {
      callback({ ok: false, error: 'Room is full' });
      return;
    }
    if (room.hostId === socket.id) {
      callback({ ok: false, error: 'Cannot join your own room' });
      return;
    }

    room.guestId = socket.id;
    socket.join(roomCode);
    socket.data.roomCode = roomCode;


    // Switch to placement phase when another guest has joined the room
    room.phase = 'placing';

    console.log(`[room] ${roomCode} guest=${socket.id}`);
    callback({ ok: true, roomCode });
    io.to(roomCode).emit('playerJoined', { roomCode, players: 2 });
  });


  // Disconnect from room
  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    if (room.hostId === socket.id) {
      rooms.delete(roomCode);
      console.log(`[room] deleted ${roomCode} (host left)`);
      if (room.guestId) {
        io.to(room.guestId).emit('roomClosed', { roomCode });
      }
      return;
    }

    if (room.guestId === socket.id) {
      room.guestId = undefined;
      console.log(`[room] ${roomCode} guest left`);
      io.to(roomCode).emit('playerLeft', { roomCode, players: 1 });
    }
  });


  // Handle ship placements from the client
  socket.on('placeShips', (payload, callback) => {
    if (typeof callback !== 'function') return;

    const roomCode = socket.data.roomCode;
    if (!roomCode) {
      callback({ ok: false, error: 'Not in a room' });
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      callback({ ok: false, error: 'Room not found' });
      return;
    }

    if (!room.guestId) {
      callback({ ok: false, error: 'Waiting for opponent' });
      return;
    }

    if (room.phase !== 'placing') {
      callback({ ok: false, error: 'Not in placement phase' });
      return;
    }

    const role = getRole(room, socket.id);
    if (!role) {
      callback({ ok: false, error: 'Not a player in this room' });
      return;
    }

    if (role === 'host' && room.hostPlaced) {
      callback({ ok: false, error: 'Already placed ships' });
      return;
    }
    if (role === 'guest' && room.guestPlaced) {
      callback({ ok: false, error: 'Already placed ships' });
      return;
    }

    const result = setupBoard(payload?.placements);
    if (!result.ok) {
      callback({ ok: false, error: result.error ?? 'Invalid placement' });
      return;
    }

    if (role === 'host') {
      room.hostBoard = result.board;
      room.hostPlaced = true;
    } else {
      room.guestBoard = result.board;
      room.guestPlaced = true;
    }

    console.log(`[room] ${roomCode} ${role} placed ships`);
    callback({ ok: true });

    socket.emit('placementAccepted', { role });

    if (room.hostPlaced && room.guestPlaced) {

      room.phase = 'battle';
      room.turn = 'host';

      io.to(room.hostId).emit('gameStart', {
        roomCode,
        phase: 'battle',
        yourTurn: true,
      });

      io.to(room.guestId).emit('gameStart', {
        roomCode,
        phase: 'battle',
        yourTurn: false,
      });

      console.log(`[room] ${roomCode} battle started`);
    }
  });


  // Handle shots from the client
  socket.on('fire', (payload, callback) => {
    if (typeof callback !== 'function') return;

    const roomCode = socket.data.roomCode;
    if (!roomCode) {
      callback({ ok: false, error: 'Not in a room' });
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      callback({ ok: false, error: 'Room not found' });
      return;
    }

    if (room.phase !== 'battle') {
      callback({ ok: false, error: 'Not in battle' });
      return;
    }

    const role = getRole(room, socket.id);
    if (!role) {
      callback({ ok: false, error: 'Not a player in this room' });
      return;
    }

    if (role !== room.turn) {
      callback({ ok: false, error: 'Not your turn' });
      return;
    }

    const row = payload?.row;
    const col = payload?.col;
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      callback({ ok: false, error: 'Invalid coordinates' });
      return;
    }

    const opponentBoard = role === 'host' ? room.guestBoard : room.hostBoard;
    const opponentId = role === 'host' ? room.guestId : room.hostId;

    const result = fire(opponentBoard, row, col);
    if (!result.ok) {
      callback({ ok: false, error: result.error ?? 'Invalid shot' });
      return;
    }

    const gameOver = allShipsSunk(opponentBoard);

    io.to(opponentId).emit('opponentFired', {
      row,
      col,
      hit: result.hit,
      sunk: result.sunk ?? false,
    });

    callback({
      ok: true,
      row,
      col,
      hit: result.hit,
      sunk: result.sunk ?? false,
      gameOver,
    });

    console.log(
      `[room] ${roomCode} ${role} fired ${row},${col} → ${result.hit ? 'hit' : 'miss'}`
    );

    if (gameOver) {
      room.phase = 'ended';
      io.to(socket.id).emit('gameOver', { result: 'win' });
      io.to(opponentId).emit('gameOver', { result: 'lose' });
      console.log(`[room] ${roomCode} game over, winner=${role}`);
      return;
    }

    room.turn = role === 'host' ? 'guest' : 'host';
    io.to(room.hostId).emit('turnChange', { yourTurn: room.turn === 'host' });
    io.to(room.guestId).emit('turnChange', { yourTurn: room.turn === 'guest' });
  });

  // Handle requesting rematch
  socket.on('requestRematch', (payload, callback) => {
    if (typeof callback !== 'function') return;

    const roomCode = payload?.roomCode?.toUpperCase?.().trim();

    const room = rooms.get(roomCode);
    if (!room) {
      callback({ ok: false, error: 'Room not found' });
      return;
    }


    const role = getRole(room, socket.id);

    if (role === 'host') {
      io.to(room.guestId).emit('rematch');
    }
    else {
      io.to(room.hostId).emit('rematch')
    }
    console.log(`[room] ${roomCode} requesting rematch`);
  });


  // Handle accepting rematch
  socket.on('acceptRematch', (payload, callback) => {
    if (typeof callback !== 'function') return;

    const roomCode = payload?.roomCode?.toUpperCase?.().trim();

    const room = rooms.get(roomCode);
    if (!room) {
      callback({ ok: false, error: 'Room not found' });
      return;
    }

    // Reset the room
    room.phase = 'placing';
    room.hostBoard = null;
    room.guestBoard = null;
    room.hostPlaced = false;
    room.guestPlace = false;


    io.to(room.guestId).emit('rematchAccept');
    io.to(room.hostId).emit('rematchAccept')
  });



});

server.listen(PORT, () => {
  console.log(`Game server running at http://localhost:${PORT}`);
});

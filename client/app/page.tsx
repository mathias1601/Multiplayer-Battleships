'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import type { LobbyStatus, RoomResult } from '@/lib/room';
import type { Placement } from '@/lib/fleet';
import {
  createEmptyShots,
  markShot,
  type FireResult,
  type GameOverPayload,
  type OpponentFiredPayload,
  type ShotGrid,
} from '@/lib/battle';
import { PlacementBoard } from '@/components/PlacementBoard';
import { BattleView } from '@/components/BattleView';

export default function Home() {
  const [status, setStatus] = useState<LobbyStatus>('idle');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [myTurn, setMyTurn] = useState(false);
  const [shipsSubmitted, setShipsSubmitted] = useState(false);
  const [myPlacements, setMyPlacements] = useState<Placement[]>([]);
  const [shotsOnOpponent, setShotsOnOpponent] = useState<ShotGrid>(createEmptyShots);
  const [shotsReceived, setShotsReceived] = useState<ShotGrid>(createEmptyShots);
  const [gameOverResult, setGameOverResult] = useState<'win' | 'lose' | null>(
    null
  );

  useEffect(() => {
    const onGameStart = (payload: { yourTurn?: boolean }) => {
      setStatus('battle');
      setMyTurn(Boolean(payload.yourTurn));
      setShotsOnOpponent(createEmptyShots());
      setShotsReceived(createEmptyShots());
      setGameOverResult(null);
    };
    const onTurnChange = (payload: { yourTurn: boolean }) => {
      setMyTurn(payload.yourTurn);
    };
    const onOpponentFired = (payload: OpponentFiredPayload) => {
      setShotsReceived((grid) =>
        markShot(grid, payload.row, payload.col, payload.hit ? 'hit' : 'miss')
      );
    };
    const onGameOver = (payload: GameOverPayload) => {
      setStatus('ended');
      setGameOverResult(payload.result);
      setMyTurn(false);
    };

    socket.on('gameStart', onGameStart);
    socket.on('turnChange', onTurnChange);
    socket.on('opponentFired', onOpponentFired);
    socket.on('gameOver', onGameOver);

    return () => {
      socket.off('gameStart', onGameStart);
      socket.off('turnChange', onTurnChange);
      socket.off('opponentFired', onOpponentFired);
      socket.off('gameOver', onGameOver);
    };
  }, []);

  const submitPlacements = (placements: Placement[]) => {
    socket.emit('placeShips', { placements }, (res) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      setMyPlacements(placements);
      setShipsSubmitted(true);
    });
  };

  const handleSendRematch = () => {

    socket.emit('requestRematch', {roomCode: roomCode}, (res) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }

      setStatus('waiting');
    });
  }

  const handleRematch = () => {

    socket.emit('acceptRematch', {roomCode: roomCode}, (res) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }

      setStatus('ready')
    });
  }

  const handleFire = (row: number, col: number) => {
    if (!myTurn || gameOverResult) return;
    setError(null);

    socket.emit('fire', { row, col }, (res: FireResult) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShotsOnOpponent((grid) =>
        markShot(grid, res.row, res.col, res.hit ? 'hit' : 'miss')
      );
      if (res.gameOver) {
        setGameOverResult('win');
        setMyTurn(false);
      }
    });
  };

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    
    const onRematch = () => setStatus('rematchRequest');
    const onRematchAccept = () => {
      setStatus('ready');
      setMyPlacements([]);
      setShipsSubmitted(false);
      setMyPlacements([]);
      setShotsOnOpponent(createEmptyShots());
      setShotsReceived(createEmptyShots());
      setGameOverResult(null);

    }

    socket.on('rematch', onRematch);
    socket.on('rematchAccept', onRematchAccept)

    return () => {
      socket.off('rematch', onRematch);
      socket.off('rematchAccept', onRematchAccept)
    };
  }, []);

  useEffect(() => {
    const onPlayerJoined = () => setStatus('ready');
    const onPlayerLeft = () => setStatus('waiting');
    const onRoomClosed = () => {
      setStatus('idle');
      setRoomCode(null);
      setShipsSubmitted(false);
      setMyPlacements([]);
      setShotsOnOpponent(createEmptyShots());
      setShotsReceived(createEmptyShots());
      setGameOverResult(null);
      setError('Host left - room closed');
    };
    socket.on('playerJoined', onPlayerJoined);
    socket.on('playerLeft', onPlayerLeft);
    socket.on('roomClosed', onRoomClosed);
    return () => {
      socket.off('playerJoined', onPlayerJoined);
      socket.off('playerLeft', onPlayerLeft);
      socket.off('roomClosed', onRoomClosed);
    };
  }, []);

  const createRoom = () => {
    setError(null);
    socket.emit('createRoom', (res: RoomResult) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRoomCode(res.roomCode);
      setStatus('waiting');
    });
  };

  const joinRoom = () => {
    setError(null);
    const code = joinInput.trim().toUpperCase();
    if (!code) {
      setError('Enter a room code');
      return;
    }
    socket.emit('joinRoom', { roomCode: code }, (res: RoomResult) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRoomCode(res.roomCode);
      setStatus('ready');
    });
  };

  const showBattle =
    (status === 'battle' || status === 'ended') && myPlacements.length > 0;

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Battleships</h1>
      <p>Socket: {connected ? 'connected' : 'disconnected'}</p>

      {status === 'idle' && (
        <>
          <button type="button" onClick={createRoom}>
            Create room
          </button>
          <div style={{ marginTop: '1rem' }}>
            <input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={4}
            />
            <button
              type="button"
              onClick={joinRoom}
              style={{ marginLeft: '0.5rem' }}
            >
              Join room
            </button>
          </div>
        </>
      )}

      {status === 'waiting' && roomCode && (
        <p>
          Share code: <strong>{roomCode}</strong> — waiting for opponent…
        </p>
      )}

      {status === 'ready' && roomCode && !shipsSubmitted && (
        <>
          <p>
            Room <strong>{roomCode}</strong> — place your fleet
          </p>
          <PlacementBoard onSubmit={submitPlacements} />
        </>
      )}

      {status === 'ready' && roomCode && shipsSubmitted && (
        <p>Waiting for opponent to place ships…</p>
      )}

      {showBattle && (
        <BattleView
          myPlacements={myPlacements}
          shotsOnOpponent={shotsOnOpponent}
          shotsReceived={shotsReceived}
          myTurn={myTurn}
          onFire={handleFire}
          gameOverResult={gameOverResult}
        />
      )}

      {gameOverResult && (
        <button onClick={handleSendRematch}>Request rematch?</button>
      )}

      {status === 'rematchRequest' && (
        <>
          <button onClick={handleRematch}>Accept</button>
          <button>Decline</button>
        </>
      )}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </main>
  );
}


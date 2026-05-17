export type RoomResult =
  | { ok: true; roomCode: string }
  | { ok: false; error: string };

export type LobbyStatus = 'idle' | 'waiting' | 'ready' | 'battle' | 'ended' | 'rematchRequest';
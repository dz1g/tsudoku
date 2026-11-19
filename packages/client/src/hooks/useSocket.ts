import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Room,
  ClientToServerEvents,
  ServerToClientEvents,
  RoomSettings,
  PodiumEntry,
} from '@tsudoku/shared';
import { sounds } from '../utils/audio';

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [podium, setPodium] = useState<PodiumEntry[] | null>(null);
  const [opponentFocus, setOpponentFocus] = useState<Record<string, { row: number; col: number } | null>>({});

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    // In dev, Vite proxies /socket.io to localhost:3001
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setErrorMsg(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room:joined', ({ room, playerId }) => {
      setRoom(room);
      setPlayerId(playerId);
      setPodium(null);
      setCountdown(null);
      setErrorMsg(null);
    });

    socket.on('room:updated', ({ room }) => {
      setRoom(room);
      if (room.podium) {
        setPodium(room.podium);
      }
    });

    socket.on('room:countdown', ({ count }) => {
      setCountdown(count);
      sounds.playCountdown(count === 1);
    });

    socket.on('room:started', ({ room }) => {
      setCountdown(null);
      setRoom(room);
      setPodium(null);
    });

    socket.on('player:progress', ({ playerId, progress, score, mistakes, isComplete }) => {
      setRoom(prev => {
        if (!prev) return prev;
        const player = prev.players[playerId];
        if (!player) return prev;
        return {
          ...prev,
          players: {
            ...prev.players,
            [playerId]: {
              ...player,
              progress,
              score,
              mistakes,
              completed: isComplete,
            },
          },
        };
      });
    });

    socket.on('player:cell_focus', ({ playerId, cell }) => {
      setOpponentFocus(prev => ({ ...prev, [playerId]: cell }));
    });

    socket.on('game:player_finished', ({ playerId, rank }) => {
      setRoom(prev => {
        if (!prev) return prev;
        const player = prev.players[playerId];
        if (!player) return prev;
        return {
          ...prev,
          players: {
            ...prev.players,
            [playerId]: {
              ...player,
              completed: true,
              rank,
            },
          },
        };
      });
    });

    socket.on('game:ended', ({ room, podium }) => {
      setRoom(room);
      setPodium(podium);
      sounds.playVictory();
    });

    socket.on('error', ({ message }) => {
      setErrorMsg(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((name: string, settings?: Partial<RoomSettings>) => {
    if (!socketRef.current) return;
    setErrorMsg(null);
    socketRef.current.emit('room:create', { name, settings }, (res) => {
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create room');
      }
    });
  }, []);

  const joinRoom = useCallback((code: string, name: string) => {
    if (!socketRef.current) return;
    setErrorMsg(null);
    socketRef.current.emit('room:join', { code, name }, (res) => {
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to join room');
      }
    });
  }, []);

  const updateSettings = useCallback((settings: Partial<RoomSettings>) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:update_settings', { settings });
  }, []);

  const startCountdown = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:start');
  }, []);

  const sendCellUpdate = useCallback((
    row: number,
    col: number,
    value: number,
    isNote: boolean = false,
    timeSpentMs: number = 0
  ) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:cell_update', { row, col, value, isNote, timeSpentMs });
  }, []);

  const verifyBoard = useCallback((grid: number[][]) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:verify_board', { grid });
  }, []);

  const selectCell = useCallback((cell: { row: number; col: number } | null) => {
    if (!socketRef.current) return;
    socketRef.current.emit('game:select_cell', cell);
  }, []);

  const rematch = useCallback(() => {
    if (!socketRef.current) return;
    setPodium(null);
    socketRef.current.emit('game:rematch');
  }, []);

  const leaveRoom = useCallback(() => {
    setRoom(null);
    setPlayerId(null);
    setPodium(null);
    setCountdown(null);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    room,
    playerId,
    countdown,
    errorMsg,
    podium,
    opponentFocus,
    setErrorMsg,
    createRoom,
    joinRoom,
    updateSettings,
    startCountdown,
    sendCellUpdate,
    verifyBoard,
    selectCell,
    rematch,
    leaveRoom,
  };
}

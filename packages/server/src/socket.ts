import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomSettings,
} from '@tsudoku/shared';
import { RoomManager } from './room.js';

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
) {
  const roomTimers: Map<string, NodeJS.Timeout> = new Map();

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    // 1. Create Room
    socket.on('room:create', ({ name, settings }, callback) => {
      try {
        const { room, player } = roomManager.createRoom(socket.id, name, settings);
        socket.join(`room:${room.id}`);

        callback({ success: true, room });
        socket.emit('room:joined', { room, playerId: player.id });
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Failed to create room' });
      }
    });

    // 2. Join Room
    socket.on('room:join', ({ code, name }, callback) => {
      const result = roomManager.joinRoom(socket.id, code, name);
      if (!result.success || !result.room || !result.player) {
        return callback({ success: false, error: result.error });
      }

      socket.join(`room:${result.room.id}`);
      callback({ success: true, room: result.room });

      socket.emit('room:joined', { room: result.room, playerId: result.player.id });
      io.to(`room:${result.room.id}`).emit('room:updated', { room: result.room });
    });

    // 3. Update Settings
    socket.on('room:update_settings', ({ settings }) => {
      const roomInfo = roomManager.getRoomBySocket(socket.id);
      if (!roomInfo) return;

      const updated = roomManager.updateSettings(roomInfo.room.id, roomInfo.player.id, settings);
      if (updated) {
        io.to(`room:${updated.id}`).emit('room:updated', { room: updated });
      }
    });

    // 4. Start Game (Countdown -> Start)
    socket.on('room:start', () => {
      const roomInfo = roomManager.getRoomBySocket(socket.id);
      if (!roomInfo || !roomInfo.player.isHost || roomInfo.room.status !== 'LOBBY') return;

      const roomId = roomInfo.room.id;
      roomManager.setRoomStatus(roomId, 'COUNTDOWN');
      io.to(`room:${roomId}`).emit('room:updated', { room: roomInfo.room });

      let count = 3;
      io.to(`room:${roomId}`).emit('room:countdown', { count });

      const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
          io.to(`room:${roomId}`).emit('room:countdown', { count });
        } else {
          clearInterval(countdownInterval);
          const startedRoom = roomManager.startRoomGame(roomId);
          if (startedRoom) {
            io.to(`room:${roomId}`).emit('room:started', {
              room: startedRoom,
              startTime: startedRoom.startTime || Date.now(),
            });
          }
        }
      }, 1000);
    });

    // 5. Game Cell Update (Instant Mode validation & scoring)
    socket.on('game:cell_update', ({ row, col, value, isNote, timeSpentMs }) => {
      const roomInfo = roomManager.getRoomBySocket(socket.id);
      if (!roomInfo || roomInfo.room.status !== 'PLAYING') return;

      const { room, player } = roomInfo;

      if (isNote) {
        // Notes are purely local to player
        return;
      }

      const updateResult = roomManager.handleCellUpdate(
        room.id,
        player.id,
        row,
        col,
        value,
        timeSpentMs || 0
      );

      if (updateResult && updateResult.isValid !== undefined) {
        socket.emit('game:cell_result', {
          row,
          col,
          isValid: updateResult.isValid,
          deltaScore: updateResult.deltaScore || 0,
          currentScore: player.score,
        });

        // Broadcast player progress & score
        io.to(`room:${room.id}`).emit('player:progress', {
          playerId: player.id,
          progress: player.progress,
          score: player.score,
          mistakes: player.mistakes,
          isComplete: player.completed,
        });
      }
    });

    // 6. Game Verify Board (Check progress & completion)
    socket.on('game:verify_board', ({ grid }) => {
      const roomInfo = roomManager.getRoomBySocket(socket.id);
      if (!roomInfo || roomInfo.room.status !== 'PLAYING') return;

      const { room, player } = roomInfo;
      const progressResult = roomManager.updatePlayerProgress(room.id, player.id, grid);

      if (progressResult) {
        io.to(`room:${room.id}`).emit('player:progress', {
          playerId: player.id,
          progress: player.progress,
          score: player.score,
          mistakes: player.mistakes,
          isComplete: player.completed,
        });

        if (progressResult.completed) {
          io.to(`room:${room.id}`).emit('game:player_finished', {
            playerId: player.id,
            rank: player.rank || 1,
            finishTimeMs: player.finishTimeMs || 0,
            score: player.score,
          });

          // Check if first finisher, start 30s grace timer if multiplayer
          const playersCount = Object.keys(room.players).length;
          if (player.rank === 1 && playersCount > 1 && !roomTimers.has(room.id)) {
            const timer = setTimeout(() => {
              const finalized = roomManager.finalizeGame(room.id);
              if (finalized) {
                io.to(`room:${room.id}`).emit('game:ended', {
                  room: finalized,
                  podium: finalized.podium || [],
                });
              }
              roomTimers.delete(room.id);
            }, 30000); // 30-second grace period for other players

            roomTimers.set(room.id, timer);
          } else if (progressResult.room.status === 'FINISHED') {
            const timer = roomTimers.get(room.id);
            if (timer) {
              clearTimeout(timer);
              roomTimers.delete(room.id);
            }
            io.to(`room:${room.id}`).emit('game:ended', {
              room: progressResult.room,
              podium: progressResult.room.podium || [],
            });
          }
        }
      }
    });

    // 7. Focus on cell
    socket.on('game:select_cell', (cell) => {
      const roomInfo = roomManager.getRoomBySocket(socket.id);
      if (!roomInfo || roomInfo.room.status !== 'PLAYING') return;

      socket.to(`room:${roomInfo.room.id}`).emit('player:cell_focus', {
        playerId: roomInfo.player.id,
        cell,
      });
    });

    // 8. Rematch
    socket.on('game:rematch', () => {
      const roomInfo = roomManager.getRoomBySocket(socket.id);
      if (!roomInfo) return;

      const timer = roomTimers.get(roomInfo.room.id);
      if (timer) {
        clearTimeout(timer);
        roomTimers.delete(roomInfo.room.id);
      }

      const resetRoom = roomManager.rematch(roomInfo.room.id);
      if (resetRoom) {
        io.to(`room:${resetRoom.id}`).emit('room:updated', { room: resetRoom });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const result = roomManager.leaveRoom(socket.id);
      if (result.room) {
        io.to(`room:${result.room.id}`).emit('room:updated', { room: result.room });
      }
    });
  });
}

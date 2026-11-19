import {
  Room,
  Player,
  RoomSettings,
  GameBoardData,
  PodiumEntry,
  SudokuEngine,
  ScoringEngine,
} from '@tsudoku/shared';

const AVATAR_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#14B8A6', // Teal
];

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, { roomId: string; playerId: string }> = new Map();

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public createRoom(
    socketId: string,
    playerName: string,
    settings?: Partial<RoomSettings>
  ): { room: Room; player: Player } {
    let code = this.generateCode();
    while (this.rooms.has(code)) {
      code = this.generateCode();
    }

    const playerId = `p_${socketId.slice(0, 8)}`;
    const player: Player = {
      id: playerId,
      name: playerName.trim() || 'Player 1',
      color: AVATAR_COLORS[0],
      isHost: true,
      isReady: true,
      progress: 0,
      score: 0,
      mistakes: 0,
      completed: false,
    };

    const initialSettings: RoomSettings = {
      mode: 'RACE',
      difficulty: 'medium',
      validationMode: 'instant',
      maxPlayers: 8,
      ...settings,
    };

    const room: Room = {
      id: code,
      code,
      hostId: playerId,
      settings: initialSettings,
      status: 'LOBBY',
      players: { [playerId]: player },
      seed: Math.floor(Math.random() * 1000000),
    };

    this.rooms.set(code, room);
    this.socketToRoom.set(socketId, { roomId: code, playerId });

    return { room, player };
  }

  public joinRoom(
    socketId: string,
    code: string,
    playerName: string
  ): { success: boolean; room?: Room; player?: Player; error?: string } {
    const normalizedCode = code.toUpperCase().trim();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { success: false, error: 'Room not found. Check the room code and try again.' };
    }

    if (room.status !== 'LOBBY') {
      return { success: false, error: 'Game is already in progress or has finished.' };
    }

    const currentPlayers = Object.values(room.players);
    if (currentPlayers.length >= room.settings.maxPlayers) {
      return { success: false, error: 'Room is full.' };
    }

    const playerId = `p_${socketId.slice(0, 8)}`;
    const colorIndex = currentPlayers.length % AVATAR_COLORS.length;

    const player: Player = {
      id: playerId,
      name: playerName.trim() || `Player ${currentPlayers.length + 1}`,
      color: AVATAR_COLORS[colorIndex],
      isHost: false,
      isReady: true,
      progress: 0,
      score: 0,
      mistakes: 0,
      completed: false,
    };

    room.players[playerId] = player;
    this.socketToRoom.set(socketId, { roomId: normalizedCode, playerId });

    return { success: true, room, player };
  }

  public getRoomBySocket(socketId: string): { room: Room; player: Player } | null {
    const info = this.socketToRoom.get(socketId);
    if (!info) return null;
    const room = this.rooms.get(info.roomId);
    if (!room) return null;
    const player = room.players[info.playerId];
    if (!player) return null;
    return { room, player };
  }

  public leaveRoom(socketId: string): { room?: Room; playerId?: string; wasHost?: boolean; isEmpty?: boolean } {
    const info = this.socketToRoom.get(socketId);
    if (!info) return {};

    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(info.roomId);
    if (!room) return {};

    const playerId = info.playerId;
    const wasHost = room.hostId === playerId;
    delete room.players[playerId];

    const remainingPlayers = Object.values(room.players);
    if (remainingPlayers.length === 0) {
      this.rooms.delete(room.id);
      return { isEmpty: true, roomId: room.id } as any;
    }

    if (wasHost) {
      // Reassign host to the first player
      const nextHost = remainingPlayers[0];
      nextHost.isHost = true;
      room.hostId = nextHost.id;
    }

    return { room, playerId, wasHost, isEmpty: false };
  }

  public updateSettings(roomId: string, hostPlayerId: string, settings: Partial<RoomSettings>): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== hostPlayerId || room.status !== 'LOBBY') {
      return null;
    }
    room.settings = { ...room.settings, ...settings };
    return room;
  }

  public startRoomGame(roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'COUNTDOWN') return null;

    // Generate puzzle
    const puzzle = SudokuEngine.generate(room.settings.difficulty, room.seed);
    room.puzzle = puzzle;
    room.status = 'PLAYING';
    room.startTime = Date.now();
    room.podium = [];

    // Reset player scores & progress
    for (const player of Object.values(room.players)) {
      player.progress = 0;
      player.score = 0;
      player.mistakes = 0;
      player.completed = false;
      delete player.rank;
      delete player.finishTimeMs;
    }

    return room;
  }

  public setRoomStatus(roomId: string, status: Room['status']): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.status = status;
    return room;
  }

  public handleCellUpdate(
    roomId: string,
    playerId: string,
    row: number,
    col: number,
    val: number,
    timeSpentMs: number = 0
  ): {
    room: Room;
    player: Player;
    isValid?: boolean;
    deltaScore?: number;
    isGameComplete?: boolean;
  } | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'PLAYING' || !room.puzzle) return null;

    const player = room.players[playerId];
    if (!player || player.completed) return null;

    const isInstant = room.settings.validationMode === 'instant';

    if (isInstant) {
      const isCorrect = SudokuEngine.isCellCorrect(room.puzzle.solution, row, col, val);
      const scoreCalc = ScoringEngine.calculateMoveScore(isCorrect, timeSpentMs, room.settings.difficulty);

      if (isCorrect) {
        player.score += scoreCalc.deltaScore;
      } else {
        player.mistakes += 1;
        player.score = Math.max(0, player.score + scoreCalc.deltaScore);
      }

      return {
        room,
        player,
        isValid: isCorrect,
        deltaScore: scoreCalc.deltaScore,
      };
    }

    // Freeform mode (score updated on verified submit/progress)
    return { room, player };
  }

  public updatePlayerProgress(
    roomId: string,
    playerId: string,
    currentBoard: number[][]
  ): { room: Room; player: Player; completed: boolean } | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'PLAYING' || !room.puzzle) return null;

    const player = room.players[playerId];
    if (!player) return null;

    const progress = SudokuEngine.calculateProgress(currentBoard, room.puzzle.initial, room.puzzle.solution);
    player.progress = progress;

    const isSolved = SudokuEngine.isBoardSolved(currentBoard, room.puzzle.solution);

    if (isSolved && !player.completed) {
      player.completed = true;
      player.finishTimeMs = Date.now() - (room.startTime || Date.now());

      if (!room.podium) room.podium = [];
      const rank = room.podium.length + 1;
      player.rank = rank;

      // Completion bonus
      player.score += Math.max(200, 1000 - Math.floor(player.finishTimeMs / 1000) * 5);

      const entry: PodiumEntry = {
        playerId: player.id,
        name: player.name,
        color: player.color,
        rank,
        score: player.score,
        finishTimeMs: player.finishTimeMs,
        mistakes: player.mistakes,
        progress: 100,
      };
      room.podium.push(entry);

      if (rank === 1) {
        room.winnerId = player.id;
      }

      // Check if all players completed
      const allDone = Object.values(room.players).every(p => p.completed);
      if (allDone) {
        room.status = 'FINISHED';
        room.endTime = Date.now();
      }

      return { room, player, completed: true };
    }

    return { room, player, completed: false };
  }

  public finalizeGame(roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || !room.puzzle) return null;

    room.status = 'FINISHED';
    room.endTime = Date.now();

    // Fill podium with non-finishers sorted by progress & score
    const finishers = new Set((room.podium || []).map(p => p.playerId));
    const nonFinishers = Object.values(room.players)
      .filter(p => !finishers.has(p.id))
      .sort((a, b) => b.progress - a.progress || b.score - a.score);

    let nextRank = (room.podium?.length || 0) + 1;
    for (const p of nonFinishers) {
      p.rank = nextRank;
      p.finishTimeMs = (room.endTime || Date.now()) - (room.startTime || Date.now());
      room.podium?.push({
        playerId: p.id,
        name: p.name,
        color: p.color,
        rank: nextRank++,
        score: p.score,
        finishTimeMs: p.finishTimeMs,
        mistakes: p.mistakes,
        progress: p.progress,
      });
    }

    return room;
  }

  public rematch(roomId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.status = 'LOBBY';
    room.seed = Math.floor(Math.random() * 1000000);
    delete room.puzzle;
    delete room.startTime;
    delete room.endTime;
    delete room.winnerId;
    delete room.podium;

    for (const player of Object.values(room.players)) {
      player.progress = 0;
      player.score = 0;
      player.mistakes = 0;
      player.completed = false;
      delete player.rank;
      delete player.finishTimeMs;
    }

    return room;
  }
}

export type GameMode = 'RACE' | 'TERRITORY';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type ValidationMode = 'instant' | 'freeform';

export type RoomStatus = 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';

export interface RoomSettings {
  mode: GameMode;
  difficulty: Difficulty;
  validationMode: ValidationMode;
  maxPlayers: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isReady: boolean;
  progress: number; // 0 to 100 percentage
  score: number;
  mistakes: number;
  completed: boolean;
  rank?: number;
  finishTimeMs?: number;
  selectedCell?: { row: number; col: number } | null;
}

export interface CellValue {
  row: number;
  col: number;
  value: number; // 0 represents empty
  given: boolean; // pre-filled clue
  notes: number[]; // 1-9 notes
  isValid?: boolean; // validity state if evaluated
}

export interface GameBoardData {
  initial: number[][]; // 9x9 grid with 0s for empty
  solution: number[][]; // 9x9 solved grid
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  settings: RoomSettings;
  status: RoomStatus;
  players: Record<string, Player>;
  seed: number;
  puzzle?: GameBoardData;
  startTime?: number;
  endTime?: number;
  winnerId?: string;
  podium?: PodiumEntry[];
}

export interface PodiumEntry {
  playerId: string;
  name: string;
  color: string;
  rank: number;
  score: number;
  finishTimeMs: number;
  mistakes: number;
  progress: number;
}

// Socket Events
export interface ClientToServerEvents {
  'room:create': (data: { name: string; settings?: Partial<RoomSettings> }, callback: (res: { success: boolean; room?: Room; error?: string }) => void) => void;
  'room:join': (data: { code: string; name: string }, callback: (res: { success: boolean; room?: Room; error?: string }) => void) => void;
  'room:update_settings': (data: { settings: Partial<RoomSettings> }) => void;
  'room:start': () => void;
  'game:cell_update': (data: { row: number; col: number; value: number; isNote?: boolean; timeSpentMs?: number }) => void;
  'game:verify_board': (data: { grid: number[][] }) => void;
  'game:select_cell': (data: { row: number; col: number } | null) => void;
  'game:rematch': () => void;
}

export interface ServerToClientEvents {
  'room:joined': (data: { room: Room; playerId: string }) => void;
  'room:updated': (data: { room: Room }) => void;
  'room:countdown': (data: { count: number }) => void;
  'room:started': (data: { room: Room; startTime: number }) => void;
  'player:progress': (data: { playerId: string; progress: number; score: number; mistakes: number; isComplete: boolean }) => void;
  'player:cell_focus': (data: { playerId: string; cell: { row: number; col: number } | null }) => void;
  'game:cell_result': (data: { row: number; col: number; isValid: boolean; deltaScore: number; currentScore: number }) => void;
  'game:player_finished': (data: { playerId: string; rank: number; finishTimeMs: number; score: number }) => void;
  'game:ended': (data: { room: Room; podium: PodiumEntry[] }) => void;
  'error': (data: { message: string }) => void;
}

// Extensible Hook: Standardized event structure for future Territory / Map Control mode
export interface TerritoryCellClaimEvent {
  cellIndex: { row: number; col: number };
  playerId: string;
  value: number;
  timeToFillSec: number;
  earnedScore: number;
  territoryId?: string;
}

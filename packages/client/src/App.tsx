import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from './hooks/useSocket';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { Board } from './components/Board';
import { Keypad } from './components/Keypad';
import { Scoreboard } from './components/Scoreboard';
import { PodiumModal } from './components/PodiumModal';
import { generateRandomNickname } from './utils/nickname';
import { sounds } from './utils/audio';

export const App: React.FC = () => {
  const {
    connected,
    room,
    playerId,
    countdown,
    errorMsg,
    podium,
    opponentFocus,
    createRoom,
    joinRoom,
    updateSettings,
    startCountdown,
    sendCellUpdate,
    verifyBoard,
    selectCell,
    rematch,
    leaveRoom,
  } = useSocket();

  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('tsudoku_name') || generateRandomNickname();
  });

  const [board, setBoard] = useState<number[][]>([]);
  const [notes, setNotes] = useState<Record<string, number[]>>({});
  const [history, setHistory] = useState<{ board: number[][]; notes: Record<string, number[]> }[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isNotesMode, setIsNotesMode] = useState(false);
  const [lastMoveTime, setLastMoveTime] = useState<number>(Date.now());

  // Save nickname to localStorage
  useEffect(() => {
    localStorage.setItem('tsudoku_name', nickname);
  }, [nickname]);

  // Check URL query parameters for invite link: ?room=XXXXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !room && connected) {
      joinRoom(roomParam.toUpperCase(), nickname);
    }
  }, [connected]);

  // Synchronize board when game starts
  useEffect(() => {
    if (room && room.status === 'PLAYING' && room.puzzle) {
      const initialGrid = room.puzzle.initial.map(row => [...row]);
      setBoard(initialGrid);
      setNotes({});
      setHistory([]);
      setSelectedCell(null);
      setLastMoveTime(Date.now());
    }
  }, [room?.status, room?.seed]);

  // Focus selection handler
  const handleSelectCell = useCallback((row: number, col: number) => {
    sounds.playClick();
    const cell = { row, col };
    setSelectedCell(cell);
    selectCell(cell);
  }, [selectCell]);

  // Number input handler
  const handleNumberInput = useCallback((num: number) => {
    if (!room || room.status !== 'PLAYING' || !selectedCell || !room.puzzle) return;

    const { row, col } = selectedCell;
    const isGiven = room.puzzle.initial[row][col] !== 0;
    if (isGiven) return; // Cannot edit pre-filled clues

    const cellKey = `${row},${col}`;

    if (isNotesMode) {
      // Toggle note candidate
      setNotes(prev => {
        const cellNotes = prev[cellKey] || [];
        const nextNotes = cellNotes.includes(num)
          ? cellNotes.filter(n => n !== num)
          : [...cellNotes, num].sort((a, b) => a - b);
        return { ...prev, [cellKey]: nextNotes };
      });
      return;
    }

    // Normal value input
    const now = Date.now();
    const timeSpentMs = now - lastMoveTime;
    setLastMoveTime(now);

    const prevBoard = board.map(r => [...r]);
    const prevNotes = { ...notes };

    // Push to undo history
    setHistory(h => [...h.slice(-20), { board: prevBoard, notes: prevNotes }]);

    // Update local board
    const nextBoard = board.map((r, rIdx) =>
      rIdx === row ? r.map((c, cIdx) => (cIdx === col ? num : c)) : [...r]
    );
    setBoard(nextBoard);

    // Clear notes in this cell
    setNotes(prev => {
      const copy = { ...prev };
      delete copy[cellKey];
      return copy;
    });

    // Check instant feedback chime
    if (room.settings.validationMode === 'instant') {
      const isCorrect = room.puzzle.solution[row][col] === num;
      if (isCorrect) {
        sounds.playCorrect();
      } else {
        sounds.playError();
      }
    } else {
      sounds.playClick();
    }

    // Send cell update to server for scoring
    sendCellUpdate(row, col, num, false, timeSpentMs);

    // Check board progress
    verifyBoard(nextBoard);
  }, [room, selectedCell, isNotesMode, board, notes, lastMoveTime, sendCellUpdate, verifyBoard]);

  // Erase cell content
  const handleErase = useCallback(() => {
    if (!room || room.status !== 'PLAYING' || !selectedCell || !room.puzzle) return;

    const { row, col } = selectedCell;
    const isGiven = room.puzzle.initial[row][col] !== 0;
    if (isGiven) return;

    const cellKey = `${row},${col}`;

    // Push to undo history
    setHistory(h => [...h.slice(-20), { board: board.map(r => [...r]), notes: { ...notes } }]);

    const nextBoard = board.map((r, rIdx) =>
      rIdx === row ? r.map((c, cIdx) => (cIdx === col ? 0 : c)) : [...r]
    );
    setBoard(nextBoard);

    setNotes(prev => {
      const copy = { ...prev };
      delete copy[cellKey];
      return copy;
    });

    verifyBoard(nextBoard);
  }, [room, selectedCell, board, notes, verifyBoard]);

  // Undo action
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setBoard(lastState.board);
    setNotes(lastState.notes);
    verifyBoard(lastState.board);
  }, [history, verifyBoard]);

  // Keyboard navigation & inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (room?.status !== 'PLAYING') return;

      // Number keys 1-9
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleErase();
      } else if (e.key === ' ' || e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNotesMode(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        setSelectedCell(prev => {
          const curR = prev ? prev.row : 0;
          const curC = prev ? prev.col : 0;
          let nextR = curR;
          let nextC = curC;

          switch (e.key.toLowerCase()) {
            case 'arrowup':
            case 'w':
              nextR = Math.max(0, curR - 1);
              break;
            case 'arrowdown':
            case 's':
              nextR = Math.min(8, curR + 1);
              break;
            case 'arrowleft':
            case 'a':
              nextC = Math.max(0, curC - 1);
              break;
            case 'arrowright':
            case 'd':
              nextC = Math.min(8, curC + 1);
              break;
          }

          const nextCell = { row: nextR, col: nextC };
          selectCell(nextCell);
          return nextCell;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [room?.status, handleNumberInput, handleErase, handleUndo, selectCell]);

  // Compute number counts currently on board
  const numberCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = board[r]?.[c];
        if (val && val > 0) {
          counts[val] = (counts[val] || 0) + 1;
        }
      }
    }
    return counts;
  }, [board]);

  // Opponent player colors lookup
  const opponentColors = useMemo(() => {
    const map: Record<string, string> = {};
    if (room) {
      for (const [id, p] of Object.entries(room.players)) {
        if (id !== playerId) {
          map[id] = p.color;
        }
      }
    }
    return map;
  }, [room, playerId]);

  const isHost = room && playerId ? room.players[playerId]?.isHost : false;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header
        roomCode={room?.code}
        connected={connected}
        onLeaveRoom={room ? leaveRoom : undefined}
      />

      <main className="flex-1 flex flex-col justify-center items-center py-4 px-2">
        {/* View 1: Lobby or Home */}
        {(!room || room.status === 'LOBBY' || room.status === 'COUNTDOWN') && (
          <Lobby
            room={room}
            playerId={playerId}
            nickname={nickname}
            setNickname={setNickname}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            onUpdateSettings={updateSettings}
            onStartGame={startCountdown}
            countdown={countdown}
            errorMsg={errorMsg}
          />
        )}

        {/* View 2: Live Game Screen */}
        {room && (room.status === 'PLAYING' || room.status === 'FINISHED') && room.puzzle && (
          <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-center gap-6 px-4">
            {/* Left Column: Board & Keypad */}
            <div className="w-full max-w-[500px] flex flex-col items-center gap-4">
              <Board
                initial={room.puzzle.initial}
                current={board}
                solution={room.settings.validationMode === 'instant' ? room.puzzle.solution : undefined}
                notes={notes}
                selectedCell={selectedCell}
                onSelectCell={handleSelectCell}
                opponentFocus={opponentFocus}
                opponentColors={opponentColors}
                validationMode={room.settings.validationMode}
              />

              <Keypad
                onNumberInput={handleNumberInput}
                onErase={handleErase}
                onUndo={handleUndo}
                isNotesMode={isNotesMode}
                onToggleNotes={() => setIsNotesMode(prev => !prev)}
                onCheckBoard={() => verifyBoard(board)}
                validationMode={room.settings.validationMode}
                numberCounts={numberCounts}
                canUndo={history.length > 0}
              />
            </div>

            {/* Right Column: Live Race Standings & Game Info */}
            <div className="w-full max-w-[500px] md:max-w-xs flex flex-col gap-4">
              <Scoreboard
                players={room.players}
                currentPlayerId={playerId}
                validationMode={room.settings.validationMode}
              />

              {/* Instructions / Controls hint */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
                <span className="font-bold text-slate-300 uppercase tracking-wider block">
                  Quick Controls
                </span>
                <div className="grid grid-cols-2 gap-1.5 font-mono">
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">1-9</kbd> Enter num</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">N / Space</kbd> Notes</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Arrows</kbd> Move</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Del</kbd> Erase</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Podium / Victory Modal */}
        {podium && (
          <PodiumModal
            podium={podium}
            currentPlayerId={playerId}
            onRematch={rematch}
            onLeave={leaveRoom}
            isHost={!!isHost}
          />
        )}
      </main>
    </div>
  );
};

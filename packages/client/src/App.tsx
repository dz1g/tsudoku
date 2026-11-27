import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SudokuEngine } from '@tsudoku/shared';
import { useSocket } from './hooks/useSocket';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { Board, InputMode } from './components/Board';
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

  const [inputMode, setInputMode] = useState<InputMode>(() => {
    return (localStorage.getItem('tsudoku_input_mode_v2') as InputMode) || 'number-first';
  });
  const [activeNumber, setActiveNumber] = useState<number | null>(null);

  const handleSelectInputMode = useCallback((mode: InputMode) => {
    setInputMode(mode);
    localStorage.setItem('tsudoku_input_mode_v2', mode);
    setActiveNumber(null);
    setSelectedCell(null);
    selectCell(null);
  }, [selectCell]);

  const handleSelectActiveNumber = useCallback((num: number | null) => {
    if (num !== null && (numberCounts[num] || 0) >= 9) {
      return; // Finished number cannot be selected
    }
    setActiveNumber(num);
    if (num === null) {
      // Reset all highlights on the board
      setSelectedCell(null);
      selectCell(null);
    }
  }, [numberCounts, selectCell]);

  // If active number becomes complete (e.g. 9 placed), automatically deselect it and reset highlights
  useEffect(() => {
    if (activeNumber !== null && (numberCounts[activeNumber] || 0) >= 9) {
      setActiveNumber(null);
      setSelectedCell(null);
      selectCell(null);
    }
  }, [numberCounts, activeNumber, selectCell]);

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
      setActiveNumber(null);
      setLastMoveTime(Date.now());
    }
  }, [room?.status, room?.seed]);

  // Check if current player has fully solved the board
  const isBoardSolved = useMemo(() => {
    if (!room || !room.puzzle || board.length !== 9) return false;
    const playerCompleted = !!(playerId && room.players[playerId]?.completed);
    if (playerCompleted) return true;
    return SudokuEngine.isBoardSolved(board, room.puzzle.solution);
  }, [room, board, playerId]);

  // When board is solved, clear selection and play victory fanfare
  useEffect(() => {
    if (isBoardSolved) {
      setSelectedCell(null);
      selectCell(null);
      sounds.playVictory();
    }
  }, [isBoardSolved, selectCell]);

  // Number input handler
  const handleNumberInput = useCallback((num: number, targetCell?: { row: number; col: number } | null) => {
    const target = targetCell || selectedCell;
    if (!room || room.status !== 'PLAYING' || !target || !room.puzzle || isBoardSolved) return;

    const { row, col } = target;
    const isGiven = room.puzzle.initial[row][col] !== 0;
    // Anti-abuse: correctly placed numbers in instant mode are permanently locked
    const isAlreadySolved =
      room.settings.validationMode === 'instant' &&
      board[row]?.[col] !== 0 &&
      board[row]?.[col] === room.puzzle.solution[row][col];

    if (isGiven || isAlreadySolved) return; // Cannot edit pre-filled clues or already-solved cells

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

    // Check instant feedback chime & validity
    let isCorrect = true;
    if (room.settings.validationMode === 'instant') {
      isCorrect = room.puzzle.solution[row][col] === num;
      if (isCorrect) {
        sounds.playCorrect();
      } else {
        sounds.playError();
      }
    } else {
      sounds.playClick();
    }

    // Auto-remove notes:
    // When putting a number in a cell, remove that number from all candidate notes
    // in the same row, same column, and same 3x3 small cubicle, unless it is a wrong number.
    setNotes(prev => {
      const copy = { ...prev };
      // Always remove notes in the cell that received the number
      delete copy[cellKey];

      // Prune related notes only if the number is valid/correct
      if (isCorrect) {
        const boxStartR = Math.floor(row / 3) * 3;
        const boxStartC = Math.floor(col / 3) * 3;

        for (const [key, candidateList] of Object.entries(copy)) {
          if (!candidateList || candidateList.length === 0) continue;
          const [rStr, cStr] = key.split(',');
          const r = parseInt(rStr, 10);
          const c = parseInt(cStr, 10);

          const inSameRow = r === row;
          const inSameCol = c === col;
          const inSameBox =
            r >= boxStartR && r < boxStartR + 3 && c >= boxStartC && c < boxStartC + 3;

          if (inSameRow || inSameCol || inSameBox) {
            if (candidateList.includes(num)) {
              copy[key] = candidateList.filter(n => n !== num);
            }
          }
        }
      }

      return copy;
    });

    // Send cell update to server for scoring
    sendCellUpdate(row, col, num, false, timeSpentMs);

    // Check board progress
    verifyBoard(nextBoard);
  }, [room, selectedCell, isNotesMode, board, notes, lastMoveTime, sendCellUpdate, verifyBoard, isBoardSolved]);

  // Focus selection handler
  const handleSelectCell = useCallback((row: number, col: number) => {
    if (isBoardSolved) return; // Cannot select tiles when board is solved
    sounds.playClick();
    const cell = { row, col };

    if (inputMode === 'number-first') {
      if (activeNumber !== null) {
        // Place number without highlighting this cell as selectedCell (no need to highlight last successful number entry)
        handleNumberInput(activeNumber, cell);
      } else {
        // In number-first mode with no active number: click to pick this cell's number (unless finished)
        const cellVal = board[row]?.[col] || 0;
        if (cellVal > 0 && (numberCounts[cellVal] || 0) < 9) {
          handleSelectActiveNumber(cellVal);
        }
      }
    } else {
      setSelectedCell(cell);
      selectCell(cell);
    }
  }, [selectCell, isBoardSolved, inputMode, activeNumber, handleNumberInput, board, numberCounts, handleSelectActiveNumber]);

  // Erase cell content
  const handleErase = useCallback(() => {
    if (!room || room.status !== 'PLAYING' || !selectedCell || !room.puzzle || isBoardSolved) return;

    const { row, col } = selectedCell;
    const isGiven = room.puzzle.initial[row][col] !== 0;
    // Anti-abuse: correctly placed numbers in instant mode are permanently locked and cannot be erased
    const isAlreadySolved =
      room.settings.validationMode === 'instant' &&
      board[row]?.[col] !== 0 &&
      board[row]?.[col] === room.puzzle.solution[row][col];

    if (isGiven || isAlreadySolved) return;

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
    if (history.length === 0 || !room || !room.puzzle || isBoardSolved) return;
    const lastState = history[history.length - 1];

    // Ensure locked correct cells in instant mode are not reverted by undo
    const safeRestoredBoard = lastState.board.map((r, rIdx) =>
      r.map((val, cIdx) => {
        if (
          room.settings.validationMode === 'instant' &&
          board[rIdx]?.[cIdx] !== 0 &&
          board[rIdx]?.[cIdx] === room.puzzle!.solution[rIdx][cIdx]
        ) {
          return board[rIdx][cIdx];
        }
        return val;
      })
    );

    setHistory(h => h.slice(0, -1));
    setBoard(safeRestoredBoard);
    setNotes(lastState.notes);
    verifyBoard(safeRestoredBoard);
  }, [history, room, board, verifyBoard]);

  // Keyboard navigation & inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (room?.status !== 'PLAYING' || isBoardSolved) return;

      // Number keys 1-9
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const num = parseInt(e.key, 10);
        if ((numberCounts[num] || 0) >= 9) return; // Finished number cannot be selected!

        if (inputMode === 'number-first') {
          handleSelectActiveNumber(activeNumber === num ? null : num);
        } else {
          handleNumberInput(num);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Reset all highlights on the board
        setActiveNumber(null);
        setSelectedCell(null);
        selectCell(null);
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
  }, [room?.status, isBoardSolved, inputMode, activeNumber, numberCounts, handleSelectActiveNumber, handleNumberInput, handleErase, handleUndo, selectCell]);

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
    <div className="h-screen h-dvh bg-slate-950 flex flex-col overflow-hidden select-none">
      <Header
        roomCode={room?.code}
        connected={connected}
        onLeaveRoom={room ? leaveRoom : undefined}
      />

      <main className="flex-1 min-h-0 flex flex-col justify-center items-center p-2 sm:p-3 overflow-hidden">
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
          <div className="w-full max-w-5xl h-full flex-1 min-h-0 flex flex-col md:flex-row items-center justify-center gap-2 sm:gap-3 md:gap-6 px-2 sm:px-4">
            {/* Mobile Scoreboard (top on mobile, hidden on desktop) */}
            <div className="w-full max-w-[480px] md:hidden">
              <Scoreboard
                players={room.players}
                currentPlayerId={playerId}
                validationMode={room.settings.validationMode}
              />
            </div>

            {/* Left / Center: Sudoku Board */}
            <div className="flex-1 flex items-center justify-center min-h-0 w-full md:w-auto">
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
                isBoardSolved={isBoardSolved}
                inputMode={inputMode}
                activeNumber={activeNumber}
              />
            </div>

            {/* Right: Scoreboard (desktop), Keypad & Controls */}
            <div className="w-full max-w-[480px] md:w-[360px] lg:w-[400px] flex flex-col gap-1.5 sm:gap-2.5 justify-center min-h-0 flex-shrink-0">
              <div className="hidden md:block">
                <Scoreboard
                  players={room.players}
                  currentPlayerId={playerId}
                  validationMode={room.settings.validationMode}
                />
              </div>

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
                disabled={isBoardSolved}
                inputMode={inputMode}
                onSelectInputMode={handleSelectInputMode}
                activeNumber={activeNumber}
                onSelectActiveNumber={handleSelectActiveNumber}
              />

              {/* Instructions / Controls hint */}
              <div className="hidden md:block bg-slate-900/60 border border-slate-800/80 rounded-xl p-2 text-[11px] text-slate-400 space-y-1 shadow-sm">
                <span className="font-bold text-slate-300 uppercase tracking-wider block text-[10px]">
                  Quick Controls
                </span>
                <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                  <div><kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">1-9</kbd> {inputMode === 'number-first' ? 'Pick num' : 'Enter num'}</div>
                  <div><kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">N / Space</kbd> Notes</div>
                  <div><kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Arrows</kbd> Move</div>
                  <div><kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">{inputMode === 'number-first' && activeNumber !== null ? 'Esc' : 'Del'}</kbd> {inputMode === 'number-first' && activeNumber !== null ? 'Deselect' : 'Erase'}</div>
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

import React from 'react';
import { Pencil, Delete, RotateCcw, CheckCircle, Trophy, MousePointerClick, Hash, X } from 'lucide-react';
import { sounds } from '../utils/audio';
import { InputMode } from './Board';

interface KeypadProps {
  onNumberInput: (num: number) => void;
  onErase: () => void;
  onUndo: () => void;
  isNotesMode: boolean;
  onToggleNotes: () => void;
  onCheckBoard?: () => void;
  validationMode: 'instant' | 'freeform';
  numberCounts: Record<number, number>; // counts of placed numbers (out of 9)
  canUndo: boolean;
  disabled?: boolean;
  inputMode: InputMode;
  onSelectInputMode: (mode: InputMode) => void;
  activeNumber: number | null;
  onSelectActiveNumber: (num: number | null) => void;
}

export const Keypad: React.FC<KeypadProps> = ({
  onNumberInput,
  onErase,
  onUndo,
  isNotesMode,
  onToggleNotes,
  onCheckBoard,
  validationMode,
  numberCounts,
  canUndo,
  disabled = false,
  inputMode,
  onSelectInputMode,
  activeNumber,
  onSelectActiveNumber,
}) => {
  if (disabled) {
    return (
      <div className="w-full max-w-[500px] mx-auto p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center animate-fade-in shadow-lg shadow-emerald-500/10">
        <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-sm tracking-wide">
          <Trophy className="w-4 h-4" />
          <span>PUZZLE SOLVED! ALL NUMBERS FIXED & LOCKED</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Enjoy the victory! Reviewing final standings...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px] mx-auto space-y-1.5 sm:space-y-2">
      {/* Mode Switcher Pill */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-0.5 sm:p-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold shadow-sm">
        <span className="text-slate-400 pl-2 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold hidden sm:inline">
          Input Mode
        </span>
        <div className="flex w-full sm:w-auto gap-1">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onSelectInputMode('cell-first');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-all ${
              inputMode === 'cell-first'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MousePointerClick className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Cell First</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onSelectInputMode('number-first');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-all ${
              inputMode === 'number-first'
                ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Number First</span>
          </button>
        </div>
      </div>

      {/* Number-First Mode Active Status Bar */}
      {inputMode === 'number-first' && (
        <div className="flex items-center justify-between px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 text-cyan-300">
            {activeNumber !== null ? (
              <>
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-cyan-500 text-slate-950 font-black flex items-center justify-center text-[10px] sm:text-xs shadow-sm">
                  {activeNumber}
                </span>
                <span className="font-semibold truncate">Click empty cells to place {activeNumber}</span>
              </>
            ) : (
              <span className="text-slate-400">Click a number below, then click cells</span>
            )}
          </div>
          {activeNumber !== null && (
            <button
              onClick={() => {
                sounds.playClick();
                onSelectActiveNumber(null);
              }}
              className="flex items-center gap-1 text-[10px] sm:text-[11px] text-cyan-400 hover:text-white bg-cyan-900/40 hover:bg-cyan-900/70 px-1.5 py-0.5 rounded border border-cyan-700/50 transition-colors flex-shrink-0"
            >
              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Deselect</span>
            </button>
          )}
        </div>
      )}

      {/* Utility Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <button
          onClick={() => {
            if (canUndo) {
              sounds.playClick();
              onUndo();
            }
          }}
          disabled={!canUndo}
          className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-xs sm:text-sm disabled:opacity-40 transition-colors shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
          <span>Undo</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            onToggleNotes();
          }}
          className={`flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border font-semibold text-xs sm:text-sm transition-all shadow-sm ${
            isNotesMode
              ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300 ring-2 ring-indigo-500/40'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Pencil className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isNotesMode ? 'text-indigo-400' : 'text-slate-400'}`} />
          <span>Notes {isNotesMode ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            onErase();
          }}
          className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-xs sm:text-sm transition-colors shadow-sm"
        >
          <Delete className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
          <span>Erase</span>
        </button>
      </div>

      {/* Number Buttons 1 to 9 */}
      <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const count = numberCounts[num] || 0;
          const isComplete = count >= 9;
          const isActiveNumber = inputMode === 'number-first' && activeNumber === num;

          return (
            <button
              key={num}
              onClick={() => {
                sounds.playClick();
                if (inputMode === 'number-first') {
                  // Toggle active number in number-first mode
                  onSelectActiveNumber(activeNumber === num ? null : num);
                } else {
                  // Input to currently selected cell in cell-first mode
                  onNumberInput(num);
                }
              }}
              className={`relative flex flex-col items-center justify-center py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl border transition-all ${
                isActiveNumber
                  ? 'bg-cyan-600 border-cyan-300 ring-2 sm:ring-4 ring-cyan-400/60 scale-105 shadow-lg shadow-cyan-500/40 text-white z-10'
                  : isComplete
                  ? 'bg-slate-950/50 border-slate-800/50 text-slate-600 opacity-60'
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-white hover:border-slate-700 active:scale-95 shadow-sm'
              }`}
            >
              <span className="text-base sm:text-lg font-bold leading-tight">{num}</span>
              <span className={`text-[9px] sm:text-[10px] font-mono leading-none mt-0.5 ${isActiveNumber ? 'text-cyan-100 font-bold' : 'text-slate-500'}`}>
                {Math.max(0, 9 - count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Freeform Mode: Submit/Check Board button */}
      {validationMode === 'freeform' && onCheckBoard && (
        <button
          onClick={() => {
            sounds.playClick();
            onCheckBoard();
          }}
          className="w-full py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/25 transition-colors text-xs sm:text-sm"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Check / Submit Board</span>
        </button>
      )}
    </div>
  );
};

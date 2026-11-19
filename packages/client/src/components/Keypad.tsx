import React from 'react';
import { Pencil, Delete, RotateCcw, CheckCircle } from 'lucide-react';
import { sounds } from '../utils/audio';

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
}) => {
  return (
    <div className="w-full max-w-[500px] mx-auto space-y-3">
      {/* Utility Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            if (canUndo) {
              sounds.playClick();
              onUndo();
            }
          }}
          disabled={!canUndo}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-xs sm:text-sm disabled:opacity-40 transition-colors shadow-sm"
        >
          <RotateCcw className="w-4 h-4 text-cyan-400" />
          <span>Undo</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            onToggleNotes();
          }}
          className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-xs sm:text-sm transition-all shadow-sm ${
            isNotesMode
              ? 'bg-indigo-600/30 border-indigo-400 text-indigo-300 ring-2 ring-indigo-500/40'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Pencil className={`w-4 h-4 ${isNotesMode ? 'text-indigo-400' : 'text-slate-400'}`} />
          <span>Notes {isNotesMode ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            onErase();
          }}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-xs sm:text-sm transition-colors shadow-sm"
        >
          <Delete className="w-4 h-4 text-red-400" />
          <span>Erase</span>
        </button>
      </div>

      {/* Number Buttons 1 to 9 */}
      <div className="grid grid-cols-9 gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const count = numberCounts[num] || 0;
          const isComplete = count >= 9;

          return (
            <button
              key={num}
              onClick={() => {
                sounds.playClick();
                onNumberInput(num);
              }}
              className={`relative flex flex-col items-center justify-center py-2.5 sm:py-3.5 rounded-xl border transition-all ${
                isComplete
                  ? 'bg-slate-950/50 border-slate-800/50 text-slate-600 opacity-60'
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-white hover:border-slate-700 active:scale-95 shadow-sm'
              }`}
            >
              <span className="text-lg sm:text-xl font-bold">{num}</span>
              <span className="text-[10px] text-slate-500 font-mono leading-none mt-0.5">
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
          className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition-colors"
        >
          <CheckCircle className="w-5 h-5" />
          <span>Check / Submit Board</span>
        </button>
      )}
    </div>
  );
};

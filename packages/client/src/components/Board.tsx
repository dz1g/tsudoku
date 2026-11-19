import React from 'react';
import { Cell } from './Cell';

interface BoardProps {
  initial: number[][];
  current: number[][];
  solution?: number[][];
  notes: Record<string, number[]>;
  selectedCell: { row: number; col: number } | null;
  onSelectCell: (row: number, col: number) => void;
  opponentFocus: Record<string, { row: number; col: number } | null>;
  opponentColors: Record<string, string>;
  validationMode: 'instant' | 'freeform';
}

export const Board: React.FC<BoardProps> = ({
  initial,
  current,
  solution,
  notes,
  selectedCell,
  onSelectCell,
  opponentFocus,
  opponentColors,
  validationMode,
}) => {
  const selectedValue =
    selectedCell && current[selectedCell.row] ? current[selectedCell.row][selectedCell.col] : 0;

  // Build map of cell -> opponent color who is focusing on it
  const focusMap: Record<string, string> = {};
  for (const [pid, cell] of Object.entries(opponentFocus)) {
    if (cell && opponentColors[pid]) {
      focusMap[`${cell.row},${cell.col}`] = opponentColors[pid];
    }
  }

  return (
    <div className="w-full max-w-[500px] aspect-square mx-auto bg-slate-950 p-2 sm:p-3 rounded-2xl border-4 border-slate-700 shadow-2xl">
      <div className="grid grid-cols-9 grid-rows-9 w-full h-full border border-slate-700 rounded-lg overflow-hidden">
        {Array.from({ length: 9 }).map((_, r) =>
          Array.from({ length: 9 }).map((_, c) => {
            const val = current[r]?.[c] ?? 0;
            const given = initial[r]?.[c] !== 0;
            const isSelected = selectedCell?.row === r && selectedCell?.col === c;

            // Related if same row, col, or 3x3 block
            const isRelated =
              !!selectedCell &&
              (selectedCell.row === r ||
                selectedCell.col === c ||
                (Math.floor(selectedCell.row / 3) === Math.floor(r / 3) &&
                  Math.floor(selectedCell.col / 3) === Math.floor(c / 3)));

            const isSameNumber =
              selectedValue !== 0 && val !== 0 && val === selectedValue;

            // In instant mode, error if not given, non-zero, and does not match solution
            const isError =
              validationMode === 'instant' &&
              !given &&
              val !== 0 &&
              !!solution &&
              solution[r]?.[c] !== val;

            // In instant mode, locked if user filled correctly
            const isLocked =
              validationMode === 'instant' &&
              !given &&
              val !== 0 &&
              !!solution &&
              solution[r]?.[c] === val;

            const cellKey = `${r},${c}`;
            const cellNotes = notes[cellKey] || [];
            const oppColor = focusMap[cellKey];

            return (
              <Cell
                key={cellKey}
                row={r}
                col={c}
                value={val}
                given={given}
                isLocked={isLocked}
                notes={cellNotes}
                isSelected={isSelected}
                isRelated={isRelated}
                isSameNumber={isSameNumber}
                isError={isError}
                opponentColor={oppColor}
                onClick={() => onSelectCell(r, c)}
              />
            );
          })
        )}
      </div>

      {/* Visual Color Legend */}
      <div className="flex items-center justify-center gap-4 mt-2.5 text-[11px] font-medium text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-slate-100 shadow-sm" />
          <span className="text-slate-200">Generated Clue</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-cyan-400 shadow-sm shadow-cyan-500/50" />
          <span className="text-cyan-300">Your Filled Number</span>
        </span>
        {validationMode === 'instant' && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-red-500 shadow-sm" />
            <span className="text-red-400">Mistake</span>
          </span>
        )}
      </div>
    </div>
  );
};

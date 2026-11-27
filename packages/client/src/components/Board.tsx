import React, { useState, useMemo } from 'react';
import { Cell } from './Cell';

export type InputMode = 'cell-first' | 'number-first';

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
  isBoardSolved?: boolean;
  inputMode: InputMode;
  activeNumber: number | null;
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
  isBoardSolved,
  inputMode,
  activeNumber,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const selectedValue =
    selectedCell && current[selectedCell.row] ? current[selectedCell.row][selectedCell.col] : 0;

  const hoveredValue =
    hoveredCell && current[hoveredCell.row] ? current[hoveredCell.row][hoveredCell.col] : 0;

  // The digit to actively spotlight across the grid:
  // In number-first mode, it's the activeNumber. In cell-first mode, it's the selected cell's value.
  const targetSpotlightDigit =
    inputMode === 'number-first' && activeNumber !== null
      ? activeNumber
      : selectedValue !== 0
      ? selectedValue
      : 0;

  // Compute all rows, columns, and 3x3 blocks covered by the spotlighted digit
  const { coveredRows, coveredCols, coveredBoxes } = useMemo(() => {
    const rows = new Set<number>();
    const cols = new Set<number>();
    const boxes = new Set<number>();

    if (targetSpotlightDigit > 0) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (current[r]?.[c] === targetSpotlightDigit) {
            rows.add(r);
            cols.add(c);
            boxes.add(Math.floor(r / 3) * 3 + Math.floor(c / 3));
          }
        }
      }
    }

    return { coveredRows: rows, coveredCols: cols, coveredBoxes: boxes };
  }, [targetSpotlightDigit, current]);

  // Build map of cell -> opponent color who is focusing on it
  const focusMap: Record<string, string> = {};
  for (const [pid, cell] of Object.entries(opponentFocus)) {
    if (cell && opponentColors[pid]) {
      focusMap[`${cell.row},${cell.col}`] = opponentColors[pid];
    }
  }

  return (
    <div
      className={`w-full max-w-[500px] aspect-square mx-auto bg-slate-950 p-2 sm:p-3 rounded-2xl border-4 transition-all duration-700 shadow-2xl ${
        isBoardSolved
          ? 'border-emerald-500 shadow-emerald-500/30 ring-4 ring-emerald-500/20'
          : 'border-slate-700'
      }`}
    >
      <div
        onMouseLeave={() => setHoveredCell(null)}
        className="grid grid-cols-9 grid-rows-9 w-full h-full border border-slate-700 rounded-lg overflow-hidden"
      >
        {Array.from({ length: 9 }).map((_, r) =>
          Array.from({ length: 9 }).map((_, c) => {
            const val = current[r]?.[c] ?? 0;
            const given = initial[r]?.[c] !== 0;
            const isSelected = !isBoardSolved && selectedCell?.row === r && selectedCell?.col === c;

            // In cell-first mode: related if same row, col, or 3x3 block as selected cell
            const isRelated =
              !isBoardSolved &&
              inputMode === 'cell-first' &&
              !!selectedCell &&
              (selectedCell.row === r ||
                selectedCell.col === c ||
                (Math.floor(selectedCell.row / 3) === Math.floor(r / 3) &&
                  Math.floor(selectedCell.col / 3) === Math.floor(c / 3)));

            // Spotlight all matching numbers across the board
            const isSameNumber =
              !isBoardSolved && targetSpotlightDigit !== 0 && val !== 0 && val === targetSpotlightDigit;

            // In number-first mode (or cell-first when a number is selected):
            // Spotlight all rows, columns, and 3x3 squares that already contain this number!
            const boxIndex = Math.floor(r / 3) * 3 + Math.floor(c / 3);
            const isNumberSpotlight =
              !isBoardSolved &&
              targetSpotlightDigit > 0 &&
              !isSelected &&
              (coveredRows.has(r) || coveredCols.has(c) || coveredBoxes.has(boxIndex));

            // Cursor spotlight following the hovered cell's row & column
            const isHovered = !isBoardSolved && hoveredCell?.row === r && hoveredCell?.col === c;
            const isHoverRelated =
              !isBoardSolved &&
              !!hoveredCell &&
              !isSelected &&
              (hoveredCell.row === r ||
                hoveredCell.col === c ||
                (Math.floor(hoveredCell.row / 3) === Math.floor(r / 3) &&
                  Math.floor(hoveredCell.col / 3) === Math.floor(c / 3)));

            // Spotlight numbers matching the hovered cell if no number is actively spotlighted
            const isSameHoverNumber =
              !isBoardSolved &&
              !isSelected &&
              targetSpotlightDigit === 0 &&
              hoveredValue !== 0 &&
              val !== 0 &&
              val === hoveredValue;

            // In instant mode, error if not given, non-zero, and does not match solution
            const isError =
              !isBoardSolved &&
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
                isBoardSolved={isBoardSolved}
                notes={cellNotes}
                isSelected={isSelected}
                isRelated={isRelated}
                isNumberSpotlight={isNumberSpotlight}
                isSameNumber={isSameNumber}
                isHoverRelated={isHoverRelated}
                isHovered={isHovered}
                isSameHoverNumber={isSameHoverNumber}
                isError={isError}
                opponentColor={oppColor}
                onClick={() => onSelectCell(r, c)}
                onMouseEnter={() => setHoveredCell({ row: r, col: c })}
              />
            );
          })
        )}
      </div>

      {/* Visual State / Legend */}
      {isBoardSolved ? (
        <div className="flex items-center justify-center gap-2 mt-2.5 text-xs font-black text-emerald-400 tracking-wide animate-pulse">
          <span>✨</span>
          <span>BOARD SOLVED! ALL 81 TILES FIXED & LOCKED</span>
          <span>✨</span>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-2.5 px-1 text-[11px] font-medium text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-100 shadow-sm" />
              <span className="text-slate-200">Clue</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-cyan-400 shadow-sm shadow-cyan-500/50" />
              <span className="text-cyan-300">Your Entry</span>
            </span>
            {validationMode === 'instant' && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-red-500 shadow-sm" />
                <span className="text-red-400">Mistake</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            {inputMode === 'number-first'
              ? activeNumber !== null
                ? `Digit ${activeNumber} Active`
                : 'Pick a digit to place'
              : 'Click cell to select'}
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';

interface CellProps {
  row: number;
  col: number;
  value: number;
  given: boolean; // Pre-generated clue
  isLocked?: boolean; // User-filled correct placement in instant mode
  isBoardSolved?: boolean; // Full board victory state
  notes: number[];
  isSelected: boolean;
  isRelated: boolean; // Selected cell's row, col, or box
  isNumberSpotlight?: boolean; // Covered row, col, or box for active number
  isSameNumber: boolean; // Same number highlight
  isHoverRelated?: boolean; // Cursor spotlight on row/col
  isHovered?: boolean;
  isSameHoverNumber?: boolean;
  isError: boolean;
  opponentColor?: string;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const Cell: React.FC<CellProps> = ({
  row,
  col,
  value,
  given,
  isLocked,
  isBoardSolved,
  notes,
  isSelected,
  isRelated,
  isNumberSpotlight,
  isSameNumber,
  isHoverRelated,
  isHovered,
  isSameHoverNumber,
  isError,
  opponentColor,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  // Determine border styles for 3x3 subgrids
  const isRightThick = col === 2 || col === 5;
  const isBottomThick = row === 2 || row === 5;

  // Background spotlighting logic (high contrast hierarchy):
  let bgClass = given ? 'bg-slate-900' : 'bg-slate-950';

  if (isBoardSolved) {
    bgClass = 'animate-solved-cell bg-emerald-950/40 border-emerald-500/50 cursor-default pointer-events-none';
  } else if (isSelected) {
    // High-visibility focus for the selected cell
    bgClass = 'bg-indigo-600/70 ring-2 ring-indigo-300 z-20 shadow-lg shadow-indigo-500/40 text-white';
  } else if (isError) {
    // High-visibility red for mistakes
    bgClass = 'bg-red-950/90 border-red-500 ring-2 ring-red-500/60 animate-pulse z-10';
  } else if (isSameNumber && value !== 0) {
    // Vibrant spotlight on identical numbers across the board
    bgClass = 'bg-cyan-950/90 border-cyan-400 ring-2 ring-cyan-400/80 shadow-md shadow-cyan-500/30 z-10 scale-[1.02]';
  } else if (isRelated) {
    // High-contrast luminous tint on selected cell's row, column, and 3x3 box
    bgClass = 'bg-indigo-950/80 border-indigo-900/60';
  } else if (isNumberSpotlight) {
    // High-contrast cross-hatch spotlight for active number in number-first mode
    bgClass = 'bg-cyan-950/40 border-cyan-900/40';
  } else if (isSameHoverNumber && value !== 0) {
    bgClass = 'bg-cyan-950/70 border-cyan-400/50 ring-1 ring-cyan-400/40';
  } else if (isHovered) {
    // Hovered cell under cursor
    bgClass = 'bg-slate-800/80 ring-2 ring-indigo-400/60 z-10';
  } else if (isHoverRelated) {
    // Clearly visible lighter spotlight following the cursor's row and column
    bgClass = 'bg-slate-800/60 transition-colors duration-100';
  }

  // Text color logic:
  // - Solved State: ALL 81 numbers become the unified radiant emerald color! (Fixed & unchangeable)
  // - In-Game Generated Clues: Pure crisp White
  // - In-Game User Filled Correct (Locked): Vibrant Cyan
  // - In-Game Freeform: Sky Blue
  // - In-Game Error: Bright Red
  let textClass = 'text-sky-300 font-bold';
  if (isBoardSolved) {
    textClass = 'text-emerald-400 font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-solved-number';
  } else if (given) {
    textClass = 'text-white font-black tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
  } else if (isError) {
    textClass = 'text-red-400 font-black';
  } else if (isLocked) {
    textClass = 'text-cyan-400 font-black tracking-tight drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]';
  }

  // Wave ripple delay: diagonal cascading across the 9x9 grid
  const rippleDelay = isBoardSolved ? `${(row + col) * 45}ms` : undefined;

  return (
    <div
      onClick={isBoardSolved ? undefined : onClick}
      onMouseEnter={isBoardSolved ? undefined : onMouseEnter}
      onMouseLeave={isBoardSolved ? undefined : onMouseLeave}
      style={{ animationDelay: rippleDelay }}
      className={`relative aspect-square flex items-center justify-center select-none transition-colors border border-slate-800/80 ${
        isRightThick ? 'border-r-slate-500 border-r-2' : ''
      } ${isBottomThick ? 'border-b-slate-500 border-b-2' : ''} ${
        isBoardSolved ? '' : 'cursor-pointer'
      } ${bgClass}`}
    >
      {/* Given Clue Indicator: subtle dot (hidden when board is solved) */}
      {given && !isBoardSolved && (
        <span
          className="absolute top-1 left-1 w-1 h-1 rounded-full bg-slate-500/50"
          title="Pre-generated clue"
        />
      )}

      {/* Opponent Focus Ghost Indicator (hidden when board is solved) */}
      {opponentColor && !isBoardSolved && (
        <span
          className="absolute top-1 right-1 w-2 h-2 rounded-full animate-ping shadow-sm"
          style={{ backgroundColor: opponentColor }}
        />
      )}

      {/* Main Number or Notes Grid */}
      {value !== 0 ? (
        <span
          style={{ animationDelay: rippleDelay }}
          className={`text-xl sm:text-2xl md:text-3xl ${textClass}`}
        >
          {value}
        </span>
      ) : notes.length > 0 ? (
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5 pointer-events-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span
              key={n}
              className={`flex items-center justify-center text-[9px] sm:text-[11px] leading-none ${
                notes.includes(n) ? 'text-slate-400 font-medium' : 'invisible'
              }`}
            >
              {n}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

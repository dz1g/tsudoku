import React from 'react';

interface CellProps {
  row: number;
  col: number;
  value: number;
  given: boolean; // Pre-generated clue
  isLocked?: boolean; // User-filled correct placement in instant mode
  notes: number[];
  isSelected: boolean;
  isRelated: boolean;
  isSameNumber: boolean;
  isError: boolean;
  opponentColor?: string;
  onClick: () => void;
}

export const Cell: React.FC<CellProps> = ({
  row,
  col,
  value,
  given,
  isLocked,
  notes,
  isSelected,
  isRelated,
  isSameNumber,
  isError,
  opponentColor,
  onClick,
}) => {
  // Determine border styles for 3x3 subgrids
  const isRightThick = col === 2 || col === 5;
  const isBottomThick = row === 2 || row === 5;

  // Background styling logic
  let bgClass = given ? 'bg-slate-900/95' : 'bg-slate-950/70 hover:bg-slate-900/60';
  if (isSelected) {
    bgClass = 'bg-indigo-600/40 ring-2 ring-indigo-400 z-10';
  } else if (isError) {
    bgClass = 'bg-red-950/70 border-red-500/50 animate-pulse';
  } else if (isSameNumber && value !== 0) {
    bgClass = 'bg-indigo-950/70 border-indigo-500/50';
  } else if (isRelated) {
    bgClass = 'bg-slate-900/60';
  }

  // Clear visual color distinction:
  // 1. Generated clues: Crisp pure White with etched font
  // 2. User filled correct (Locked): Vibrant Cyan (#22d3ee) with subtle glow
  // 3. User filled in freeform: Sky Blue (#38bdf8)
  // 4. User filled error: Bright Red (#f87171)
  let textClass = 'text-sky-300 font-bold';
  if (given) {
    textClass = 'text-white font-black tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
  } else if (isError) {
    textClass = 'text-red-400 font-black';
  } else if (isLocked) {
    textClass = 'text-cyan-400 font-black tracking-tight drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]';
  }

  return (
    <div
      onClick={onClick}
      className={`relative aspect-square flex items-center justify-center cursor-pointer select-none transition-colors border border-slate-800/80 ${
        isRightThick ? 'border-r-slate-500 border-r-2' : ''
      } ${isBottomThick ? 'border-b-slate-500 border-b-2' : ''} ${bgClass}`}
    >
      {/* Given Clue Indicator: subtle dot */}
      {given && (
        <span
          className="absolute top-1 left-1 w-1 h-1 rounded-full bg-slate-500/50"
          title="Pre-generated clue"
        />
      )}

      {/* Opponent Focus Ghost Indicator */}
      {opponentColor && (
        <span
          className="absolute top-1 right-1 w-2 h-2 rounded-full animate-ping shadow-sm"
          style={{ backgroundColor: opponentColor }}
        />
      )}

      {/* Main Number or Notes Grid */}
      {value !== 0 ? (
        <span className={`text-xl sm:text-2xl md:text-3xl ${textClass}`}>
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

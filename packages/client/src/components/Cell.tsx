import React from 'react';

interface CellProps {
  row: number;
  col: number;
  value: number;
  given: boolean;
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
  let bgClass = 'bg-slate-900 hover:bg-slate-800/80';
  if (isSelected) {
    bgClass = 'bg-indigo-600/40 ring-2 ring-indigo-400 z-10';
  } else if (isError) {
    bgClass = 'bg-red-950/70 text-red-400 animate-pulse';
  } else if (isSameNumber && value !== 0) {
    bgClass = 'bg-indigo-950/70 border-indigo-500/50';
  } else if (isRelated) {
    bgClass = 'bg-slate-800/50';
  }

  // Text color logic
  let textClass = 'text-cyan-400 font-semibold';
  if (given) {
    textClass = 'text-white font-extrabold';
  } else if (isError) {
    textClass = 'text-red-400 font-bold';
  }

  return (
    <div
      onClick={onClick}
      className={`relative aspect-square flex items-center justify-center cursor-pointer select-none transition-colors border border-slate-800 ${
        isRightThick ? 'border-r-slate-500 border-r-2' : ''
      } ${isBottomThick ? 'border-b-slate-500 border-b-2' : ''} ${bgClass}`}
    >
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

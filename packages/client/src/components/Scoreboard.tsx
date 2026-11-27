import React from 'react';
import { Player } from '@tsudoku/shared';
import { Award, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ScoreboardProps {
  players: Record<string, Player>;
  currentPlayerId: string | null;
  validationMode: 'instant' | 'freeform';
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  currentPlayerId,
  validationMode,
}) => {
  const sortedPlayers = Object.values(players).sort((a, b) => {
    // Rank if completed
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    if (a.completed && b.completed && a.rank && b.rank) return a.rank - b.rank;
    // Otherwise progress
    if (b.progress !== a.progress) return b.progress - a.progress;
    // Otherwise score
    return b.score - a.score;
  });

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-xl">
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <h3 className="text-[11px] sm:text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          Live Race Standings
        </h3>
        {validationMode === 'instant' ? (
          <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded-full">
            Instant Penalty ON
          </span>
        ) : (
          <span className="text-[10px] sm:text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full">
            Freeform Mode
          </span>
        )}
      </div>

      <div className="space-y-1.5 sm:space-y-2 max-h-24 sm:max-h-32 md:max-h-36 overflow-y-auto pr-0.5">
        {sortedPlayers.map((p, idx) => {
          const isCurrent = p.id === currentPlayerId;
          return (
            <div
              key={p.id}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-slate-800/80 border-indigo-500/60 ring-1 ring-indigo-500/30'
                  : 'bg-slate-950/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] sm:text-xs mb-1 font-medium">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-slate-500 font-mono text-[9px] sm:text-[10px] w-3">
                    #{idx + 1}
                  </span>
                  <div
                    className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-slate-200 font-bold truncate max-w-[100px] sm:max-w-[150px]">
                    {p.name} {isCurrent && <span className="text-indigo-400 font-normal">(You)</span>}
                  </span>
                  {p.completed && (
                    <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/50">
                      <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Done
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  {validationMode === 'instant' && p.mistakes > 0 && (
                    <span className="text-red-400 flex items-center gap-0.5 text-[10px] sm:text-[11px]" title="Mistakes">
                      <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {p.mistakes}
                    </span>
                  )}
                  <span className="font-mono font-bold text-amber-300">
                    {p.score} <span className="text-[9px] sm:text-[10px] text-slate-500 font-normal">pts</span>
                  </span>
                  <span className="font-mono font-bold text-cyan-400 w-8 sm:w-10 text-right">
                    {p.progress}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 sm:h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(0, p.progress))}%`,
                    backgroundColor: p.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

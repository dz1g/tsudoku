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
    <div className="w-full bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-400" />
          Live Race Standings
        </h3>
        {validationMode === 'instant' ? (
          <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded-full">
            Instant Penalty ON
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full">
            Freeform Mode
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {sortedPlayers.map((p, idx) => {
          const isCurrent = p.id === currentPlayerId;
          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-slate-800/80 border-indigo-500/60 ring-1 ring-indigo-500/30'
                  : 'bg-slate-950/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-[10px] w-3">
                    #{idx + 1}
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-slate-200 font-bold truncate max-w-[120px] sm:max-w-[180px]">
                    {p.name} {isCurrent && <span className="text-indigo-400 font-normal">(You)</span>}
                  </span>
                  {p.completed && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/50">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {validationMode === 'instant' && p.mistakes > 0 && (
                    <span className="text-red-400 flex items-center gap-0.5 text-[11px]" title="Mistakes">
                      <AlertTriangle className="w-3 h-3" /> {p.mistakes}
                    </span>
                  )}
                  <span className="font-mono font-bold text-amber-300">
                    {p.score} <span className="text-[10px] text-slate-500 font-normal">pts</span>
                  </span>
                  <span className="font-mono font-bold text-cyan-400 w-10 text-right">
                    {p.progress}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
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

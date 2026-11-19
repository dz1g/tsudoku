import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PodiumEntry } from '@tsudoku/shared';
import { Trophy, Clock, AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { sounds } from '../utils/audio';

interface PodiumModalProps {
  podium: PodiumEntry[];
  currentPlayerId: string | null;
  onRematch: () => void;
  onLeave: () => void;
  isHost: boolean;
}

export const PodiumModal: React.FC<PodiumModalProps> = ({
  podium,
  currentPlayerId,
  onRematch,
  onLeave,
  isHost,
}) => {
  useEffect(() => {
    sounds.playVictory();

    // Trigger colorful confetti shower
    const end = Date.now() + 3000;
    const colors = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ec4899'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const winner = podium[0];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header with Trophy */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/20">
            <Trophy className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Race Concluded!</h2>
          {winner && (
            <p className="text-sm text-slate-300">
              <span className="font-extrabold text-amber-400">{winner.name}</span> wins 1st place!
            </p>
          )}
        </div>

        {/* Podium Standings List */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {podium.map((entry) => {
            const isUser = entry.playerId === currentPlayerId;
            const isFirst = entry.rank === 1;

            return (
              <div
                key={entry.playerId}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isUser
                    ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isFirst
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                        : entry.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : entry.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{entry.rank}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-200">
                      {entry.name} {isUser && <span className="text-indigo-400 text-xs">(You)</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatTime(entry.finishTimeMs)}
                      </span>
                      {entry.mistakes > 0 && (
                        <span className="flex items-center gap-1 text-red-400 font-mono">
                          <AlertTriangle className="w-3 h-3" />
                          {entry.mistakes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-extrabold text-cyan-400 text-base">
                    {entry.score} <span className="text-[10px] text-slate-500 font-normal">pts</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {entry.progress}% solved
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {isHost ? (
            <button
              onClick={() => {
                sounds.playClick();
                onRematch();
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-transform active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rematch (New Puzzle)</span>
            </button>
          ) : (
            <div className="text-center py-2 text-xs text-slate-400 animate-pulse">
              Waiting for host to start a rematch...
            </div>
          )}

          <button
            onClick={() => {
              sounds.playClick();
              onLeave();
            }}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            <Home className="w-4 h-4" />
            <span>Return to Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

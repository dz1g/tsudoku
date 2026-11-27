import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, LogOut, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

interface HeaderProps {
  roomCode?: string;
  connected: boolean;
  onLeaveRoom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ roomCode, connected, onLeaveRoom }) => {
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.enabled);

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundEnabled(sounds.enabled);
    if (sounds.enabled) sounds.playClick();
  };

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full bg-slate-900/80 backdrop-blur border-b border-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 flex-shrink-0 z-40">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1">
              TSU<span className="text-cyan-400">DOKU</span>
            </span>
          </div>
          {/* Connection status */}
          <span
            className={`w-2 h-2 rounded-full ml-1 ${
              connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-red-500 animate-pulse'
            }`}
            title={connected ? 'Connected to server' : 'Connecting...'}
          />
        </div>

        {/* Room Info & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {roomCode && (
            <button
              onClick={copyRoomCode}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs sm:text-sm font-mono text-slate-200 transition-colors"
              title="Click to copy Room Code"
            >
              <span className="text-slate-400 font-sans hidden sm:inline text-xs">Room:</span>
              <span className="font-bold tracking-wider text-cyan-300 text-xs sm:text-sm">{roomCode}</span>
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          )}

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />}
          </button>

          {/* Leave Room Button */}
          {roomCode && onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-300 border border-slate-700 text-slate-400 transition-colors"
              title="Leave Room"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

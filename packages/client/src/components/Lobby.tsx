import React, { useState } from 'react';
import {
  Room,
  Difficulty,
  ValidationMode,
  RoomSettings,
} from '@tsudoku/shared';
import { Dice5, Crown, Play, Users, ShieldAlert, Award, Copy, Check } from 'lucide-react';
import { generateRandomNickname } from '../utils/nickname';
import { sounds } from '../utils/audio';

interface LobbyProps {
  room: Room | null;
  playerId: string | null;
  nickname: string;
  setNickname: (name: string) => void;
  onCreateRoom: (name: string, settings?: Partial<RoomSettings>) => void;
  onJoinRoom: (code: string, name: string) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onStartGame: () => void;
  countdown: number | null;
  errorMsg: string | null;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  playerId,
  nickname,
  setNickname,
  onCreateRoom,
  onJoinRoom,
  onUpdateSettings,
  onStartGame,
  countdown,
  errorMsg,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [selectedValidation, setSelectedValidation] = useState<ValidationMode>('instant');
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = room && playerId ? room.players[playerId]?.isHost : false;
  const playersList = room ? Object.values(room.players) : [];

  const handleRerollNickname = () => {
    const nextName = generateRandomNickname();
    setNickname(nextName);
    sounds.playClick();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    onCreateRoom(nickname, {
      difficulty: selectedDifficulty,
      validationMode: selectedValidation,
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    sounds.playClick();
    onJoinRoom(joinCode.trim().toUpperCase(), nickname);
  };

  const copyInviteLink = () => {
    if (!room) return;
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    sounds.playClick();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Nickname Selector Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
        <label className="block text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
          Your Nickname
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={nickname}
            maxLength={16}
            onChange={(e) => setNickname(e.target.value)}
            disabled={!!room}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-60"
            placeholder="Enter player nickname"
          />
          {!room && (
            <button
              onClick={handleRerollNickname}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 flex items-center gap-2 transition-colors font-medium text-sm"
              title="Generate random nickname"
            >
              <Dice5 className="w-4 h-4 text-cyan-400" />
              <span>Reroll</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Countdown Overlay if triggered */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-fade-in">
          <span className="text-xl font-bold uppercase tracking-widest text-cyan-400 mb-4">
            Match Starting In
          </span>
          <div className="text-9xl font-black text-white animate-bounce drop-shadow-[0_0_35px_rgba(99,102,241,0.6)]">
            {countdown}
          </div>
          <span className="text-slate-400 mt-6 text-sm">Prepare your grid!</span>
        </div>
      )}

      {/* State A: In Lobby Room */}
      {room ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Room Header & Invite */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Multiplayer Room Code
              </span>
              <div className="text-3xl font-extrabold font-mono text-cyan-400 tracking-wider">
                {room.code}
              </div>
            </div>
            <button
              onClick={copyInviteLink}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl font-medium text-sm transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
            </button>
          </div>

          {/* Player Roster */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" /> Players ({playersList.length}/{room.settings.maxPlayers})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playersList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-semibold text-slate-200 truncate">
                      {p.name} {p.id === playerId && '(You)'}
                    </span>
                  </div>
                  {p.isHost && (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                      <Crown className="w-3.5 h-3.5" /> Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Game Rules / Match Settings */}
          <div className="pt-4 border-t border-slate-800 space-y-5">
            <h3 className="text-sm uppercase font-bold text-slate-400 tracking-wider">
              Match Settings {isHost ? '(Host Configurable)' : '(View Only)'}
            </h3>

            {/* Difficulty Selector */}
            <div>
              <label className="block text-xs text-slate-400 mb-2 font-medium">Difficulty Level</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    disabled={!isHost}
                    onClick={() => {
                      sounds.playClick();
                      onUpdateSettings({ difficulty: diff });
                    }}
                    className={`py-2 px-3 rounded-xl font-bold capitalize text-xs sm:text-sm border transition-all ${
                      room.settings.difficulty === diff
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    } ${!isHost && 'cursor-default opacity-80'}`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Validation & Penalty Mode Toggle */}
            <div>
              <label className="block text-xs text-slate-400 mb-2 font-medium">
                Feedback & Penalty Rules
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => {
                    sounds.playClick();
                    onUpdateSettings({ validationMode: 'instant' });
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    room.settings.validationMode === 'instant'
                      ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  } ${!isHost && 'cursor-default opacity-80'}`}
                >
                  <div className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Instant Feedback
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Wrong moves highlighted instantly with a -50 pts score penalty.
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => {
                    sounds.playClick();
                    onUpdateSettings({ validationMode: 'freeform' });
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    room.settings.validationMode === 'freeform'
                      ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  } ${!isHost && 'cursor-default opacity-80'}`}
                >
                  <div className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                    <Award className="w-4 h-4" /> Freeform Mode
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    No immediate error feedback or penalty. Board validity checked upon completion.
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Host Start Button or Waiting Banner */}
          <div className="pt-4">
            {isHost ? (
              <button
                onClick={() => {
                  sounds.playClick();
                  onStartGame();
                }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold text-lg flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/25 transition-all transform active:scale-[0.99]"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Start Race</span>
              </button>
            ) : (
              <div className="text-center py-4 px-6 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 font-medium text-sm animate-pulse">
                Waiting for the host to start the race...
              </div>
            )}
          </div>
        </div>
      ) : (
        /* State B: Not in room (Create or Join Tabs) */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => {
                setActiveTab('create');
                sounds.playClick();
              }}
              className={`flex-1 py-3 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Create New Race
            </button>
            <button
              onClick={() => {
                setActiveTab('join');
                sounds.playClick();
              }}
              className={`flex-1 py-3 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'join'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Join with Code
            </button>
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Difficulty selector */}
              <div>
                <label className="block text-xs uppercase font-bold text-slate-400 mb-2">
                  Select Difficulty
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => {
                        setSelectedDifficulty(diff);
                        sounds.playClick();
                      }}
                      className={`py-2 px-3 rounded-xl font-bold capitalize text-xs sm:text-sm border transition-all ${
                        selectedDifficulty === diff
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Validation mode toggle */}
              <div>
                <label className="block text-xs uppercase font-bold text-slate-400 mb-2">
                  Validation & Penalty
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedValidation('instant');
                      sounds.playClick();
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedValidation === 'instant'
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-indigo-300">Instant Feedback</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Immediate error checking with -50 pts penalty.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedValidation('freeform');
                      sounds.playClick();
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedValidation === 'freeform'
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-cyan-300">Freeform Mode</div>
                    <div className="text-xs text-slate-400 mt-1">
                      No live penalties. Checked on completion.
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold text-base shadow-lg shadow-indigo-500/25 transition-all transform active:scale-[0.99]"
              >
                Create Race Room
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-6">
              <div>
                <label className="block text-xs uppercase font-bold text-slate-400 mb-2">
                  Enter 6-Character Room Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono tracking-widest text-center text-cyan-400 uppercase font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. TSU8X2"
                />
              </div>

              <button
                type="submit"
                disabled={joinCode.trim().length === 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold text-base shadow-lg shadow-indigo-500/25 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Race
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};


import React, { useState } from 'react';
import { AppRole } from './types';
import HostView from './components/HostView';
import AdminView from './components/AdminView';
import PlayerView from './components/PlayerView';

const App: React.FC = () => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [playerIndex, setPlayerIndex] = useState<number>(0);

  if (!role) {
    return (
      <div className="flex flex-col items-center min-h-[100dvh] bg-slate-950 text-white p-6 relative overflow-y-auto overflow-x-hidden">
        {/* 背景裝飾 */}
        <div className="fixed top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="z-10 text-center mb-10 mt-10 shrink-0">
          <h1 className="text-6xl md:text-8xl font-black mb-2 gold-text tracking-tighter drop-shadow-2xl italic">一字千金</h1>
          <div className="h-1 w-48 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto mb-2"></div>
          <p className="text-xs md:text-xl text-blue-300 font-bold tracking-[0.3em] uppercase">Party Word Game System</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl z-10 mb-20">
          {/* Host Card */}
          <button 
            onClick={() => setRole(AppRole.HOST)}
            className="group relative flex flex-col items-center p-8 bg-slate-900/80 border-2 border-blue-500/30 rounded-[32px] hover:border-blue-400 transition-all active:scale-95 shadow-xl"
          >
            <div className="text-6xl mb-4">🖥️</div>
            <span className="text-xl font-black text-blue-100 uppercase tracking-widest">主控顯示端</span>
            <p className="text-blue-400/60 text-[10px] mt-2">適用於電視或大螢幕</p>
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
          </button>
          
          {/* Admin Card */}
          <button 
            onClick={() => setRole(AppRole.ADMIN)}
            className="group relative flex flex-col items-center p-8 bg-slate-900/80 border-2 border-purple-500/30 rounded-[32px] hover:border-purple-400 transition-all active:scale-95 shadow-xl"
          >
            <div className="text-6xl mb-4">📱</div>
            <span className="text-xl font-black text-purple-100 uppercase tracking-widest">管理控制端</span>
            <p className="text-purple-400/60 text-[10px] mt-2">負責出題與分數覆核</p>
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none"></div>
          </button>

          {/* Player Card */}
          <div className="group relative flex flex-col items-center p-8 bg-slate-900/80 border-2 border-emerald-500/30 rounded-[32px] shadow-xl">
            <div className="text-6xl mb-4">✍️</div>
            <span className="text-xl font-black text-emerald-100 uppercase tracking-widest mb-4">選手書寫端</span>
            <div className="flex flex-col gap-3 w-full">
               <select 
                 className="bg-emerald-950 border border-emerald-500/50 text-emerald-100 p-4 rounded-2xl text-center font-bold focus:outline-none appearance-none"
                 value={playerIndex}
                 onChange={(e) => setPlayerIndex(parseInt(e.target.value))}
               >
                 <option value={0}>選手 A (Player 1)</option>
                 <option value={1}>選手 B (Player 2)</option>
                 <option value={2}>選手 C (Player 3)</option>
               </select>
               <button 
                 onClick={() => setRole(AppRole.PLAYER)}
                 className="w-full bg-emerald-600 active:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95"
               >
                 進入比賽
               </button>
            </div>
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>
          </div>
        </div>

        <div className="mt-auto pb-10 text-slate-500 text-[10px] font-mono opacity-50 uppercase tracking-[0.5em] z-10 text-center">
          P2P Connected | Built for Parties
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-black">
      {role === AppRole.HOST && <HostView />}
      {role === AppRole.ADMIN && <AdminView />}
      {role === AppRole.PLAYER && <PlayerView playerIndex={playerIndex} />}
    </div>
  );
};

export default App;

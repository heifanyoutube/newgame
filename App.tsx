
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 relative overflow-hidden">
        {/* 背景裝飾 */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="z-10 text-center mb-16">
          <h1 className="text-7xl md:text-8xl font-black mb-4 gold-text tracking-tighter drop-shadow-2xl italic">一字千金</h1>
          <div className="h-1 w-64 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto mb-2"></div>
          <p className="text-xl text-blue-300 font-bold tracking-[0.5em] uppercase">Party Word Game System</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl z-10">
          {/* Host Card */}
          <button 
            onClick={() => setRole(AppRole.HOST)}
            className="group relative flex flex-col items-center p-10 bg-slate-900 border-2 border-blue-500/30 rounded-3xl hover:border-blue-400 transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]"
          >
            <div className="text-7xl mb-6 group-hover:scale-110 transition-transform">🖥️</div>
            <span className="text-2xl font-black text-blue-100">主控顯示端</span>
            <p className="text-blue-400/60 text-sm mt-3">適用於大螢幕投影</p>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
          </button>
          
          {/* Admin Card */}
          <button 
            onClick={() => setRole(AppRole.ADMIN)}
            className="group relative flex flex-col items-center p-10 bg-slate-900 border-2 border-purple-500/30 rounded-3xl hover:border-purple-400 transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]"
          >
            <div className="text-7xl mb-6 group-hover:scale-110 transition-transform">📱</div>
            <span className="text-2xl font-black text-purple-100">管理控制端</span>
            <p className="text-purple-400/60 text-sm mt-3">題目控制與分數覆核</p>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none"></div>
          </button>

          {/* Player Card */}
          <div className="group relative flex flex-col items-center p-10 bg-slate-900 border-2 border-emerald-500/30 rounded-3xl hover:border-emerald-400 transition-all hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <div className="text-7xl mb-6 group-hover:scale-110 transition-transform">✍️</div>
            <span className="text-2xl font-black text-emerald-100 mb-4">選手書寫端</span>
            <div className="flex flex-col gap-3 w-full">
               <select 
                 className="bg-emerald-950 border border-emerald-500/50 text-emerald-100 p-3 rounded-xl text-center font-bold focus:outline-none"
                 value={playerIndex}
                 onChange={(e) => setPlayerIndex(parseInt(e.target.value))}
               >
                 <option value={0}>選手 A (左側)</option>
                 <option value={1}>選手 B (中央)</option>
                 <option value={2}>選手 C (右側)</option>
               </select>
               <button 
                 onClick={() => setRole(AppRole.PLAYER)}
                 className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-colors shadow-lg"
               >
                 進入比賽
               </button>
            </div>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>
          </div>
        </div>

        <div className="mt-16 text-slate-500 text-sm font-mono opacity-50 uppercase tracking-widest">
          Version 1.2.0 | Peer-to-Peer Encrypted
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      {role === AppRole.HOST && <HostView />}
      {role === AppRole.ADMIN && <AdminView />}
      {role === AppRole.PLAYER && <PlayerView playerIndex={playerIndex} />}
    </div>
  );
};

export default App;

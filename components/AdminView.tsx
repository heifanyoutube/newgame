
import React, { useState, useEffect, useRef } from 'react';
import { PeerMessage, AppRole, PlayerState, Question } from '../types';
import { QUESTION_BANK } from '../constants';

const AdminView: React.FC = () => {
  const [hostId, setHostId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(-1);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);

  const connectToHost = () => {
    const idToUse = hostId.toUpperCase().trim();
    if (!idToUse) return;
    const peer = new (window as any).Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(idToUse);
      connRef.current = conn;
      conn.on('open', () => {
        setIsConnected(true);
        conn.send({ type: 'ROLE_IDENTIFY', role: AppRole.ADMIN });
      });
      conn.on('data', (data: any) => handleIncomingMessage(data));
      conn.on('close', () => setIsConnected(false));
    });
  };

  const handleIncomingMessage = (msg: any) => {
    if (msg.type === 'SYNC_STATE') {
      setPlayers(msg.state.players);
      setCurrentQuestion(msg.state.currentQuestion);
    }
  };

  const nextQuestion = () => {
    const nextIdx = (currentQIndex + 1) % QUESTION_BANK.length;
    const q = QUESTION_BANK[nextIdx];
    setCurrentQIndex(nextIdx);
    connRef.current?.send({ type: 'NEXT_QUESTION', question: q, questionIndex: nextIdx });
  };

  const overrideScore = (playerIndex: number, isCorrect: boolean) => {
    connRef.current?.send({ type: 'OVERRIDE_SCORE', playerIndex, isCorrect });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 p-6">
        <h2 className="text-3xl font-black mb-8 gold-text italic">管理控制端</h2>
        <input 
          type="text" 
          placeholder="ROOM ID" 
          value={hostId}
          onChange={(e) => setHostId(e.target.value)}
          className="bg-black border-2 border-purple-500 rounded-2xl p-4 text-3xl text-center mb-6 w-full text-white uppercase font-mono"
        />
        <button onClick={connectToHost} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl text-xl">連線控制</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      {/* Top Bar */}
      <div className="bg-slate-800 p-4 border-b border-white/5 flex justify-between items-center">
        <div>
          <h1 className="text-sm font-black text-purple-400">ADMIN PANEL</h1>
          <p className="text-[10px] text-white/50">Room: {hostId}</p>
        </div>
        <button onClick={nextQuestion} className="bg-emerald-600 px-6 py-2 rounded-xl font-black text-sm shadow-lg active:scale-95">下一題</button>
      </div>

      {/* Current Question Info */}
      <div className="p-4">
        {currentQuestion ? (
          <div className="bg-blue-600/20 border-l-4 border-blue-500 p-4 rounded-r-xl">
            <span className="text-[10px] font-bold text-blue-400 uppercase">Current Question</span>
            <p className="text-lg font-bold">{currentQuestion.q}</p>
            <p className="text-emerald-400 font-black text-sm mt-1">正確答案：{currentQuestion.a}</p>
          </div>
        ) : (
          <div className="bg-slate-800/50 p-4 rounded-xl text-center text-white/30 text-sm italic">尚未開始出題</div>
        )}
      </div>

      {/* Players Real-time List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {players.map((p, idx) => (
          <div key={idx} className={`bg-slate-800 rounded-2xl border-2 transition-colors ${p.isAppealing ? 'border-rose-500 bg-rose-500/5' : 'border-white/5'}`}>
            <div className="p-4 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">選手 {idx + 1}</span>
                {p.isWriting && <span className="bg-blue-500 w-1.5 h-1.5 rounded-full animate-ping"></span>}
              </div>
              <div className="text-xs font-mono font-bold text-blue-400">SCORE: {p.score}</div>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/40 font-bold">辨識結果</span>
                  <span className={`text-3xl font-black ${p.isCorrect === true ? 'text-emerald-400' : p.isCorrect === false ? 'text-rose-400' : 'text-white'}`}>
                    {p.currentAnswer || "書寫中..."}
                  </span>
                </div>
                {p.isAppealing && <div className="bg-rose-600 text-white text-[10px] px-2 py-1 rounded font-black animate-pulse">請求審核</div>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => overrideScore(idx, true)}
                  className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl font-black text-xs active:bg-emerald-600 active:text-white"
                >
                  判斷正確
                </button>
                <button 
                  onClick={() => overrideScore(idx, false)}
                  className="bg-rose-600/20 text-rose-400 border border-rose-500/30 py-3 rounded-xl font-black text-xs active:bg-rose-600 active:text-white"
                >
                  判斷錯誤
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminView;

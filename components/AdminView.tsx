
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
  const previewCanvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);

  const connectToHost = () => {
    const idToUse = hostId.toUpperCase().trim();
    if (!idToUse) return;
    const peer = new (window as any).Peer();
    peerRef.current = peer;
    peer.on('open', () => {
      const conn = peer.connect(idToUse);
      connRef.current = conn;
      conn.on('open', () => { setIsConnected(true); conn.send({ type: 'ROLE_IDENTIFY', role: AppRole.ADMIN }); });
      conn.on('data', (data: any) => handleIncomingMessage(data));
      conn.on('close', () => setIsConnected(false));
    });
  };

  const handleIncomingMessage = (msg: any) => {
    if (msg.type === 'SYNC_STATE') {
      setPlayers(msg.state.players);
      setCurrentQuestion(msg.state.currentQuestion);
    } else if (msg.type === 'DRAW_POINT') {
      drawOnPreview(msg.playerIndex, msg.x, msg.y, msg.isNewPath);
    } else if (msg.type === 'CLEAR_CANVAS') {
      clearPreview(msg.playerIndex);
    } else if (msg.type === 'NEXT_QUESTION') {
      previewCanvasesRef.current.forEach((_, idx) => clearPreview(idx));
    }
  };

  const drawOnPreview = (index: number, x: number, y: number, isNewPath: boolean) => {
    const canvas = previewCanvasesRef.current[index];
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#FFFFFF';
    const ax = x * canvas.width; const ay = y * canvas.height;
    if (isNewPath) { ctx.beginPath(); ctx.moveTo(ax, ay); } else { ctx.lineTo(ax, ay); ctx.stroke(); }
  };

  const clearPreview = (index: number) => {
    previewCanvasesRef.current[index]?.getContext('2d')?.clearRect(0, 0, 1000, 1000);
  };

  const nextQuestion = () => {
    const idx = (currentQIndex + 1) % QUESTION_BANK.length;
    const q = QUESTION_BANK[idx];
    setCurrentQIndex(idx);
    connRef.current?.send({ type: 'NEXT_QUESTION', question: q, questionIndex: idx });
  };

  const overrideScore = (playerIndex: number, isCorrect: boolean) => {
    connRef.current?.send({ type: 'OVERRIDE_SCORE', playerIndex, isCorrect });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-[#020617] p-6">
        <h2 className="text-3xl font-black mb-8 gold-text italic">Master Console</h2>
        <input type="text" placeholder="ROOM ID" value={hostId} onChange={(e) => setHostId(e.target.value)} className="bg-black border-2 border-purple-500 rounded-2xl p-4 text-3xl text-center w-full text-white uppercase font-mono mb-6" />
        <button onClick={connectToHost} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl text-xl shadow-lg active:scale-95 transition-all">連線控制</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#020617] text-white overflow-hidden pb-safe">
      <div className="h-[10dvh] bg-slate-900 px-4 border-b border-white/10 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-black uppercase">Master Controller</span>
        </div>
        <button onClick={nextQuestion} className="bg-emerald-600 px-4 py-2 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all">下一題</button>
      </div>

      <div className="p-3 shrink-0">
        {currentQuestion && (
          <div className="bg-blue-600/10 border-l-4 border-blue-500 p-3 rounded-r-2xl">
            <span className="text-[8px] font-black text-blue-400 uppercase">Q-Bank: {currentQIndex + 1}</span>
            <p className="text-sm font-bold mt-1">正解：<span className="text-emerald-400 text-lg">{currentQuestion.a}</span> ({currentQuestion.q})</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-4">
        {players.map((p, idx) => (
          <div key={idx} className={`bg-slate-900/50 rounded-2xl border transition-all ${p.isAppealing ? 'border-rose-500 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-white/5'}`}>
            <div className="p-3 flex justify-between items-center border-b border-white/5">
              <span className="text-xs font-black">PLAYER {idx + 1}</span>
              <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">Score: {p.score}</span>
            </div>
            <div className="p-3 grid grid-cols-5 gap-3">
              <div className="col-span-2 flex flex-col justify-center">
                <span className="text-[8px] text-white/30 uppercase font-black">OCR</span>
                <span className={`text-4xl font-black leading-none ${p.isCorrect === true ? 'text-emerald-400' : p.isCorrect === false ? 'text-rose-400' : 'text-white'}`}>{p.currentAnswer || "..."}</span>
              </div>
              <div className="col-span-3 h-16 bg-black rounded-xl border border-white/5 relative">
                 <canvas ref={el => { previewCanvasesRef.current[idx] = el; }} width={300} height={300} className="w-full h-full object-contain" />
                 {p.isWriting && <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>}
              </div>
            </div>
            <div className="px-3 pb-3 grid grid-cols-2 gap-2">
              <button onClick={() => overrideScore(idx, true)} className="bg-emerald-600/10 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-xl text-[10px] font-black active:bg-emerald-600 active:text-white transition-all">正確 O</button>
              <button onClick={() => overrideScore(idx, false)} className="bg-rose-600/10 text-rose-400 border border-rose-500/30 py-2.5 rounded-xl text-[10px] font-black active:bg-rose-600 active:text-white transition-all">錯誤 X</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminView;

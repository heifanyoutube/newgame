
import React, { useState, useEffect, useRef } from 'react';
import { PeerMessage, AppRole, PlayerState, Question } from '../types';

const HostView: React.FC = () => {
  const [peerId, setPeerId] = useState<string>('');
  const [players, setPlayers] = useState<PlayerState[]>([
    { id: '', index: 0, score: 0, currentAnswer: '', isCorrect: null, isAppealing: false, isSubmitted: false, isWriting: false },
    { id: '', index: 1, score: 0, currentAnswer: '', isCorrect: null, isAppealing: false, isSubmitted: false, isWriting: false },
    { id: '', index: 2, score: 0, currentAnswer: '', isCorrect: null, isAppealing: false, isSubmitted: false, isWriting: false },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timer, setTimer] = useState(0);
  
  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<Map<string, any>>(new Map());
  const canvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);

  const generateShortId = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const broadcastToAll = (msg: any) => {
    connectionsRef.current.forEach(conn => { if (conn.open) conn.send(msg); });
  };

  const initPeer = (customId?: string) => {
    const id = customId || generateShortId();
    const peer = new (window as any).Peer(id);
    peerRef.current = peer;
    peer.on('open', (id: string) => setPeerId(id));
    peer.on('connection', (conn: any) => {
      conn.on('data', (data: PeerMessage) => handleIncomingMessage(data, conn));
      connectionsRef.current.set(conn.peer, conn);
      setTimeout(() => conn.send({ type: 'SYNC_STATE', state: { players, currentQuestion } }), 500);
    });
    peer.on('error', (err: any) => { if (err.type === 'unavailable-id') initPeer(); });
  };

  useEffect(() => { initPeer(); return () => peerRef.current?.destroy(); }, []);

  useEffect(() => { broadcastToAll({ type: 'SYNC_STATE', state: { players, currentQuestion } }); }, [players, currentQuestion]);

  const handleIncomingMessage = (msg: PeerMessage, conn: any) => {
    switch (msg.type) {
      case 'ROLE_IDENTIFY':
        if (msg.role === AppRole.PLAYER && typeof msg.playerIndex === 'number') {
          setPlayers(prev => {
            const next = [...prev];
            next[msg.playerIndex!] = { ...next[msg.playerIndex!], id: conn.peer };
            return next;
          });
        }
        break;
      case 'IS_WRITING':
        setPlayers(prev => {
          const next = [...prev];
          next[msg.playerIndex].isWriting = msg.writing;
          return next;
        });
        broadcastToAll(msg);
        break;
      case 'DRAW_POINT':
        drawOnCanvas(msg.playerIndex, msg.x, msg.y, msg.isNewPath);
        broadcastToAll(msg);
        break;
      case 'CLEAR_CANVAS':
        clearCanvas(msg.playerIndex);
        broadcastToAll(msg);
        break;
      case 'SUBMIT_ANSWER':
        setPlayers(prev => {
          const next = [...prev];
          const p = next[msg.playerIndex];
          p.currentAnswer = msg.answer;
          p.isSubmitted = true;
          p.isCorrect = currentQuestion ? msg.answer === currentQuestion.a : false;
          if (p.isCorrect) p.score += 10;
          return next;
        });
        break;
      case 'APPEAL':
        setPlayers(prev => {
          const next = [...prev];
          next[msg.playerIndex].isAppealing = true;
          return next;
        });
        break;
      case 'NEXT_QUESTION':
        setCurrentQuestion(msg.question);
        setTimer(20);
        setPlayers(prev => prev.map(p => ({ ...p, isSubmitted: false, currentAnswer: '', isCorrect: null, isAppealing: false, isWriting: false })));
        canvasesRef.current.forEach((_, idx) => clearCanvas(idx));
        broadcastToAll(msg);
        break;
      case 'OVERRIDE_SCORE':
        setPlayers(prev => {
          const next = [...prev];
          const p = next[msg.playerIndex];
          if (p.isCorrect === false && msg.isCorrect === true) p.score += 10;
          if (p.isCorrect === true && msg.isCorrect === false) p.score -= 10;
          p.isCorrect = msg.isCorrect;
          p.isAppealing = false;
          return next;
        });
        break;
    }
  };

  const drawOnCanvas = (index: number, x: number, y: number, isNewPath: boolean) => {
    const canvas = canvasesRef.current[index];
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#FFFFFF';
    const ax = x * canvas.width; const ay = y * canvas.height;
    if (isNewPath) { ctx.beginPath(); ctx.moveTo(ax, ay); } else { ctx.lineTo(ax, ay); ctx.stroke(); }
  };

  const clearCanvas = (index: number) => {
    canvasesRef.current[index]?.getContext('2d')?.clearRect(0, 0, 1000, 1000);
  };

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#020617] p-4 md:p-8 overflow-y-auto md:overflow-hidden relative pb-safe">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl md:text-5xl font-black italic gold-text tracking-tighter">一字千金</h1>
          <div className="bg-blue-600/20 border border-blue-500/50 rounded-lg px-3 py-1 flex flex-col">
            <span className="text-[8px] font-black text-blue-400 uppercase">Room ID</span>
            <span className="text-xl text-white font-mono font-black tracking-widest">{peerId || '-----'}</span>
          </div>
        </div>
        
        {currentQuestion && (
          <div className="flex-1 px-4 text-center">
            <h2 className="text-2xl md:text-5xl font-black text-white bg-slate-900/80 px-6 py-4 rounded-2xl border-2 border-blue-500/50 shadow-2xl">
              {currentQuestion.q}
            </h2>
          </div>
        )}

        <div className={`w-20 h-20 md:w-28 md:h-28 flex items-center justify-center rounded-full border-4 md:border-8 ${timer < 6 ? 'border-rose-600 animate-pulse' : 'border-yellow-500'} bg-black shrink-0`}>
          <span className={`text-2xl md:text-4xl font-black ${timer < 6 ? 'text-rose-500' : 'text-yellow-500'}`}>{timer}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {players.map((p, idx) => (
          <div key={idx} className={`relative flex flex-col rounded-[24px] md:rounded-[40px] overflow-hidden border-2 md:border-4 transition-all duration-500 ${
            p.isAppealing ? 'border-rose-500 bg-rose-950/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]' : 
            p.isCorrect === true ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 
            p.isCorrect === false ? 'border-rose-700' : 'border-slate-800'
          } bg-slate-900/40 backdrop-blur-sm min-h-[300px] md:min-h-0`}>
            
            <div className="p-3 bg-slate-900/80 flex justify-between items-center border-b border-white/5">
               <span className="text-xs font-black text-white/40 uppercase tracking-widest">Player {idx + 1}</span>
               {p.isWriting && <span className="text-blue-400 text-[10px] font-black animate-pulse uppercase">● Ink Entry...</span>}
            </div>

            <div className="flex-1 relative bg-black">
              <canvas ref={el => { canvasesRef.current[idx] = el; }} width={800} height={800} className="w-full h-full object-contain pointer-events-none" />
              {p.isCorrect !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                   {p.isCorrect ? <div className="w-32 h-32 md:w-48 md:h-48 border-[15px] md:border-[25px] border-emerald-500/20 rounded-full"></div> : <div className="text-[200px] md:text-[300px] text-rose-500/20 font-black leading-none">×</div>}
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-4 md:p-6 flex justify-between items-end relative overflow-hidden">
              <div>
                <span className="text-[8px] md:text-[10px] text-blue-400/50 font-black uppercase tracking-widest">Score</span>
                <div className="text-3xl md:text-5xl font-black gold-text tracking-tighter">{p.score}</div>
              </div>
              <div className="text-right">
                <span className="text-[8px] md:text-[10px] text-blue-400/50 font-black uppercase tracking-widest">Result</span>
                <div className="text-4xl md:text-7xl font-black text-white italic drop-shadow-lg">{p.currentAnswer || (p.isSubmitted ? '?' : '...')}</div>
              </div>
            </div>

            {p.isAppealing && (
              <div className="absolute inset-0 flex items-center justify-center bg-rose-600/10 backdrop-blur-sm pointer-events-none z-30">
                <div className="bg-rose-600 text-white px-6 py-3 md:px-10 md:py-4 text-xl md:text-3xl font-black rounded-2xl rotate-[-5deg] shadow-2xl animate-bounce border-2 border-white">APPEAL!</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HostView;

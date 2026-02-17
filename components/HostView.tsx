
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
    connectionsRef.current.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
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

    peer.on('error', (err: any) => {
      if (err.type === 'unavailable-id') initPeer();
    });
  };

  useEffect(() => {
    initPeer();
    return () => peerRef.current?.destroy();
  }, []);

  // 當 players 狀態改變時，自動同步給所有連線者 (特別是 Admin)
  useEffect(() => {
    broadcastToAll({ type: 'SYNC_STATE', state: { players, currentQuestion } });
  }, [players, currentQuestion]);

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
        break;

      case 'DRAW_POINT':
        drawOnCanvas(msg.playerIndex, msg.x, msg.y, msg.isNewPath);
        break;

      case 'CLEAR_CANVAS':
        clearCanvas(msg.playerIndex);
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FFFFFF';
    const actualX = x * canvas.width;
    const actualY = y * canvas.height;
    if (isNewPath) {
      ctx.beginPath();
      ctx.moveTo(actualX, actualY);
    } else {
      ctx.lineTo(actualX, actualY);
      ctx.stroke();
    }
  };

  const clearCanvas = (index: number) => {
    const canvas = canvasesRef.current[index];
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  return (
    <div className="flex flex-col h-full bg-[#020617] p-8 overflow-hidden relative">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-black italic gold-text tracking-tighter mb-2">一字千金</h1>
          <div className="bg-blue-600/20 border-2 border-blue-500/50 rounded-xl px-4 py-1.5 inline-flex flex-col">
            <span className="text-blue-400 text-[8px] font-bold uppercase">Room ID</span>
            <span className="text-2xl text-white font-mono font-black">{peerId || '-----'}</span>
          </div>
        </div>
        
        {currentQuestion && (
          <div className="flex-1 px-10 text-center">
            <div className="inline-block relative">
              <h2 className="text-5xl font-black text-white bg-slate-900/80 px-10 py-5 rounded-2xl border-2 border-blue-500/50 shadow-2xl">
                {currentQuestion.q}
              </h2>
            </div>
          </div>
        )}

        <div className={`w-28 h-28 flex items-center justify-center rounded-full border-8 ${timer < 6 ? 'border-rose-600 animate-pulse' : 'border-yellow-500'} bg-black`}>
          <span className={`text-4xl font-black ${timer < 6 ? 'text-rose-500' : 'text-yellow-500'}`}>{timer}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 flex-1">
        {players.map((p, idx) => (
          <div key={idx} className={`relative flex flex-col rounded-[32px] overflow-hidden border-4 transition-all duration-500 ${
            p.isAppealing ? 'border-rose-500 bg-rose-950/20' : 
            p.isCorrect === true ? 'border-emerald-500' : 
            p.isCorrect === false ? 'border-rose-700' : 'border-slate-800'
          } bg-slate-900/50`}>
            
            <div className="p-3 bg-slate-900/80 flex justify-between items-center">
               <span className="text-xs font-black text-white/50">PLAYER {idx + 1}</span>
               {p.isWriting && <span className="text-blue-400 text-[10px] font-bold animate-pulse">● 書寫中...</span>}
            </div>

            <div className="flex-1 relative bg-black">
              <canvas ref={el => { canvasesRef.current[idx] = el; }} width={800} height={800} className="w-full h-full object-contain pointer-events-none" />
              {p.isCorrect !== null && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none text-[150px] font-black">
                   {p.isCorrect ? 'O' : 'X'}
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-5 flex justify-between items-end">
              <div>
                <span className="text-[10px] text-blue-400/50 font-black">SCORE</span>
                <div className="text-4xl font-black gold-text leading-none">{p.score}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-blue-400/50 font-black">RESULT</span>
                <div className="text-5xl font-black text-white italic leading-none">{p.currentAnswer || '-'}</div>
              </div>
            </div>

            {p.isAppealing && (
              <div className="absolute inset-0 flex items-center justify-center bg-rose-600/10 pointer-events-none">
                <div className="bg-rose-600 text-white px-8 py-3 text-2xl font-black rounded-xl rotate-[-5deg] shadow-2xl animate-bounce">審核請求</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HostView;


import React, { useState, useEffect, useRef } from 'react';
import { PeerMessage, AppRole, Question } from '../types';

interface PlayerViewProps {
  playerIndex: number;
}

const PlayerView: React.FC<PlayerViewProps> = ({ playerIndex }) => {
  const [hostId, setHostId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const isDrawingRef = useRef(false);
  
  const strokesRef = useRef<number[][][]>([]);
  const currentStrokeRef = useRef<number[][]>([[], [], []]);

  const connectToHost = () => {
    const savedId = localStorage.getItem('last_host_id');
    const idToUse = (hostId || savedId || '').toUpperCase().trim();
    if (!idToUse) return;

    localStorage.setItem('last_host_id', idToUse);
    const peer = new (window as any).Peer();
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(idToUse);
      connRef.current = conn;

      conn.on('open', () => {
        setIsConnected(true);
        conn.send({ type: 'ROLE_IDENTIFY', role: AppRole.PLAYER, playerIndex });
      });

      conn.on('data', (msg: PeerMessage) => {
        if (msg.type === 'NEXT_QUESTION') {
          setCurrentQuestion(msg.question);
          clearLocalCanvas();
          setIsSubmitted(false);
        }
      });

      conn.on('close', () => setIsConnected(false));
      conn.on('error', () => setIsConnected(false));
    });
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(width, height);
    ctx.moveTo(width, 0); ctx.lineTo(0, height);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas.width, canvas.height);

    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FFFFFF';

    strokesRef.current.forEach(stroke => {
      ctx.beginPath();
      for (let i = 0; i < stroke[0].length; i++) {
        const x = (stroke[0][i] / 1000) * canvas.width;
        const y = (stroke[1][i] / 1000) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  };

  const clearLocalCanvas = () => {
    strokesRef.current = [];
    redrawCanvas();
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (isSubmitted) return;
    isDrawingRef.current = true;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentStrokeRef.current = [[], [], []];
    currentStrokeRef.current[0].push(Math.round((x / rect.width) * 1000));
    currentStrokeRef.current[1].push(Math.round((y / rect.height) * 1000));
    currentStrokeRef.current[2].push(Date.now());

    connRef.current?.send({ type: 'IS_WRITING', writing: true, playerIndex });
    connRef.current?.send({ type: 'DRAW_POINT', x: x / rect.width, y: y / rect.height, isNewPath: true, playerIndex });

    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || isSubmitted) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d')!;
    ctx.lineTo(x, y); ctx.stroke();

    currentStrokeRef.current[0].push(Math.round((x / rect.width) * 1000));
    currentStrokeRef.current[1].push(Math.round((y / rect.height) * 1000));
    currentStrokeRef.current[2].push(Date.now());

    connRef.current?.send({ type: 'DRAW_POINT', x: x / rect.width, y: y / rect.height, isNewPath: false, playerIndex });
  };

  const endDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current[0].length > 0) {
      strokesRef.current.push(JSON.parse(JSON.stringify(currentStrokeRef.current)));
    }
    connRef.current?.send({ type: 'IS_WRITING', writing: false, playerIndex });
  };

  const undo = () => {
    if (strokesRef.current.length > 0) {
      strokesRef.current.pop();
      redrawCanvas();
      connRef.current?.send({ type: 'CLEAR_CANVAS', playerIndex });
      strokesRef.current.forEach(stroke => {
        for (let i = 0; i < stroke[0].length; i++) {
          connRef.current?.send({ type: 'DRAW_POINT', x: stroke[0][i] / 1000, y: stroke[1][i] / 1000, isNewPath: i === 0, playerIndex });
        }
      });
    }
  };

  const clearCanvas = () => {
    clearLocalCanvas();
    connRef.current?.send({ type: 'CLEAR_CANVAS', playerIndex });
  };

  const submitAnswer = async () => {
    if (strokesRef.current.length === 0 || isSubmitted) return;
    setIsRecognizing(true);
    try {
      const response = await fetch('https://www.google.com.tw/inputtools/request?ime=handwriting&app=autofill&maxresults=3&out=json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_type: 0, requests: [{ writing_guide: { writing_area_width: 1000, writing_area_height: 1000 }, ink: strokesRef.current, language: 'zh-TW' }] })
      });
      const data = await response.json();
      const candidates = data[1][0][1];
      const recognizedText = candidates ? candidates[0] : '';
      connRef.current?.send({ type: 'SUBMIT_ANSWER', answer: recognizedText, playerIndex });
      setIsSubmitted(true);
    } catch (err) { alert('辨識連線失敗'); } finally { setIsRecognizing(false); }
  };

  useEffect(() => { if (isConnected) redrawCanvas(); }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-[#020617] p-6">
        <div className="bg-slate-900/50 p-8 rounded-[40px] border border-emerald-500/20 w-full max-w-xs text-center shadow-2xl backdrop-blur-xl">
          <h2 className="text-3xl font-black mb-8 gold-text italic tracking-tighter">選手登入</h2>
          <input 
            type="text" placeholder="ROOM ID" value={hostId} onChange={(e) => setHostId(e.target.value)}
            className="bg-black/50 border-2 border-emerald-500/30 rounded-2xl p-4 text-3xl text-center w-full text-white uppercase font-mono mb-8 focus:border-emerald-500 transition-all outline-none"
          />
          <button onClick={connectToHost} className="w-full bg-emerald-600 active:scale-95 text-white font-black py-5 rounded-2xl text-xl shadow-[0_8px_20px_rgba(16,185,129,0.3)]">連線進入</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white select-none overflow-hidden pb-safe">
      {/* 頂部極簡列 */}
      <div className="h-[12dvh] bg-slate-900/80 backdrop-blur-md px-4 flex justify-between items-center border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 text-black flex items-center justify-center font-black rounded-xl shadow-lg">P{playerIndex + 1}</div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Live Topic</span>
            <span className="text-sm font-bold truncate max-w-[150px]">{currentQuestion?.q || '等待出題...'}</span>
          </div>
        </div>
        {isSubmitted && <button onClick={() => connRef.current?.send({ type: 'APPEAL', playerIndex })} className="bg-rose-600 px-4 py-2 rounded-xl font-black text-xs shadow-lg active:scale-90 transition-transform">申訴</button>}
      </div>

      {/* 畫布核心區 - 嚴格控制高度比例 */}
      <div className="flex-1 relative m-2 bg-[#1a1a1a] rounded-[32px] overflow-hidden border border-white/5">
        <canvas ref={canvasRef} width={1000} height={1000} className="w-full h-full object-contain touch-none" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={endDrawing} onPointerLeave={endDrawing} />
        {isSubmitted && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md">
            <div className="text-emerald-500 text-6xl mb-2 animate-bounce">✓</div>
            <div className="text-xl font-black tracking-widest text-emerald-500">已成功送出</div>
            <p className="text-white/30 text-xs mt-2 uppercase">Waiting for judge...</p>
          </div>
        )}
      </div>

      {/* 底部按鈕區 - 確保高度固定且可點擊 */}
      <div className="h-[16dvh] px-3 flex items-center gap-2 bg-slate-900/50 shrink-0">
        <button onClick={undo} disabled={isSubmitted || strokesRef.current.length === 0} className="flex-1 h-14 bg-slate-800 active:bg-slate-700 disabled:opacity-20 rounded-2xl flex flex-col items-center justify-center gap-0.5">
          <span className="text-xs">↺</span><span className="text-[10px] font-black">復原</span>
        </button>
        <button onClick={clearCanvas} disabled={isSubmitted} className="flex-1 h-14 bg-slate-800 active:bg-slate-700 disabled:opacity-20 rounded-2xl flex flex-col items-center justify-center gap-0.5">
          <span className="text-xs">🗑️</span><span className="text-[10px] font-black">重寫</span>
        </button>
        <button onClick={submitAnswer} disabled={isSubmitted || isRecognizing || strokesRef.current.length === 0} className="flex-[2.5] h-14 bg-emerald-600 active:bg-emerald-500 disabled:bg-emerald-900/50 rounded-2xl font-black text-lg shadow-[0_4px_0_#065f46] active:translate-y-1 active:shadow-none transition-all">
          {isRecognizing ? "處理中..." : "送出答案"}
        </button>
      </div>
    </div>
  );
};

export default PlayerView;

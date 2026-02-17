
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

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (isSubmitted) return;
    isDrawingRef.current = true;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x, y);

    currentStrokeRef.current = [[], [], []];
    const normX = Math.round((x / rect.width) * 1000);
    const normY = Math.round((y / rect.height) * 1000);
    currentStrokeRef.current[0].push(normX);
    currentStrokeRef.current[1].push(normY);
    currentStrokeRef.current[2].push(Date.now());

    connRef.current?.send({ type: 'IS_WRITING', writing: true, playerIndex });
    connRef.current?.send({ 
      type: 'DRAW_POINT', 
      x: x / rect.width, 
      y: y / rect.height, 
      isNewPath: true, 
      playerIndex 
    });
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || isSubmitted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d')!;
    ctx.lineTo(x, y);
    ctx.stroke();

    const normX = Math.round((x / rect.width) * 1000);
    const normY = Math.round((y / rect.height) * 1000);
    currentStrokeRef.current[0].push(normX);
    currentStrokeRef.current[1].push(normY);
    currentStrokeRef.current[2].push(Date.now());

    connRef.current?.send({ 
      type: 'DRAW_POINT', 
      x: x / rect.width, 
      y: y / rect.height, 
      isNewPath: false, 
      playerIndex 
    });
  };

  const endDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current[0].length > 0) {
      strokesRef.current.push(JSON.parse(JSON.stringify(currentStrokeRef.current)));
    }
    connRef.current?.send({ type: 'IS_WRITING', writing: false, playerIndex });
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
        body: JSON.stringify({
          input_type: 0,
          requests: [{
            writing_guide: { writing_area_width: 1000, writing_area_height: 1000 },
            ink: strokesRef.current,
            language: 'zh-TW'
          }]
        })
      });

      const data = await response.json();
      const candidates = data[1][0][1];
      const recognizedText = candidates ? candidates[0] : '';
      
      connRef.current?.send({ type: 'SUBMIT_ANSWER', answer: recognizedText, playerIndex });
      setIsSubmitted(true);
    } catch (err) {
      alert('辨識連線失敗');
    } finally {
      setIsRecognizing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 p-6">
        <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl border-2 border-emerald-500/20 w-full max-w-sm text-center">
          <h2 className="text-3xl font-black mb-6 gold-text italic">選手連線</h2>
          <input 
            type="text" 
            placeholder="ROOM ID" 
            value={hostId}
            onChange={(e) => setHostId(e.target.value)}
            className="bg-black border-2 border-emerald-500/50 rounded-2xl p-4 text-3xl text-center mb-6 w-full text-white uppercase font-mono"
          />
          <button onClick={connectToHost} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl text-xl">加入比賽</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white select-none">
      {/* 題目列 - 手機版優化高度 */}
      <div className="bg-slate-900 px-4 py-3 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 font-black px-3 py-1 rounded-full text-xs">P{playerIndex + 1}</div>
          <span className="text-sm font-bold text-blue-100 truncate max-w-[150px]">{currentQuestion?.q || '等待出題'}</span>
        </div>
        {isSubmitted && (
          <button onClick={() => connRef.current?.send({ type: 'APPEAL', playerIndex })} className="bg-rose-600 px-4 py-1.5 rounded-lg font-black text-xs">申訴</button>
        )}
      </div>

      {/* 畫布區 - 滿版適配 */}
      <div className="flex-1 relative bg-black m-2 rounded-2xl border border-white/10 overflow-hidden">
        <canvas 
          ref={canvasRef}
          width={1000}
          height={1000}
          className="w-full h-full object-contain touch-none"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
        />
        {isSubmitted && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="text-emerald-500 text-5xl mb-4">✓</div>
            <div className="text-xl font-black">答案已送出</div>
          </div>
        )}
      </div>

      {/* 底部按鈕 - 手機大按鈕 */}
      <div className="p-4 grid grid-cols-2 gap-4 bg-slate-900/50">
        <button onClick={clearCanvas} disabled={isSubmitted} className="py-5 bg-slate-800 rounded-2xl font-black text-lg">重寫</button>
        <button onClick={submitAnswer} disabled={isSubmitted || isRecognizing} className="py-5 bg-emerald-600 rounded-2xl font-black text-lg flex items-center justify-center">
          {isRecognizing ? "辨識中..." : "送出答案"}
        </button>
      </div>
    </div>
  );
};

export default PlayerView;

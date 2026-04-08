'use client';

import { useState, useRef, useEffect } from 'react';
import { usePuzzleStore } from '@/store/usePuzzleStore';
import { captureCroppedFrame, generatePieces } from '@/lib/imageUtils';

export default function CropOverlay() {
  const { setStatus, setCropRect, setImageSrc, setPieces, shufflePieces, gridSize } = usePuzzleStore();
  
  // Default crop area: 400x400 centered
  const [rect, setLocalRect] = useState({ x: 200, y: 150, width: 400, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, rectX: 0, rectY: 0 });
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Real-time preview loop
  useEffect(() => {
    let frameId: number;
    const video = document.querySelector('video');
    
    const drawPreview = () => {
      if (video && previewCanvasRef.current) {
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const scaleX = video.videoWidth / video.offsetWidth;
          const scaleY = video.videoHeight / video.offsetHeight;
          
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          
          const mirroredX = (video.offsetWidth - rect.x - rect.width) * scaleX;
          const sourceY = rect.y * scaleY;
          const sourceW = rect.width * scaleX;
          const sourceH = rect.height * scaleY;
          
          ctx.drawImage(video, mirroredX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
      }
      frameId = requestAnimationFrame(drawPreview);
    };
    
    drawPreview();
    return () => cancelAnimationFrame(frameId);
  }, [rect]);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, rectX: rect.x, rectY: rect.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    setLocalRect(prev => ({
      ...prev,
      x: Math.max(0, Math.min(window.innerWidth - prev.width, dragStart.current.rectX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - prev.height, dragStart.current.rectY + dy)),
    }));
  };

  const onMouseUp = () => setIsDragging(false);

  const onConfirm = () => {
    const video = document.querySelector('video');
    if (!video) return;

    const img = captureCroppedFrame(video, rect);
    setImageSrc(img);
    setCropRect(rect);
    setPieces(generatePieces(gridSize));
    shufflePieces();
    setStatus('SOLVING');
  };

  return (
    <div 
      className="absolute inset-0 z-50 pointer-events-auto"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Real-time Capture Preview Panel */}
      <div className="absolute top-10 right-10 w-64 glass-morphism p-4 rounded-xl border border-white/10 animate-in fade-in slide-in-from-right-10 duration-500">
        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em] mb-3">Slicing Preview</div>
        <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden border border-cyan-500/30">
          <canvas ref={previewCanvasRef} width="256" height="256" className="w-full h-full object-cover" />
          {/* Scanning Line Animation */}
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400/50 shadow-[0_0_10px_#00d2ff] animate-bounce" style={{ animationDuration: '3s' }} />
        </div>
        <div className="mt-3 flex justify-between items-center text-[9px] font-mono text-white/40">
           <span>X: {rect.x} Y: {rect.y}</span>
           <span>REAL-TIME FEED</span>
        </div>
      </div>

      {/* Darkened area outside crop region using clip-path */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-[1px]" 
        style={{
          clipPath: `polygon(
            0% 0%, 
            100% 0%, 
            100% 100%, 
            0% 100%, 
            0% 0%, 
            ${rect.x}px ${rect.y}px, 
            ${rect.x}px ${rect.y + rect.height}px, 
            ${rect.x + rect.width}px ${rect.y + rect.height}px, 
            ${rect.x + rect.width}px ${rect.y}px, 
            ${rect.x}px ${rect.y}px
          )`
        }}
      />

      {/* Draggable Crop Box */}
      <div
        className="absolute border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(0,210,255,0.2)] bg-transparent cursor-move"
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
        onMouseDown={onMouseDown}
      >
        {/* Aesthetic Corner Accents */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 -translate-x-1 -translate-y-1" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 translate-x-1 -translate-y-1" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 -translate-x-1 translate-y-1" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 translate-x-1 translate-y-1" />
        
        {/* Interaction Indicator */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-cyan-500 text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-xl animate-pulse whitespace-nowrap">
          Position Crop Area
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6">
        <p className="text-white/60 text-sm font-mono tracking-tighter uppercase">Align the frame to capture your puzzle image</p>
        <button 
          onClick={onConfirm}
          className="group relative px-10 py-4 bg-white text-black font-black uppercase tracking-widest rounded-sm overflow-hidden transition-all hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative z-10">Capture & Solve</span>
        </button>
      </div>
    </div>
  );
}

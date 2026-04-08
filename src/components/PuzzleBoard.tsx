'use client';

import { useEffect, useRef, useState } from 'react';
import { useGestureStore } from '@/store/useGestureStore';
import { usePuzzleStore } from '@/store/usePuzzleStore';
import PuzzlePiece from './PuzzlePiece';

export default function PuzzleBoard() {
  const { pieces, gridSize, imageSrc, swapPieces, status } = usePuzzleStore();
  const hands = useGestureStore((s) => s.hands);
  const boardRef = useRef<HTMLDivElement>(null);
  
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [grabIdx, setGrabIdx] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'SOLVING') return;
    
    const primaryHand = hands[0];
    if (!primaryHand || !boardRef.current) {
      setHoverIdx(null);
      setGrabIdx(null);
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    
    // Use Index Finger Tip (Landmark 8) for pointing
    const indexTip = primaryHand.landmarks[8];
    const screenX = (1 - indexTip.x) * window.innerWidth;
    const screenY = indexTip.y * window.innerHeight;

    const isWithinBoard = 
      screenX >= rect.left && screenX <= rect.right &&
      screenY >= rect.top && screenY <= rect.bottom;

    if (isWithinBoard) {
      const relX = (screenX - rect.left) / rect.width;
      const relY = (screenY - rect.top) / rect.height;
      
      const gx = Math.floor(relX * gridSize);
      const gy = Math.floor(relY * gridSize);
      const currentIdx = gy * gridSize + gx;
      
      setHoverIdx(currentIdx);

      if (primaryHand.gesture === 'GRAB') {
        if (grabIdx === null) {
          setGrabIdx(currentIdx);
        }
      } else if (grabIdx !== null) {
        // Gesture released
        if (currentIdx !== grabIdx) {
          swapPieces(grabIdx, currentIdx);
        }
        setGrabIdx(null);
      }
    } else {
      setHoverIdx(null);
      if (primaryHand.gesture !== 'GRAB') {
        setGrabIdx(null);
      }
    }
  }, [hands, status, gridSize, grabIdx, swapPieces]);

  if (!imageSrc) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center p-8">
      <div 
        ref={boardRef}
        className="relative aspect-square w-full max-w-[500px] bg-black/40 border-2 border-white/10 shadow-2xl rounded-xl overflow-hidden backdrop-blur-md"
      >
        {pieces.map((piece) => (
          <PuzzlePiece
            key={piece.id}
            {...piece}
            gridSize={gridSize}
            imageSrc={imageSrc}
            isHovered={hoverIdx === piece.currentIndex}
            isGrabbed={grabIdx === piece.currentIndex}
          />
        ))}

        {/* Board Win Overlay */}
        {status === 'SOLVED' && (
          <div className="absolute inset-0 bg-cyan-500/20 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in duration-500">
            <h2 className="text-4xl font-bold text-white drop-shadow-md">SOLVED</h2>
            <p className="text-cyan-200 mt-2 font-mono">PUZZLE COMPLETE</p>
          </div>
        )}
      </div>

      {/* Target Goal Panel (Reference) */}
      <div className="absolute top-10 right-10 w-48 glass-morphism p-3 rounded-xl border border-white/10 animate-in fade-in slide-in-from-right-10 duration-700 pointer-events-auto group">
        <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-[0.2em] mb-2 flex justify-between">
           <span>Target Goal</span>
           <span className="text-white/20 group-hover:text-cyan-400/50 transition-colors">REF</span>
        </div>
        <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-white/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
          <img src={imageSrc} className="w-full h-full object-cover" alt="Goal" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="mt-2 text-[8px] font-mono text-white/30 truncate">
          {gridSize}x{gridSize} MATRIX
        </div>
      </div>

      {/* Hand Interactive Cursor (Mirrored) */}
      {hands[0] && (
        <div 
          className={`fixed w-8 h-8 rounded-full border-2 pointer-events-none z-[100] transition-transform duration-75 ease-out
            ${hands[0].gesture === 'GRAB' ? 'bg-cyan-400 border-white scale-75' : 'bg-transparent border-cyan-400 scale-100'}
            ${hoverIdx !== null ? 'opacity-100' : 'opacity-30'}
          `}
          style={{
            left: `${(1 - hands[0].landmarks[8].x) * 100}vw`,
            top: `${hands[0].landmarks[8].y * 100}vh`,
            transform: `translate(-50%, -50%) ${hands[0].gesture === 'GRAB' ? 'scale(0.8)' : 'scale(1)'}`,
            boxShadow: hands[0].gesture === 'GRAB' ? '0 0 20px #00d2ff' : 'none'
          }}
        >
          <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
        </div>
      )}
    </div>
  );
}

'use client';

import { usePuzzleStore } from '@/store/usePuzzleStore';
import CropOverlay from './CropOverlay';
import PuzzleBoard from './PuzzleBoard';

export default function PuzzleManager() {
  const { status, setStatus, reset } = usePuzzleStore();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/80 pointer-events-none" />

      {status === 'IDLE' && (
        <div className="z-50 flex flex-col items-center gap-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
           <div className="flex flex-col items-center text-center">
              <div className="w-20 h-[1px] bg-cyan-400 mb-6" />
              <h1 className="text-7xl font-black text-white tracking-tight uppercase leading-none">
                Reality<br/><span className="text-cyan-400">Puzzle</span>
              </h1>
              <div className="w-12 h-[1px] bg-cyan-400 mt-6" />
              <p className="text-white/40 font-mono text-xs tracking-[0.5em] uppercase mt-8 max-w-xs leading-relaxed">
                Slice your surroundings and reconstruct them using hand gestures
              </p>
           </div>
           
           <button 
             onClick={() => setStatus('CROPPING')}
             className="group relative px-12 py-5 bg-white text-black font-black uppercase tracking-[0.2em] text-xs transition-all hover:bg-cyan-400 hover:shadow-[0_0_50px_rgba(0,210,255,0.4)]"
           >
             <span className="relative z-10">Start Tracking</span>
             <div className="absolute -inset-1 border border-white/20 group-hover:border-cyan-400 transition-colors scale-105" />
           </button>
        </div>
      )}

      {status === 'CROPPING' && <CropOverlay />}
      
      {(status === 'SOLVING' || status === 'SOLVED') && (
        <div className="relative w-full h-full animate-in fade-in duration-1000">
           <PuzzleBoard />
           
           {/* UI Overlay Controls */}
           <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 z-[100]">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest">Controls</span>
                 <p className="text-white/40 text-[10px] uppercase tracking-tighter">Pinch tip of index & thumb to grab pieces</p>
              </div>
              
              <div className="w-[1px] h-8 bg-white/10" />

              <button 
                onClick={reset}
                className="px-6 py-2 border border-white/10 text-white/60 hover:text-white hover:border-cyan-400 transition-all font-mono text-[10px] uppercase tracking-widest bg-black/40 backdrop-blur-md rounded-full"
              >
                Reset Scene
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

type Landmark = { x: number; y: number; z: number };

interface XRayHUDProps {
  landmarks: { left: Landmark[] | null; right: Landmark[] | null };
}

export default function XRayHUD({ landmarks }: XRayHUDProps) {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const updateFps = () => {
      const now = performance.now();
      frameCount++;
      
      if (now - lastTime >= 1000) {
        setFps(Math.round(frameCount * 1000 / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      
      requestAnimationFrame(updateFps);
    };
    
    const animId = requestAnimationFrame(updateFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 z-50 pointer-events-none font-mono">
      {/* HUD Background - Glassmorphic */}
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-6 items-end max-w-7xl mx-auto pointer-events-auto">
        
        {/* Left Side: System Information */}
        <div className="flex-1 space-y-4 min-w-[200px]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-cyan-400 text-xs md:text-sm font-bold tracking-widest uppercase truncate">X-Ray Scanner Engine v2.0</h2>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${landmarks.left || landmarks.right ? 'bg-cyan-400' : 'bg-red-500 animate-pulse'}`} />
                <p className="text-white/40 text-[9px] uppercase tracking-tighter truncate">
                  {landmarks.left || landmarks.right ? 'NEURAL_LINK_ESTABLISHED' : 'WASM_ASSETS_SYNCING...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-md">
            <TelemetryRow label="FRUSTUM" value="ACTIVE" color="text-cyan-400" />
            <TelemetryRow label="LATENCY" value={`${(1000/(fps||60)).toFixed(1)}ms`} color="text-green-400" />
            <TelemetryRow label="PARTICLES" value="16,384" color="text-white/80" />
            <TelemetryRow label="FREQ" value={`${fps}Hz`} color="text-green-400" />
          </div>
        </div>

        {/* Center: Aesthetic Technical Node Graph (Tablet/Desktop only) */}
        <div className="w-[300px] lg:w-[500px] h-24 hidden md:block opacity-40 relative overflow-hidden">
           <svg viewBox="0 0 500 150" className="w-full h-full fill-none">
            <path d="M0,75 Q125,25 250,75 T500,75" stroke="#00FF00" strokeWidth="0.5" className="animate-dash" strokeDasharray="5 15" />
            <path d="M0,85 Q125,35 250,85 T500,85" stroke="#00FFFF" strokeWidth="0.5" className="animate-dash-reverse" strokeDasharray="10 20" />
            {Array.from({ length: 12 }).map((_, i) => (
                <g key={i} transform={`translate(${(i * 45) + 10}, ${40 + (i % 3) * 30})`}>
                    <circle r="1.5" fill="#00FF00" className="animate-pulse" />
                    <line x1="0" y1="0" x2="35" y2={((i+1) % 3 - i % 3) * 30} stroke="rgba(0,255,0,0.1)" strokeWidth="0.5" />
                </g>
            ))}
           </svg>
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>

        {/* Right Side: Landmark Telemetry */}
        <div className="flex-none min-w-[240px] bg-black/40 border border-white/5 rounded-xl p-4 space-y-2">
           <div className="flex justify-between items-center border-b border-white/5 pb-2">
             <span className="text-[9px] text-white/40 uppercase tracking-tighter">DATA_STREAM</span>
             <span className={`text-[9px] font-bold ${landmarks.left && landmarks.right ? 'text-green-500' : 'text-red-500/50'}`}>
               {landmarks.left && landmarks.right ? 'DUAL-SYNC' : 'PARTIAL-LOCK'}
             </span>
           </div>
           
           <div className="space-y-1">
             <DataBit label="LP_X" value={(landmarks.left && landmarks.left[8]) ? landmarks.left[8].x.toFixed(3) : '---'} />
             <DataBit label="RP_X" value={(landmarks.right && landmarks.right[8]) ? landmarks.right[8].x.toFixed(3) : '---'} />
           </div>

           <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-cyan-500 transition-all duration-500"
                style={{ width: landmarks.left && landmarks.right ? '100%' : (landmarks.left || landmarks.right ? '50%' : '0%') }}
              />
           </div>
        </div>

      </div>

      {/* Floating Biometric Labels (Near Cursor/Scanner) */}
      {(landmarks.left && landmarks.right) && (
        <div 
          className="absolute pointer-events-none transition-all duration-75"
          style={{ 
            left: `${(1 - (landmarks.left[8].x + landmarks.right[8].x) / 2) * 100}%`, 
            top: `${((landmarks.left[8].y + landmarks.right[8].y) / 2) * 100}%`,
            transform: 'translate(40px, -40px)'
          }}
        >
          <div className="flex flex-col gap-1">
            <div className="bg-black/80 border-l-2 border-cyan-500 px-2 py-1 flex items-center gap-2">
              <span className="text-[10px] text-white/50 uppercase font-black">NEURAL SYNC</span>
              <span className="text-[10px] text-cyan-400 font-bold">98.4%</span>
            </div>
            <div className="bg-black/80 border-l-2 border-pink-500 px-2 py-1 flex items-center gap-2">
              <span className="text-[10px] text-white/50 uppercase font-black">CORE TEMP</span>
              <span className="text-[10px] text-pink-500 font-bold">310.2 K</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-dash { animation: dash 5s linear infinite; }
        .animate-dash-reverse { animation: dash 7s linear infinite reverse; }
        @keyframes dash { to { stroke-dashoffset: 100; } }
      `}</style>
    </div>
  );
}

function TelemetryRow({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex justify-between items-center gap-2 border-b border-white/5 py-1">
      <span className="text-[8px] text-white/30 uppercase tracking-widest">{label}</span>
      <span className={`text-[10px] font-bold ${color}`}>{value}</span>
    </div>
  );
}

function DataBit({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-center text-[10px]">
            <span className="text-white/40">{label}</span>
            <code className="text-cyan-400 font-mono">{value}</code>
        </div>
    );
}

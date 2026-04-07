'use client';

import { useGestureStore } from '@/store/useGestureStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function UIOverlay() {
  const gesture        = useGestureStore((s) => s.gesture);
  const isTracking     = useGestureStore((s) => s.isTracking);
  const handSpeed      = useGestureStore((s) => s.handSpeed);
  const hands          = useGestureStore((s) => s.hands);
  const primaryHand    = hands[0];
  const explodeFactor  = useGestureStore((s) => s.explodeFactor);
  const hoveredPartId  = useGestureStore((s) => s.hoveredPartId);
  const pathname       = usePathname();
  const isHologramMode = pathname === '/';

  return (
    <div className="ui-overlay">
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none', zIndex: 20 }}>
        <div style={{ animation: 'fadeIn 1s ease' }}>
          <h1 className="title">AetherControl</h1>
          <p  className="subtitle">PROXIMITY PARTICLE ENGINE — v2.0</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          <Link href="/air-draw" style={{ pointerEvents: 'all' }}>
            <button className="btn">
              ✍️ Air Draw Mode
            </button>
          </Link>

          <Link href="/x-ray" style={{ pointerEvents: 'all' }}>
            <button className="btn" style={{ background: 'rgba(0, 255, 255, 0.1)', borderColor: 'rgba(0, 255, 255, 0.4)', color: '#00ffff' }}>
              💀 X-Ray Mode
            </button>
          </Link>

          <Link href="/particle" style={{ pointerEvents: 'all' }}>
            <button className="btn" style={{ background: 'rgba(0, 150, 255, 0.1)', borderColor: 'rgba(0, 150, 255, 0.4)', color: '#0096ff' }}>
              🌌 Particle Engine
            </button>
          </Link>

          <Link href="/" style={{ pointerEvents: 'all' }}>
            <button className="btn" style={{ background: 'rgba(255, 0, 136, 0.1)', borderColor: 'rgba(255, 0, 136, 0.4)', color: '#ff0088' }}>
              🛠️ Aether-Core
            </button>
          </Link>

          {/* Mini Camera Preview */}
          <div className="camera-preview panel">
             <div className="preview-label">NEURAL SCAN — LIVE</div>
             <div className="preview-content">
                <canvas id="mini-tracker-canvas" width="160" height="120" />
                {!isTracking && <div className="preview-status">AWAITING FEED...</div>}
             </div>
          </div>
        </div>
      </div>


      {/* ─── Hologram HUD (Top Left) ─── */}
      {isHologramMode && (
        <div style={{ position: 'fixed', top: 120, left: 30, zIndex: 10, pointerEvents: 'none' }}>
           <div className="panel" style={{ width: 240, borderLeft: '4px solid #ff0088', animation: 'slideRight 0.5s ease' }}>
              <p style={{ fontSize: '0.65rem', color: '#ff0088', fontWeight: 800, letterSpacing: '0.15em', marginBottom: 8 }}>CORE TELEMETRY</p>
              
              <div className="telemetry-row">
                 <span className="label">ACTIVE PART:</span>
                 <span className="value" style={{ color: '#fff' }}>{hoveredPartId || 'NONE'}</span>
              </div>
              
              <div className="telemetry-row">
                 <span className="label">EXPANSION:</span>
                 <div className="progress-bg">
                    <div className="progress-fill" style={{ width: `${explodeFactor * 100}%`, background: '#ff0088' }} />
                 </div>
              </div>

              <div className="telemetry-row">
                 <span className="label">RPM:</span>
                 <span className="value">{(1500 + explodeFactor * 8000).toFixed(0)}</span>
              </div>
           </div>
        </div>
      )}


      {/* ─── Status indicator (bottom left) ─── */}
      <div className="status-indicator">
        <div className={`status-dot ${isTracking ? 'active' : ''}`} />
        <span>
          {isTracking && primaryHand 
            ? `[${primaryHand.handedness}] ${gesture} · ${handSpeed.toFixed(1)} M/S` 
            : 'SENSORS AWAITING INPUT'}
        </span>
      </div>


      {/* ─── Gesture Guide (bottom right) ─── */}
      {!isHologramMode && (
        <div className="gesture-guide panel">
          <p style={{ fontSize: '0.65rem', color: 'var(--col-muted)', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>CONTROL MAPPING</p>
          
          <div className="guide-item">
            <span className="guide-key">✊ FIST</span>
            <span className="guide-val">FREEZE SYSTEM</span>
          </div>
          <div className="guide-item">
            <span className="guide-key">🤌 PINCH</span>
            <span className="guide-val">GRAB & ATTRACT</span>
          </div>
          <div className="guide-item">
            <span className="guide-key">🖐 PALM</span>
            <span className="guide-val">SPREAD & REPEL</span>
          </div>
          <div className="guide-item">
            <span className="guide-key">👆 POINT</span>
            <span className="guide-val">MOVE TARGET</span>
          </div>
        </div>
      )}


      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .telemetry-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
        }
        .telemetry-row .label { color: var(--col-muted); }
        .telemetry-row .value { color: #00ffff; font-weight: 700; }
        .progress-bg {
          width: 80px;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          transition: width 0.1s ease;
        }
      `}</style>
    </div>
  );
}



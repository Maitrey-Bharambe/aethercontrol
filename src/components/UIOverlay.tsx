'use client';

import { useGestureStore } from '@/store/useGestureStore';
import Link from 'next/link';

export default function UIOverlay() {
  const gesture        = useGestureStore((s) => s.gesture);
  const isTracking     = useGestureStore((s) => s.isTracking);
  const handSpeed      = useGestureStore((s) => s.handSpeed);
  const hands          = useGestureStore((s) => s.hands);
  const primaryHand    = hands[0];

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


      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}



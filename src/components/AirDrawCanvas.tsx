'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import type { LandmarkResult } from '@/lib/handTracking';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Point { x: number; y: number }
interface Stroke { points: Point[]; color: string; width: number }

// ── Colour palette (neon) ─────────────────────────────────────────────────────
const COLORS = ['#ffffff', '#00fff7', '#ff00f7', '#ffee00', '#00ff88', '#ff4444'];

// ── Helper: is index finger extended (and NOT pinching) ─────────────────────
function isIndexPointing(landmarks: Array<{ x: number; y: number; z: number }>): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  const indexExtended = landmarks[8].y < landmarks[6].y;
  const middleCurled  = landmarks[12].y > landmarks[10].y;
  const dx = landmarks[4].x - landmarks[8].x;
  const dy = landmarks[4].y - landmarks[8].y;
  const pinchDist = Math.sqrt(dx * dx + dy * dy);
  return indexExtended && middleCurled && pinchDist > 0.08;
}

// ── Helper: is fist made ──────────────────────────────────────────────────────
function isFistHand(landmarks: Array<{ x: number; y: number; z: number }>): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  // All fingers tips 8, 12, 16, 20 are below their respective PIPs (6, 10, 14, 18)
  const fingersClosed = [8, 12, 16, 20].every(tip => landmarks[tip].y > landmarks[tip - 2].y);
  return fingersClosed;
}

export default function AirDrawCanvas() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const drawRef   = useRef<HTMLCanvasElement>(null);
  const dotRef    = useRef<HTMLDivElement>(null);
  const dusterRef = useRef<HTMLDivElement>(null);

  const strokesRef      = useRef<Stroke[]>([]);
  const currentStroke   = useRef<Stroke | null>(null);
  const isDrawingRef    = useRef(false);
  const colorIndexRef   = useRef(0);
  const brushWidthRef   = useRef(6);

  const [isTracking, setIsTracking] = useState(false);
  const [gesture, setGesture]       = useState('');
  const [colorIdx, setColorIdx]     = useState(0);
  const [brushWidth, setBrushWidth] = useState(6);
  const [strokeCount, setStrokeCount] = useState(0);

  // ── Erase points near a coordinate ──────────────────────────────────────────
  const eraseNear = (x: number, y: number, radius: number) => {
    let changed = false;
    const newStrokes: Stroke[] = [];

    for (const stroke of strokesRef.current) {
      let currentSegment: Point[] = [];
      
      for (const p of stroke.points) {
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist > radius) {
          currentSegment.push(p);
        } else {
          // Erase happened, split segment if needed
          if (currentSegment.length > 1) {
            newStrokes.push({ ...stroke, points: currentSegment });
          }
          currentSegment = [];
          changed = true;
        }
      }
      
      if (currentSegment.length > 1) {
        newStrokes.push({ ...stroke, points: currentSegment });
      }
    }

    if (changed) {
      strokesRef.current = newStrokes;
      setStrokeCount(n => n + 1);
      redrawAll();
    }
  };

  // ── Redraw all strokes on the canvas ────────────────────────────────────────
  const redrawAll = useCallback(() => {
    const canvas = drawRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur  = 28;
      ctx.shadowColor = stroke.color;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth   = stroke.width;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        const mx   = (prev.x + curr.x) / 2;
        const my   = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.stroke();
      ctx.shadowBlur  = 6;
      ctx.lineWidth   = Math.max(1, stroke.width * 0.35);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.restore();
    }

    // Draw current-in-progress stroke
    if (currentStroke.current && currentStroke.current.points.length > 1) {
      const s = currentStroke.current;
      ctx.save();
      ctx.shadowBlur  = 28;
      ctx.shadowColor = s.color;
      ctx.strokeStyle = s.color;
      ctx.lineWidth   = s.width;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        const prev = s.points[i - 1];
        const curr = s.points[i];
        const mx   = (prev.x + curr.x) / 2;
        const my   = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.stroke();
      ctx.shadowBlur  = 6;
      ctx.lineWidth   = Math.max(1, s.width * 0.35);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  // ── Handle MediaPipe results ─────────────────────────────────────────────────
  const handleResults = useCallback(
    (results: LandmarkResult) => {
      const canvas = drawRef.current;
      const dot    = dotRef.current;
      const duster = dusterRef.current;
      if (!canvas) return;

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        if (isDrawingRef.current && currentStroke.current) {
          strokesRef.current.push(currentStroke.current);
          currentStroke.current = null;
          isDrawingRef.current  = false;
          setStrokeCount((n) => n + 1);
          redrawAll();
        }
        if (dot) dot.style.opacity = '0';
        if (duster) duster.style.opacity = '0';
        setGesture('');
        return;
      }

      const landmarks = results.multiHandLandmarks[0];
      const pointing  = isIndexPointing(landmarks);
      const fist      = isFistHand(landmarks);

      // Hand center for duster, index tip for pen
      const anchorLM = fist ? landmarks[9] : landmarks[8];
      const px = (1 - anchorLM.x) * canvas.width;
      const py = anchorLM.y * canvas.height;

      // Update dot & duster visibility
      if (dot) {
        dot.style.left    = `${px}px`;
        dot.style.top     = `${py}px`;
        dot.style.opacity = pointing ? '1' : '0.2';
        dot.style.background = pointing ? COLORS[colorIndexRef.current] : 'rgba(255,255,255,0.4)';
        dot.style.boxShadow  = pointing
          ? `0 0 16px 6px ${COLORS[colorIndexRef.current]}`
          : '0 0 8px 3px rgba(255,255,255,0.3)';
        dot.style.display = fist ? 'none' : 'block';
      }

      if (duster) {
        duster.style.left = `${px}px`;
        duster.style.top  = `${py}px`;
        duster.style.opacity = fist ? '1' : '0';
        duster.style.transform = `translate(-50%, -50%) scale(${fist ? 1 : 0.5})`;
      }

      if (fist) {
        setGesture('🧼 Dusting');
        // Stop drawing if we were
        if (isDrawingRef.current && currentStroke.current) {
          strokesRef.current.push(currentStroke.current);
          currentStroke.current = null;
          isDrawingRef.current  = false;
        }
        eraseNear(px, py, 45); // 45px duster size
      } else if (pointing) {
        setGesture('✏️ Drawing');
        if (!isDrawingRef.current) {
          isDrawingRef.current = true;
          currentStroke.current = {
            points: [{ x: px, y: py }],
            color: COLORS[colorIndexRef.current],
            width: brushWidthRef.current,
          };
        } else if (currentStroke.current) {
          const last = currentStroke.current.points.at(-1)!;
          const d = Math.hypot(px - last.x, py - last.y);
          if (d > 2) {
            currentStroke.current.points.push({ x: px, y: py });
            redrawAll();
          }
        }
      } else {
        setGesture('🖐 Hover');
        if (isDrawingRef.current && currentStroke.current) {
          strokesRef.current.push(currentStroke.current);
          currentStroke.current = null;
          isDrawingRef.current  = false;
          setStrokeCount((n) => n + 1);
          redrawAll();
        }
      }
    },
    [redrawAll]
  );


  // ── Resize canvas to window ──────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = drawRef.current;
      if (!c) return;
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
      redrawAll();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redrawAll]);

  // ── Start MediaPipe ──────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stopped = false;

    (async () => {
      try {
        const { startTracking } = await import('@/lib/handTracking');
        if (!stopped) {
          await startTracking(video, handleResults);
          setIsTracking(true);
        }
      } catch (e) {
        console.error('HandTracking failed:', e);
      }
    })();

    return () => {
      stopped = true;
      import('@/lib/handTracking').then(({ stopTracking }) => stopTracking());
      setIsTracking(false);
    };
  }, [handleResults]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleUndo = () => {
    strokesRef.current.pop();
    setStrokeCount((n) => Math.max(0, n - 1));
    redrawAll();
  };

  const handleClear = () => {
    strokesRef.current = [];
    currentStroke.current = null;
    setStrokeCount(0);
    redrawAll();
  };

  const handleColorChange = (idx: number) => {
    colorIndexRef.current = idx;
    setColorIdx(idx);
  };

  const handleBrushChange = (w: number) => {
    brushWidthRef.current = w;
    setBrushWidth(w);
  };

  // ── Save as PNG ──────────────────────────────────────────────────────────────
  const handleSave = () => {
    const canvas = drawRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'air-draw.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', fontFamily: 'Outfit, sans-serif' }}>
      {/* ── Camera background ── */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          position : 'absolute',
          inset    : 0,
          width    : '100%',
          height   : '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          zIndex   : 1,
          opacity  : 1,
        }}
      />

      {/* ── Dark overlay to enhance neon contrast ── */}
      <div style={{
        position : 'absolute',
        inset    : 0,
        zIndex   : 2,
        background: 'rgba(0,0,0,0.25)',
        pointerEvents: 'none',
      }} />

      {/* ── Drawing canvas ── */}
      <canvas
        ref={drawRef}
        style={{
          position : 'absolute',
          inset    : 0,
          zIndex   : 3,
          pointerEvents: 'none',
        }}
      />

      {/* ── Fingertip dot ── */}
      <div
        ref={dotRef}
        style={{
          position     : 'absolute',
          zIndex       : 10,
          width        : 18,
          height       : 18,
          borderRadius : '50%',
          transform    : 'translate(-50%, -50%)',
          background   : 'rgba(255,255,255,0.4)',
          boxShadow    : '0 0 8px 3px rgba(255,255,255,0.3)',
          opacity      : 0,
          transition   : 'opacity 0.2s, background 0.1s, box-shadow 0.1s',
          pointerEvents: 'none',
        }}
      />

      {/* ── Duster circle ── */}
      <div
        ref={dusterRef}
        style={{
          position     : 'absolute',
          zIndex       : 11,
          width        : 90,
          height       : 90,
          borderRadius : '50%',
          border       : '2px solid rgba(255,255,255,0.4)',
          background   : 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
          boxShadow    : '0 0 30px rgba(255,255,255,0.2), inset 0 0 20px rgba(255,255,255,0.1)',
          backdropFilter: 'blur(4px)',
          opacity      : 0,
          pointerEvents: 'none',
          display      : 'flex',
          alignItems   : 'center',
          justifyContent: 'center',
          fontSize     : 24,
          transition   : 'opacity 0.15s, transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        🧼
      </div>

      {/* ── Top bar ── */}

      <div style={{
        position       : 'absolute',
        top            : 0,
        left           : 0,
        right          : 0,
        zIndex         : 20,
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'space-between',
        padding        : '14px 20px',
        background     : 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        pointerEvents  : 'none',
      }}>
        {/* Back button */}
        <Link href="/" style={{ pointerEvents: 'all', textDecoration: 'none' }}>
          <button style={{
            display    : 'flex',
            alignItems : 'center',
            gap        : 8,
            padding    : '8px 16px',
            borderRadius: 24,
            border     : '1px solid rgba(255,255,255,0.2)',
            background : 'rgba(0,0,0,0.5)',
            color      : '#fff',
            fontSize   : 13,
            cursor     : 'pointer',
            backdropFilter: 'blur(10px)',
            fontFamily : 'Outfit, sans-serif',
          }}>
            ← Back
          </button>
        </Link>

        {/* Title */}
        <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{
            fontFamily   : 'Outfit, sans-serif',
            fontWeight   : 700,
            fontSize     : 22,
            background   : 'linear-gradient(135deg, #fff 30%, #00fff7 70%, #ff00f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor : 'transparent',
            backgroundClip: 'text',
          }}>
            ✍️ Neon Air Draw
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
            Point index finger to draw
          </div>
        </div>

        {/* Tracking status */}
        <div style={{
          display    : 'flex',
          alignItems : 'center',
          gap        : 7,
          padding    : '6px 14px',
          borderRadius: 24,
          border     : `1px solid ${isTracking ? '#00fff7' : 'rgba(255,255,255,0.15)'}`,
          background : isTracking ? 'rgba(0,255,247,0.08)' : 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)',
          fontSize   : 12,
          color      : isTracking ? '#00fff7' : 'rgba(255,255,255,0.5)',
          transition : 'all 0.3s',
          fontFamily : 'Outfit, sans-serif',
          pointerEvents: 'none',
        }}>
          <div style={{
            width       : 7,
            height      : 7,
            borderRadius: '50%',
            background  : isTracking ? '#00fff7' : 'rgba(255,255,255,0.3)',
            boxShadow   : isTracking ? '0 0 8px #00fff7' : 'none',
            animation   : isTracking ? 'pulseDot 1.4s infinite' : 'none',
          }} />
          {isTracking ? (gesture || 'Tracking') : 'Awaiting camera…'}
        </div>
      </div>

      {/* ── Right side toolbar ── */}
      <div style={{
        position   : 'absolute',
        top        : '50%',
        right      : 20,
        transform  : 'translateY(-50%)',
        zIndex     : 20,
        display    : 'flex',
        flexDirection: 'column',
        gap        : 10,
        padding    : '16px 12px',
        borderRadius: 20,
        border     : '1px solid rgba(255,255,255,0.1)',
        background : 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Colour label */}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Color
        </div>
        {/* Colour palette */}
        {COLORS.map((c, i) => (
          <button
            key={c}
            onClick={() => handleColorChange(i)}
            style={{
              width       : 28,
              height      : 28,
              borderRadius: '50%',
              border      : colorIdx === i ? `2.5px solid #fff` : '2px solid transparent',
              background  : c,
              cursor      : 'pointer',
              boxShadow   : colorIdx === i ? `0 0 12px 4px ${c}` : `0 0 6px 1px ${c}44`,
              transition  : 'all 0.2s',
              transform   : colorIdx === i ? 'scale(1.18)' : 'scale(1)',
            }}
          />
        ))}

        {/* Brush size label */}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
          Size
        </div>
        {/* Brush presets */}
        {[3, 6, 10, 16].map((w) => (
          <button
            key={w}
            onClick={() => handleBrushChange(w)}
            title={`${w}px`}
            style={{
              width       : 28,
              height      : 28,
              borderRadius: '50%',
              border      : brushWidth === w ? '2px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.15)',
              background  : brushWidth === w ? 'rgba(255,255,255,0.15)' : 'transparent',
              cursor      : 'pointer',
              display     : 'flex',
              alignItems  : 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{
              width       : Math.min(w + 2, 18),
              height      : Math.min(w + 2, 18),
              borderRadius: '50%',
              background  : '#fff',
              opacity     : 0.85,
            }} />
          </button>
        ))}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

        {/* Undo */}
        <button
          onClick={handleUndo}
          title="Undo last stroke"
          style={{
            width       : 36,
            height      : 36,
            borderRadius: 10,
            border      : '1px solid rgba(255,255,255,0.15)',
            background  : 'rgba(255,255,255,0.06)',
            color       : '#fff',
            cursor      : 'pointer',
            fontSize    : 16,
            display     : 'flex',
            alignItems  : 'center',
            justifyContent: 'center',
          }}
        >↩</button>

        {/* Clear */}
        <button
          onClick={handleClear}
          title="Clear all"
          style={{
            width       : 36,
            height      : 36,
            borderRadius: 10,
            border      : '1px solid rgba(255,100,100,0.3)',
            background  : 'rgba(255,60,60,0.1)',
            color       : '#ff6666',
            cursor      : 'pointer',
            fontSize    : 14,
            display     : 'flex',
            alignItems  : 'center',
            justifyContent: 'center',
          }}
        >✕</button>

        {/* Save */}
        <button
          onClick={handleSave}
          title="Save as PNG"
          style={{
            width       : 36,
            height      : 36,
            borderRadius: 10,
            border      : '1px solid rgba(0,255,200,0.3)',
            background  : 'rgba(0,255,200,0.08)',
            color       : '#00ffc8',
            cursor      : 'pointer',
            fontSize    : 14,
            display     : 'flex',
            alignItems  : 'center',
            justifyContent: 'center',
          }}
        >⬇</button>
      </div>

      {/* ── Bottom hint ── */}
      <div style={{
        position   : 'absolute',
        bottom     : 24,
        left       : '50%',
        transform  : 'translateX(-50%)',
        zIndex     : 20,
        display    : 'flex',
        alignItems : 'center',
        gap        : 24,
        padding    : '10px 22px',
        borderRadius: 30,
        border     : '1px solid rgba(255,255,255,0.1)',
        background : 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(14px)',
        fontSize   : 12,
        color      : 'rgba(255,255,255,0.6)',
        fontFamily : 'Outfit, sans-serif',
        whiteSpace : 'nowrap',
      }}>
        <span>☝️ <strong style={{ color: '#00fff7' }}>Point index</strong> to draw</span>
        <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />
        <span>✊ <strong style={{ color: '#ff00f7' }}>Fist</strong> to erase (Duster)</span>
        <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)' }} />
        <span>🎨 Pick color on the right</span>
      </div>


      {/* ── Keyframes via style tag ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

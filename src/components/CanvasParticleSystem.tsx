'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useGestureStore } from '@/store/useGestureStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

interface BigObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  type: 'flower' | 'crystal' | 'bubble';
  angle: number;
  vAngle: number;
  color: string;
}

const PARTICLE_COUNT = 1000;
const BIG_OBJ_COUNT  = 12;
const DAMPING        = 0.98;
const ATTRACTION     = 0.8;
const REPULSION      = 1.4;

export default function CanvasParticleSystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const particles = useMemo(() => {
    const p: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      p.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 2.5 + 0.8,
        color: `hsla(${180 + Math.random() * 60}, 70%, 65%, ${0.2 + Math.random() * 0.4})`,
      });
    }
    return p;
  }, []);

  const bigObjects = useMemo(() => {
    const b: BigObject[] = [];
    const types: ('flower' | 'crystal' | 'bubble')[] = ['flower', 'crystal', 'bubble'];
    for (let i = 0; i < BIG_OBJ_COUNT; i++) {
      b.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        size: 35 + Math.random() * 25,
        type: types[i % 3],
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.02,
        color: i % 2 === 0 ? '#00d2ff' : '#7f5af0',
      });
    }
    return b;
  }, []);

  const drawCrystal = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.6, 0);
    ctx.closePath();
    ctx.stroke();
    // Inner glow
    ctx.fillStyle = color + '22';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.lineTo(size * 0.2, 0);
    ctx.lineTo(0, size * 0.4);
    ctx.lineTo(-size * 0.2, 0);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.restore();
  };

  const drawFlower = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(size * 0.5, 0, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  };

  const drawBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.save();
    const grad = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, size * 0.1, x, y, size);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.2, color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.globalAlpha = 0.2;
    ctx.stroke();
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      const state = useGestureStore.getState();
      const { isTracking, handPosition, gesture } = state;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const hx = (0.5 - handPosition.x / 7.0) * canvas.width;
      const hy = (0.5 - handPosition.y / 5.0) * canvas.height;

      const frozen = gesture === 'FREEZE';
      const grab   = gesture === 'GRAB';
      const spread = gesture === 'SPREAD';
      const point  = gesture === 'POINT';

      // ── Render Particles ──────────────────────────────────────────────────
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        if (!frozen) {
          p.vx += (Math.random() - 0.5) * 0.08;
          p.vy += (Math.random() - 0.5) * 0.08;
          if (isTracking) {
            const dx = hx - p.x;
            const dy = hy - p.y;
            const dist = Math.hypot(dx, dy) + 1;
            if (grab) {
              const f = (ATTRACTION * 1.5) / (dist * 0.04 + 1);
              p.vx += (dx / dist) * f;
              p.vy += (dy / dist) * f;
            } else if (spread) {
              const f = (REPULSION * 40) / (dist + 40);
              p.vx -= (dx / dist) * f;
              p.vy -= (dy / dist) * f;
            }
          }
          p.vx *= DAMPING; p.vy *= DAMPING;
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        }
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }

      // ── Handle Targeted Pointing ──
      const h = state.hands[0];
      const indexTip = h ? { 
        x: (1 - h.landmarks[8].x) * canvas.width, 
        y: h.landmarks[8].y * canvas.height 
      } : null;

      if (!point && state.targetLockedId !== null) {
        state.setTargetLockedId(null);
      }

      // ── Render Big Objects ────────────────────────────────────────────────
      for (let i = 0; i < BIG_OBJ_COUNT; i++) {
        const b = bigObjects[i];
        if (!frozen) {
          if (isTracking) {
            const dx = hx - b.x;
            const dy = hy - b.y;
            const dist = Math.hypot(dx, dy) + 1;
            const mass = 12.0; 

            if (point && indexTip) {
              const dIdx = Math.hypot(indexTip.x - b.x, indexTip.y - b.y);
              // Selection logic: lock to nearest if none locked
              if (state.targetLockedId === null && dIdx < 80) {
                state.setTargetLockedId(i);
              }
              // Movement logic: if locked, pull hard
              if (state.targetLockedId === i) {
                const f = 0.15;
                b.vx += (indexTip.x - b.x) * f;
                b.vy += (indexTip.y - b.y) * f;
                
                // Draw Targeting Beam
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(indexTip.x, indexTip.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.3;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                
                // Pulsing Focus Ring
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size + 10 + Math.sin(Date.now()/100)*5, 0, Math.PI*2);
                ctx.strokeStyle = '#00d2ff';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.6;
                ctx.stroke();
                ctx.restore();
              }
            } else if (grab) {
              const f = (ATTRACTION * 3.0) / ((dist * 0.03 + 1) * mass);
              b.vx += (dx / dist) * f;
              b.vy += (dy / dist) * f;
            } else if (spread) {
              const f = (REPULSION * 60) / ((dist + 80) * mass);
              b.vx -= (dx / dist) * f;
              b.vy -= (dy / dist) * f;
            }
          }
          b.vx *= 0.92; b.vy *= 0.92;
          b.x += b.vx; b.y += b.vy;
          b.angle += b.vAngle;
          if (b.x < -100) b.x = canvas.width + 100; if (b.x > canvas.width + 100) b.x = -100;
          if (b.y < -100) b.y = canvas.height + 100; if (b.y > canvas.height + 100) b.y = -100;
        }

        ctx.globalAlpha = 0.8;

        if (b.type === 'crystal') drawCrystal(ctx, b.x, b.y, b.size, b.angle, b.color);
        else if (b.type === 'flower') drawFlower(ctx, b.x, b.y, b.size, b.angle, b.color);
        else drawBubble(ctx, b.x, b.y, b.size, b.color);
      }


      // ── Render Finger FX (Supernatural High-Fidelity) ──
      if (isTracking && state.hands[0]) {
        const h = state.hands[0];
        const tips = [8]; // SINGLE POINT (Index Tip only) as requested
        
        // Dynamic color based on gesture
        let fxColor = '#00d2ff'; // Cyan (IDLE/FREEZE)
        if (grab) fxColor = '#bd93f9';   // Purple
        if (spread) fxColor = '#ff5555'; // Red

        tips.forEach((idx) => {
          const lm = h.landmarks[idx];
          const fx = (1 - lm.x) * canvas.width;
          const fy = lm.y * canvas.height;
          const time = Date.now() / 1000;

          ctx.save();
          ctx.globalCompositeOperation = 'screen';

          // 1. Supernatural Aura
          const pulse = Math.sin(time * 12) * 4;
          const grad = ctx.createRadialGradient(fx, fy, 2, fx, fy, 25 + pulse);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(0.2, fxColor);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.arc(fx, fy, 25 + pulse, 0, Math.PI * 2); ctx.fill();

          // 2. Electric Arcs (Lightning)
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = fxColor;
          for (let a = 0; a < 2; a++) {
            ctx.beginPath();
            let lx = fx, ly = fy;
            ctx.moveTo(lx, ly);
            for (let s = 0; s < 4; s++) {
              lx += (Math.random() - 0.5) * 30;
              ly += (Math.random() - 0.5) * 30;
              ctx.lineTo(lx, ly);
            }
            ctx.stroke();
          }


          // 3. Orbital Motes
          ctx.fillStyle = '#fff';
          for (let m = 0; m < 6; m++) {
            const angle = time * 4 + (m * Math.PI * 2) / 6;
            const r = 20 + Math.sin(time * 2 + m) * 10;
            const mx = fx + Math.cos(angle) * r;
            const my = fy + Math.sin(angle) * r;
            ctx.beginPath(); ctx.arc(mx, my, 1.5, 0, Math.PI * 2); ctx.fill();
          }

          // Core
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = 0.9;
          ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
      }


      animationFrame = requestAnimationFrame(render);
    };


    render();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [particles, bigObjects]);


  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGestureStore, GestureType } from '@/store/useGestureStore';
import { getHandCenter, detectGesture, landmarkToWorld } from '@/lib/gestureUtils';
import type { LandmarkResult } from '@/lib/handTracking';

const LERP_FACTOR = 0.14;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function HandTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const smoothPosRef = useRef({ x: 0, y: 0, z: 0 });
  const prevPosRef  = useRef({ x: 0, y: 0, z: 0 });
  const lastTimeRef  = useRef(Date.now());
  const gestureRef   = useRef<GestureType>('IDLE');


  const setHands      = useGestureStore((s) => s.setHands);
  const setIsTracking = useGestureStore((s) => s.setIsTracking);

  const handleResults = useCallback(
    (results: LandmarkResult) => {
      const now = Date.now();
      const dt  = Math.max((now - lastTimeRef.current) / 1000, 0.001);
      lastTimeRef.current = now;

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        setHands([]);
        return;
      }

      const handStates = results.multiHandLandmarks.map((landmarks, hIdx) => {
        const center   = getHandCenter(landmarks);
        const rawWorld = landmarkToWorld(center);
        
        // Correct handedness label for mirrored view
        const labelFromMP = results.multiHandedness?.[hIdx]?.label || 'Right';
        const handedness = labelFromMP === 'Left' ? 'Right' : 'Left';

        // LERP smooth position
        smoothPosRef.current.x = lerp(smoothPosRef.current.x, rawWorld.x, LERP_FACTOR);
        smoothPosRef.current.y = lerp(smoothPosRef.current.y, rawWorld.y, LERP_FACTOR);
        smoothPosRef.current.z = lerp(smoothPosRef.current.z, rawWorld.z, LERP_FACTOR);

        const vx = (smoothPosRef.current.x - prevPosRef.current.x) / dt;
        const vy = (smoothPosRef.current.y - prevPosRef.current.y) / dt;
        const vz = (smoothPosRef.current.z - prevPosRef.current.z) / dt;
        prevPosRef.current = { ...smoothPosRef.current };

        const velocity = { x: vx, y: vy, z: vz };
        const speed    = Math.sqrt(vx * vx + vy * vy);
        const gesture  = detectGesture(landmarks, velocity, gestureRef.current);
        gestureRef.current = gesture;

        return {
          position: { ...smoothPosRef.current },
          velocity,
          landmarks,
          gesture,
          handedness,
          speed,
        };
      });


      setHands(handStates as any);

      // ── Draw to Mini-Preview Canvas ──

      const miniCanvas = document.getElementById('mini-tracker-canvas') as HTMLCanvasElement;
      if (miniCanvas) {
        const mctx = miniCanvas.getContext('2d');
        if (mctx) {
          mctx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
          
          // Draw actual camera feed
          if (results.image) {
            mctx.save();
            mctx.translate(miniCanvas.width, 0);
            mctx.scale(-1, 1); // Mirror
            mctx.drawImage(results.image, 0, 0, miniCanvas.width, miniCanvas.height);
            mctx.restore();
          }

          // Draw subtle grid

          mctx.strokeStyle = 'rgba(0, 210, 255, 0.05)';
          mctx.lineWidth   = 1;
          for(let i=0; i<miniCanvas.width; i+=40) { mctx.beginPath(); mctx.moveTo(i, 0); mctx.lineTo(i, miniCanvas.height); mctx.stroke(); }
          for(let i=0; i<miniCanvas.height; i+=30) { mctx.beginPath(); mctx.moveTo(0, i); mctx.lineTo(miniCanvas.width, i); mctx.stroke(); }

          results.multiHandLandmarks.forEach((landmarks) => {
            mctx.strokeStyle = '#00d2ff';
            mctx.fillStyle   = '#00d2ff';
            mctx.lineWidth   = 2;

            // Draw connections (Mirrored X)
            const connections = [
              [0,1,2,3,4], [0,5,6,7,8], [5,9,10,11,12], [9,13,14,15,16], [13,17,18,19,20], [0,17]
            ];
            connections.forEach(path => {
              mctx.beginPath();
              path.forEach((idx, i) => {
                const lx = (1 - landmarks[idx].x) * miniCanvas.width;
                const ly = landmarks[idx].y * miniCanvas.height;
                if (i === 0) mctx.moveTo(lx, ly); else mctx.lineTo(lx, ly);
              });
              mctx.stroke();
            });

            // Draw joints & fingertip glows (Mirrored X)
            landmarks.forEach((lm, idx) => {
              const lx = (1 - lm.x) * miniCanvas.width;
              const ly = lm.y * miniCanvas.height;

              mctx.beginPath();
              mctx.arc(lx, ly, 1, 0, Math.PI * 2);
              mctx.fill();

              if ([4, 8, 12, 16, 20].includes(idx)) {
                mctx.save();
                mctx.shadowBlur = 8;
                mctx.shadowColor = '#00d2ff';
                mctx.beginPath();
                mctx.arc(lx, ly, 3, 0, Math.PI * 2);
                mctx.stroke();
                mctx.restore();
              }
            });
          });

        }
      }

    },
    [setHands, setIsTracking]
  );


  useEffect(() => {
    if (!videoRef.current) return;
    const video  = videoRef.current;
    let stopped  = false;

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
      setHands([]);
    };
  }, [handleResults, setIsTracking, setHands]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{
        position : 'fixed',
        inset    : 0,
        width    : '100%',
        height   : '100%',
        opacity  : 1,
        transform: 'scaleX(-1)',
        zIndex   : -1,
        objectFit: 'cover',
      }}
    />
  );
}


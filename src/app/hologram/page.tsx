'use client';

import dynamic from 'next/dynamic';
import UIOverlay from '@/components/UIOverlay';

// Dynamic imports for Three.js and MediaPipe components
const HologramCanvas = dynamic(() => import('@/components/Hologram/HologramCanvas'), { ssr: false });
const HandTracker = dynamic(() => import('@/components/HandTracker'), { ssr: false });

export default function HologramPage() {
  return (
    <main className="root-container">
      {/* 3D Hologram Scene */}
      <div className="canvas-container">
        <HologramCanvas />
      </div>

      {/* Hand Tracking Layer */}
      <HandTracker />

      {/* Overlay UI */}
      <UIOverlay />

      <style jsx global>{`
        .canvas-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1;
        }
      `}</style>
    </main>
  );
}

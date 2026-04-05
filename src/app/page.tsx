'use client';

import dynamic from 'next/dynamic';
import UIOverlay from '@/components/UIOverlay';

// Dynamic import prevents SSR for Three.js canvas
const Scene       = dynamic(() => import('@/components/Scene'),       { ssr: false });
const HandTracker = dynamic(() => import('@/components/HandTracker'), { ssr: false });

export default function Home() {
  return (
    <main className="root-container">
      {/* Full-screen 3D Canvas */}
      <div className="canvas-container">
        <Scene />
      </div>

      {/* Webcam + MediaPipe hand tracking */}
      <HandTracker />

      {/* HTML UI on top */}
      <UIOverlay />
    </main>
  );
}

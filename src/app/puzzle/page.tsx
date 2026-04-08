'use client';

import dynamic from 'next/dynamic';

const HandTracker = dynamic(() => import('@/components/HandTracker'), { ssr: false });
const PuzzleManager = dynamic(() => import('@/components/PuzzleManager'), { ssr: false });

export default function PuzzlePage() {
  return (
    <main className="root-container overflow-hidden bg-black">
      {/* High-fidelity Hand Tracking Layer */}
      <HandTracker />

      {/* Interactive Puzzle Logic Layer */}
      <PuzzleManager />
      
      {/* Global CSS Overrides for this page */}
      <style jsx global>{`
        body {
          background: #000;
        }
        .canvas-container {
          display: none; /* Hide old Three.js canvas */
        }
      `}</style>
    </main>
  );
}

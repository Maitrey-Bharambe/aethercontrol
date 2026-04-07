'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import XRayTracker, { XRayTrackerHandle } from '@/components/XRay/XRayTracker';
import XRayHUD from '@/components/XRay/XRayHUD';
import Link from 'next/link';
import * as THREE from 'three';

const XRayCanvas = dynamic(() => import('@/components/XRay/XRayCanvas'), { ssr: false });

export default function XRayPage() {
  const trackerRef = useRef<XRayTrackerHandle>(null);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [segmentationTexture, setSegmentationTexture] = useState<THREE.CanvasTexture | null>(null);
  
  // Typed landmarks state to match HUD expectations
  const [landmarks, setLandmarks] = useState<{ left: any[] | null, right: any[] | null }>({ 
    left: null, 
    right: null 
  });

  const scannerRef = useRef<{ min: THREE.Vector3; max: THREE.Vector3 }>({
    min: new THREE.Vector3(-1, -1, 0),
    max: new THREE.Vector3(1, 1, 0),
  });

  useEffect(() => {
    let animId: number;
    const poll = () => {
      if (trackerRef.current) {
        if (!videoTexture && trackerRef.current.videoTexture) {
          setVideoTexture(trackerRef.current.videoTexture);
        }
        if (!segmentationTexture && trackerRef.current.segmentationTexture) {
          setSegmentationTexture(trackerRef.current.segmentationTexture);
        }
        
        // Safety sync for landmarks
        if (trackerRef.current.landmarks) {
            setLandmarks({ 
                left: trackerRef.current.landmarks.left, 
                right: trackerRef.current.landmarks.right 
            });
        }
        
        // Directly update our scanner ref which will be shared with the canvas
        scannerRef.current.min.copy(trackerRef.current.scanner.min);
        scannerRef.current.max.copy(trackerRef.current.scanner.max);
      }
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [videoTexture, segmentationTexture]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      {/* Hand Tracking Logic (Hidden Video) */}
      <XRayTracker ref={trackerRef} />

      {/* 3D Scene */}
      <XRayCanvas 
        videoTexture={videoTexture} 
        segmentationTexture={segmentationTexture}
        scannerRef={scannerRef} 
        landmarks={landmarks}
      />

      {/* HUD UI */}
      <XRayHUD landmarks={landmarks} />

      {/* Top Bar / Navigation */}
      <div className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-center pointer-events-none">
        <Link href="/" className="pointer-events-auto">
          <button className="bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white/70 hover:text-white px-4 py-2 rounded-full text-xs transition-all flex items-center gap-2">
            <span>←</span> SYSTEM OVERVIEW
          </button>
        </Link>
        <div className="flex flex-col items-end">
           <span className="text-[10px] text-cyan-400 font-bold tracking-[0.2em]">H.E.L.I.O.S INTERFACE</span>
           <span className="text-[8px] text-white/20">BIO-METRIC SCANNER ACTIVE</span>
        </div>
      </div>

    </main>
  );
}

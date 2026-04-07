'use client';

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { startTracking, stopTracking, LandmarkResult } from '@/lib/handTracking';
import { landmarkToWorld } from '@/lib/gestureUtils';

type Landmark = { x: number; y: number; z: number };

export interface XRayTrackerHandle {
  videoTexture: THREE.VideoTexture | null;
  segmentationTexture: THREE.CanvasTexture | null;
  scanner: { min: THREE.Vector3; max: THREE.Vector3 };
  landmarks: { left: Landmark[] | null; right: Landmark[] | null };
}

const XRayTracker = forwardRef<XRayTrackerHandle, {}>((_, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [segmentationTexture, setSegmentationTexture] = useState<THREE.CanvasTexture | null>(null);
  
  const scannerRef = useRef<{ min: THREE.Vector3; max: THREE.Vector3 }>({
    min: new THREE.Vector3(-1, -1, 0),
    max: new THREE.Vector3(1, 1, 0),
  });
  const landmarksRef = useRef<{ left: Landmark[] | null; right: Landmark[] | null }>({ left: null, right: null });

  useImperativeHandle(ref, () => ({
    videoTexture,
    segmentationTexture,
    scanner: scannerRef.current,
    landmarks: landmarksRef.current,
  }));

  const handleResults = (results: LandmarkResult) => {
    // 1. Update Segmentation Texture
    if (results.segmentationMask && videoRef.current) {
        if (!segmentationTexture) {
            const tex = new THREE.CanvasTexture(results.segmentationMask as any);
            setSegmentationTexture(tex);
        } else {
            (segmentationTexture as any).image = results.segmentationMask;
            segmentationTexture.needsUpdate = true;
        }
    }

    // 2. Update Landmarks
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      landmarksRef.current = { left: null, right: null };
      return;
    }

    const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1;
    const scaleY = 4.142; 
    const scaleX = scaleY * aspect;

    let leftLms: Landmark[] | null = null;
    let rightLms: Landmark[] | null = null;

    for (let idx = 0; idx < results.multiHandLandmarks.length; idx++) {
      const lms = results.multiHandLandmarks[idx];
      const handedness = results.multiHandedness?.[idx];
      const label = handedness?.label;
      if (label === 'Left') leftLms = lms;
      if (label === 'Right') rightLms = lms;
    }

    landmarksRef.current = { left: leftLms, right: rightLms };

    // Explicit Non-Null Assertion for strict array access
    if (leftLms && rightLms && leftLms.length > 8 && rightLms.length > 8) {
      const lIndex = leftLms[8]!;
      const lThumb = leftLms[4]!;
      const rIndex = rightLms[8]!;
      const rThumb = rightLms[4]!;

      const lMid = { x: (lIndex.x + lThumb.x) / 2, y: (lIndex.y + lThumb.y) / 2, z: 0 };
      const rMid = { x: (rIndex.x + rThumb.x) / 2, y: (rIndex.y + rThumb.y) / 2, z: 0 };

      // Ensure scale matches XRayPoints exactly
      const p1 = landmarkToWorld(lMid, scaleX, scaleY, 0); 
      const p2 = landmarkToWorld(rMid, scaleX, scaleY, 0);

      // Expand bounds slightly for better visual coverage
      const margin = 0.2;
      scannerRef.current.min.set(Math.min(p1.x, p2.x) - margin, Math.min(p1.y, p2.y) - margin, 0);
      scannerRef.current.max.set(Math.max(p1.x, p2.x) + margin, Math.max(p1.y, p2.y) + margin, 0);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      startTracking(videoRef.current, handleResults);
      const texture = new THREE.VideoTexture(videoRef.current);
      setVideoTexture(texture);
    }
    return () => {
      stopTracking();
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: 'black' }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          transform: 'scaleX(-1)'
        }}
      />
    </div>
  );
});

XRayTracker.displayName = 'XRayTracker';
export default XRayTracker;

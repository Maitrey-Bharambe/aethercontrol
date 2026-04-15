'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import XRayPoints from './XRayPoints';
import XRayFrame from './XRayFrame';
import XRaySkeleton from './XRaySkeleton';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface XRayCanvasProps {
  videoTexture: THREE.VideoTexture | null;
  segmentationTexture: THREE.CanvasTexture | null;
  scannerRef: React.RefObject<{ min: THREE.Vector3; max: THREE.Vector3 }>;
  landmarks: { left: Landmark[] | null; right: Landmark[] | null };
}

export default function XRayCanvas({ videoTexture, segmentationTexture, scannerRef, landmarks }: XRayCanvasProps) {
  return (
    <div 
      className="fixed inset-0 z-10 pointer-events-none overflow-hidden"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none' }}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{ antialias: false, alpha: true }}
        style={{ width: '100vw', height: '100vh' }}
      >
        <ambientLight intensity={0.5} />
        
        <XRayPoints 
            videoTexture={videoTexture} 
            segmentationTexture={segmentationTexture}
            scannerRef={scannerRef} 
        />
        <XRaySkeleton landmarks={landmarks} />
        <XRayFrame scannerRef={scannerRef} />
        
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.4} intensity={1.5} levels={9} mipmapBlur />
          <Noise opacity={0.05} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

'use client';

import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars, Float, ContactShadows } from '@react-three/drei';
import EngineModel from './EngineModel';
import { useGestureStore } from '@/store/useGestureStore';
import * as THREE from 'three';

function HolographicFloor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -5, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial 
        color="#000000" 
        metalness={0.8} 
        roughness={0.2} 
        transparent 
        opacity={0.5} 
      />
      <gridHelper args={[50, 50, "#00ffff", "#222222"]} position={[0, 0.01, 0]} rotation-x={Math.PI / 2} />
    </mesh>
  );
}

function HandPointer() {
  const pointerRef = useRef<THREE.Mesh>(null);
  const handPos = useGestureStore((s) => s.handPosition);
  const isTracking = useGestureStore((s) => s.isTracking);
  const gesture = useGestureStore((s) => s.gesture);

  useFrame(() => {
    if (!pointerRef.current) return;
    
    // Scale tracking normalized coordinates to roughly scene space
    const targetX = handPos.x * 10 - 5;
    const targetY = -handPos.y * 10 + 5;
    const targetZ = handPos.z * 5;

    pointerRef.current.position.set(targetX, targetY, targetZ);
    pointerRef.current.visible = isTracking;

    // Pulse effect
    const s = 1 + Math.sin(Date.now() * 0.01) * 0.2;
    pointerRef.current.scale.set(s, s, s);
  });

  return (
    <mesh ref={pointerRef}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial 
        color={gesture === 'POINT' ? "#00ffff" : "#ff0088"} 
        emissive={gesture === 'POINT' ? "#00ffff" : "#ff0088"} 
        emissiveIntensity={5} 
      />
      {/* Laser point line */}
      <mesh position={[0, 0, -2.5]}>
        <cylinderGeometry args={[0.005, 0.005, 5, 8]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} transparent opacity={0.3} />
      </mesh>
    </mesh>
  );
}

function GestureController() {
  const gesture = useGestureStore((s) => s.gesture);
  const setExplodeFactor = useGestureStore((s) => s.setExplodeFactor);
  const explodeFactor = useGestureStore((s) => s.explodeFactor);
  const hands = useGestureStore((s) => s.hands);

  useFrame(() => {
    // 1. EXPLODE View logic
    // We use the distance between two hands if available, or just the SPREAD gesture
    if (hands.length >= 2) {
        const h1 = hands[0].position;
        const h2 = hands[1].position;
        const dist = Math.sqrt(
            Math.pow(h1.x - h2.x, 2) + 
            Math.pow(h1.y - h2.y, 2)
        );
        // Normalize distance: 0.1 to 0.4 -> 0 to 1
        const factor = THREE.MathUtils.clamp((dist - 0.15) / 0.35, 0, 1);
        setExplodeFactor(factor);
    } else if (gesture === 'SPREAD') {
        setExplodeFactor(THREE.MathUtils.lerp(explodeFactor, 0.8, 0.05));
    } else {
        setExplodeFactor(THREE.MathUtils.lerp(explodeFactor, 0, 0.05));
    }
  });

  return null;
}

export default function HologramCanvas() {
  return (
    <div className="canvas-wrapper" style={{ width: '100%', height: '100vh', background: '#000' }}>
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 2, 10]} fov={45} />
        <OrbitControls 
            enablePan={false} 
            maxDistance={25} 
            minDistance={5} 
            maxPolarAngle={Math.PI / 1.8} 
        />
        
        {/* LIGHTS */}
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} color="#ff00cc" intensity={0.5} />
        
        <Suspense fallback={null}>
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <EngineModel />
          </Float>
          
          <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.25} far={10} color="#00ffff" />
          <HolographicFloor />
          <HandPointer />
          <GestureController />
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  );
}

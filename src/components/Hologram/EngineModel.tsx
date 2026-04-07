'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGestureStore } from '@/store/useGestureStore';

interface EnginePartProps {
  name: string;
  position: [number, number, number];
  color: string;
  explodeDirection: [number, number, number];
  children: React.ReactNode;
}

const EnginePart = ({ name, position, color, explodeDirection, children }: EnginePartProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const explodeFactor = useGestureStore((s) => s.explodeFactor);
  const hoveredPartId = useGestureStore((s) => s.hoveredPartId);
  const setHoveredPartId = useGestureStore((s) => s.setHoveredPartId);

  const isHovered = hoveredPartId === name;

  useFrame((state) => {
    if (!meshRef.current) return;

    // Apply explosion offset
    const targetX = position[0] + explodeDirection[0] * explodeFactor * 5;
    const targetY = position[1] + explodeDirection[1] * explodeFactor * 5;
    const targetZ = position[2] + explodeDirection[2] * explodeFactor * 5;

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.1);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.1);

    // Subtle drift
    meshRef.current.rotation.y += 0.005;
  });

  return (
    <group 
      ref={meshRef} 
      name={name}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredPartId(name);
      }}
      onPointerOut={() => setHoveredPartId(null)}
    >
      {children}
      {/* Selection Ring */}
      {isHovered && (
        <mesh rotation-x={Math.PI / 2}>
           <torusGeometry args={[1.2, 0.02, 16, 100]} />
           <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={5} />
        </mesh>
      )}
    </group>
  );
};

export default function EngineModel() {
  const groupRef = useRef<THREE.Group>(null);
  const handPosition = useGestureStore((s) => s.handPosition);
  const handRotation = useGestureStore((s) => s.handRotation);
  const isTracking = useGestureStore((s) => s.isTracking);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Auto-rotate the whole assembly (slow)
    groupRef.current.rotation.y += 0.002;

    // Follow hand for parallax and rotation
    if (isTracking) {
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -handPosition.y * 0.5, 0.1);
        
        // Sync Z-rotation with hand rotation (compensating for natural hand angle)
        const targetZ = handRotation * 1.5; 
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetZ, 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. CENTRAL REACTOR CORE */}
      <EnginePart name="HYPER-CORE" position={[0, 0, 0]} color="#ff0088" explodeDirection={[0, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial 
            color="#ff00cc" 
            emissive="#ff00cc" 
            emissiveIntensity={2} 
            transparent 
            opacity={0.8} 
          />
        </mesh>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial wireframe color="#ffffff" transparent opacity={0.2} />
        </mesh>
      </EnginePart>

      {/* 2. INNER TURBINE RINGS */}
      <EnginePart name="FLUX-RING ALFA" position={[0, 0.5, 0]} color="#00ffff" explodeDirection={[0, 1, 0]}>
        <mesh rotation-x={Math.PI / 2}>
           <torusGeometry args={[1.5, 0.1, 16, 64]} />
           <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} />
        </mesh>
      </EnginePart>

      <EnginePart name="FLUX-RING BETA" position={[0, -0.5, 0]} color="#00ffff" explodeDirection={[0, -1, 0]}>
        <mesh rotation-x={Math.PI / 2}>
           <torusGeometry args={[1.6, 0.08, 16, 64]} />
           <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} />
        </mesh>
      </EnginePart>

      {/* 3. OUTER COOLING FINS */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        const x = Math.cos(angle) * 2;
        const z = Math.sin(angle) * 2;
        return (
          <EnginePart 
            key={`fin-${i}`} 
            name={`THERMAL-FIN ${i+1}`} 
            position={[x, 0, z]} 
            color="#444444" 
            explodeDirection={[Math.cos(angle), 0, Math.sin(angle)]}
          >
            <mesh rotation-y={-angle}>
              <boxGeometry args={[0.2, 2.5, 0.8]} />
              <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
              {/* LED Strip on fin */}
              <mesh position={[0.11, 0, 0]}>
                <boxGeometry args={[0.02, 2.0, 0.1]} />
                <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
              </mesh>
            </mesh>
          </EnginePart>
        );
      })}

      {/* 4. TOP STABILIZER */}
      <EnginePart name="ION-STABILIZER" position={[0, 2.5, 0]} color="#ffffff" explodeDirection={[0, 2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.8, 1, 32]} />
          <meshStandardMaterial color="#222222" metalness={1} />
        </mesh>
      </EnginePart>

      {/* 5. BOTTOM POWER PORT */}
       <EnginePart name="ENERGY-PORT" position={[0, -2.5, 0]} color="#ffffff" explodeDirection={[0, -2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.8, 0.5, 1, 32]} />
          <meshStandardMaterial color="#222222" metalness={1} />
        </mesh>
      </EnginePart>

      {/* Atmospheric Particles inside model */}
      <points>
        <sphereGeometry args={[4, 16, 16]} />
        <pointsMaterial size={0.02} color="#00ffff" transparent opacity={0.3} />
      </points>
    </group>
  );
}

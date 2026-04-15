'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { landmarkToWorld } from '@/lib/gestureUtils';

type Landmark = { x: number; y: number; z: number };

interface XRaySkeletonProps {
  landmarks: { left: Landmark[] | null; right: Landmark[] | null };
}

// BONE_INDICES: [ [start, end], ... ]
const BONES = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Extra: Palm base connection
  [5, 9], [9, 13], [13, 17]
];

export default function XRaySkeleton({ landmarks }: XRaySkeletonProps) {
  const lineRefLeft = useRef<THREE.LineSegments>(null);
  const lineRefRight = useRef<THREE.LineSegments>(null);
  const pointsRefLeft = useRef<THREE.Points>(null);
  const pointsRefRight = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  const aspect = viewport.width / viewport.height;
  const scaleY = 4.142; // Match existing calibration
  const scaleX = scaleY * aspect;

  const landmarksRef = useRef<{ left: Landmark[] | null; right: Landmark[] | null }>({ left: null, right: null });
  useEffect(() => {
    // Structural clone to satisfy strict immutability checks
    landmarksRef.current = { 
        left: landmarks.left ? [...landmarks.left] : null, 
        right: landmarks.right ? [...landmarks.right] : null 
    };
  }, [landmarks]);

  const [vertices, indices] = useMemo(() => {
    // 21 points per hand, 3 coords each
    const v = new Float32Array(21 * 3);
    const i = new Uint16Array(BONES.flat());
    return [v, i];
  }, []);

  useFrame((state) => {
    const updateHand = (hand: Landmark[] | null, line: THREE.LineSegments | null, points: THREE.Points | null) => {
      if (!hand || !line || !points) {
        if (line) line.visible = false;
        if (points) points.visible = false;
        return;
      }
      
      line.visible = true;
      points.visible = true;
      const linePos = line.geometry.attributes.position.array as Float32Array;
      const pointPos = points.geometry.attributes.position.array as Float32Array;
      
      hand.forEach((lm, idx) => {
        const world = landmarkToWorld(lm, scaleX, scaleY, 3.2); // Further forward
        
        linePos[idx * 3 + 0] = world.x;
        linePos[idx * 3 + 1] = world.y;
        linePos[idx * 3 + 2] = world.z;

        pointPos[idx * 3 + 0] = world.x;
        pointPos[idx * 3 + 1] = world.y;
        pointPos[idx * 3 + 2] = world.z;
      });
      
      line.geometry.attributes.position.needsUpdate = true;
      points.geometry.attributes.position.needsUpdate = true;
      
      // Pulse effect: faster and more surgical
      const pulse = 0.6 + Math.sin(state.clock.elapsedTime * 6.0) * 0.4;
      if (line.material instanceof THREE.LineBasicMaterial) {
        line.material.opacity = 0.3 * pulse;
      }
      if (points.material instanceof THREE.PointsMaterial) {
        points.material.opacity = 0.8 * pulse;
        points.material.size = 0.15 * pulse;
      }
    };

    const currentLms = landmarksRef.current;
    if (!currentLms) return;
    
    const left = currentLms.left;
    const right = currentLms.right;
    updateHand(left, lineRefLeft.current, pointsRefLeft.current);
    updateHand(right, lineRefRight.current, pointsRefRight.current);
  });


  return (
    <group>
      {/* Left Hand */}
      <lineSegments ref={lineRefLeft}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
          <bufferAttribute attach="attributes-index" args={[indices, 1]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent linewidth={1} opacity={0.5} />
      </lineSegments>
      <points ref={pointsRefLeft}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#00ffff" size={0.12} transparent opacity={0.8} />
      </points>

      {/* Right Hand */}
      <lineSegments ref={lineRefRight}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
          <bufferAttribute attach="attributes-index" args={[indices, 1]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent linewidth={1} opacity={0.5} />
      </lineSegments>
      <points ref={pointsRefRight}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#00ffff" size={0.12} transparent opacity={0.8} />
      </points>
    </group>
  );
}

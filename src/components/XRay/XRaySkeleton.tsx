'use client';

import { useMemo, useRef } from 'react';
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
  const { viewport } = useThree();

  const aspect = viewport.width / viewport.height;
  const scaleY = 4.142; // Match existing calibration
  const scaleX = scaleY * aspect;

  const [vertices, indices] = useMemo(() => {
    // 21 points per hand, 3 coords each
    const v = new Float32Array(21 * 3);
    const i = new Uint16Array(BONES.flat());
    return [v, i];
  }, []);

  useFrame((state) => {
    const updateHand = (hand: Landmark[] | null, line: THREE.LineSegments | null) => {
      if (!hand || !line) {
        if (line) line.visible = false;
        return;
      }
      
      line.visible = true;
      const positions = line.geometry.attributes.position.array as Float32Array;
      
      hand.forEach((lm, idx) => {
        const world = landmarkToWorld(lm, scaleX, scaleY, 3.0); // Slightly in front of body (z=3)
        positions[idx * 3 + 0] = world.x;
        positions[idx * 3 + 1] = world.y;
        positions[idx * 3 + 2] = world.z + 0.1; // Offset for visibility
      });
      
      line.geometry.attributes.position.needsUpdate = true;
      
      // Pulse effect
      if (line.material instanceof THREE.LineBasicMaterial) {
        line.material.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 8) * 0.2;
      }
    };

    updateHand(landmarks.left, lineRefLeft.current);
    updateHand(landmarks.right, lineRefRight.current);
  });

  return (
    <group>
      <lineSegments ref={lineRefLeft}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[vertices, 3]}
          />
          <bufferAttribute
            attach="attributes-index"
            args={[indices, 1]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ffff" transparent linewidth={2} />
      </lineSegments>

      <lineSegments ref={lineRefRight}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[vertices, 3]}
          />
          <bufferAttribute
            attach="attributes-index"
            args={[indices, 1]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ffff" transparent linewidth={2} />
      </lineSegments>
    </group>
  );
}

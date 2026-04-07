'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface XRayFrameProps {
  scannerRef: React.RefObject<{ min: THREE.Vector3; max: THREE.Vector3 }>;
}

const frameVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frameFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // Holographic Blue Tint
    vec3 baseColor = vec3(0.0, 0.4, 0.8);
    
    // Edge Fade (Glow)
    float edgeWidth = 0.15;
    float edgeMask = smoothstep(0.0, edgeWidth, vUv.x) * smoothstep(1.0, 1.0 - edgeWidth, vUv.x) *
                     smoothstep(0.0, edgeWidth, vUv.y) * smoothstep(1.0, 1.0 - edgeWidth, vUv.y);
                     
    // Scanline effect
    float scanline = sin(vUv.y * 50.0 - uTime * 4.0) * 0.1 + 0.15;
    
    // Add pulsing glow to scanline
    float glow = smoothstep(0.48, 0.52, fract(vUv.y * 1.5 - uTime * 0.5)) * 0.1;
    
    float finalAlpha = (scanline + glow + 0.05) * (1.0 - edgeMask * 0.5);
    
    gl_FragColor = vec4(baseColor * 1.5, finalAlpha * 0.6);
  }
`;

export default function XRayFrame({ scannerRef }: XRayFrameProps) {
  const groupRef = useRef<THREE.Group>(null);
  const backingRef = useRef<THREE.Mesh>(null);
  const glassRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  useFrame((state) => {
    if (groupRef.current && scannerRef.current) {
      const { min, max } = scannerRef.current;
      const width = Math.max(0.1, Math.abs(max.x - min.x));
      const height = Math.max(0.1, Math.abs(max.y - min.y));
      const centerX = (min.x + max.x) / 2;
      const centerY = (min.y + max.y) / 2;

      groupRef.current.position.set(centerX, centerY, 3.0); 
      
      if (backingRef.current) backingRef.current.scale.set(width, height, 1);
      if (glassRef.current) glassRef.current.scale.set(width, height, 1);

      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      }

      // Update corner markers
      const corners = groupRef.current.children.slice(2); // After Backing and Glass
      const hw = width / 2;
      const hh = height / 2;

      corners[0]?.position.set(-hw, hh, 0);
      corners[1]?.position.set(hw, hh, 0);
      corners[2]?.position.set(-hw, -hh, 0);
      corners[3]?.position.set(hw, -hh, 0);
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. Black Backing (The Dark Chamber) */}
      <mesh ref={backingRef} position={[0, 0, -5.0]}> 
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#000" transparent={false} opacity={1} />
      </mesh>

      {/* 2. Holographic Scanner Glass Layer */}
      <mesh ref={glassRef}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
            ref={materialRef}
            vertexShader={frameVertexShader}
            fragmentShader={frameFragmentShader}
            uniforms={uniforms}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
        />
        <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
            <lineBasicMaterial color="#00ffff" linewidth={2} transparent opacity={0.6} />
        </lineSegments>
      </mesh>

      <Bracket marker="TL" />
      <Bracket marker="TR" />
      <Bracket marker="BL" />
      <Bracket marker="BR" />
    </group>
  );
}

function Bracket({ marker }: { marker: string }) {
    const size = 0.5;
    const thickness = 0.05;
    return (
        <group>
            <mesh position={[marker.includes('R') ? -size/2 : size/2, 0, 0.01]}>
                <boxGeometry args={[size, thickness, thickness]} />
                <meshBasicMaterial color="#00ffff" />
            </mesh>
            <mesh position={[0, marker.includes('T') ? -size/2 : size/2, 0.01]}>
                <boxGeometry args={[thickness, size, thickness]} />
                <meshBasicMaterial color="#00ffff" />
            </mesh>
        </group>
    );
}

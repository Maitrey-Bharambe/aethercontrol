'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Points, ShaderMaterial } from 'three';

const GRID_SIZE = 256; // 65,536 points for high detail
const NUM_POINTS = GRID_SIZE * GRID_SIZE;

interface XRayPointsProps {
  videoTexture: THREE.VideoTexture | null;
  segmentationTexture: THREE.CanvasTexture | null;
  scannerRef: React.RefObject<{ min: THREE.Vector3; max: THREE.Vector3 }>;
}

const vertexShader = `
  uniform sampler2D uVideoTexture;
  uniform sampler2D uSegmentationTexture;
  uniform float uTime;
  uniform vec3 uScannerMin;
  uniform vec3 uScannerMax;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vInside;
  varying float vLuminance;
  varying float vIsUser;

  void main() {
    vUv = uv;
    vec4 videoColor = texture2D(uVideoTexture, uv);
    vec4 maskColor = texture2D(uSegmentationTexture, uv);
    
    // Bio-Segmentation: check for red-channel mask
    vIsUser = maskColor.r > 0.05 ? 1.0 : 0.0;
    
    float luminance = dot(videoColor.rgb, vec3(0.299, 0.587, 0.114));
    vLuminance = luminance;

    vec3 pos = position;
    // Displace z significantly to create 3D volume
    pos.z += (luminance * 2.5);

    // Scanner Check (World Space bounds)
    vInside = (pos.x >= uScannerMin.x && pos.x <= uScannerMax.x &&
               pos.y >= uScannerMin.y && pos.y <= uScannerMax.y) ? 1.0 : 0.0;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Points are bigger and brighter inside the scanner
    float sizeFactor = vInside > 0.5 ? 4.5 : 1.2;
    gl_PointSize = vIsUser * sizeFactor * (45.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    vPosition = pos;
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying float vInside;
  varying float vLuminance;
  varying float vIsUser;

  vec3 thermalPalette(float t) {
    vec3 cold = vec3(0.0, 0.05, 0.2);
    vec3 cool = vec3(0.0, 0.5, 1.0);
    vec3 mid  = vec3(0.0, 1.0, 0.5);
    vec3 warm = vec3(1.0, 0.8, 0.0);
    vec3 hot  = vec3(1.0, 0.2, 0.0);
    vec3 core = vec3(1.0, 1.0, 1.0);
    
    if (t < 0.2) return mix(cold, cool, t * 5.0);
    if (t < 0.4) return mix(cool, mid, (t - 0.2) * 5.0);
    if (t < 0.6) return mix(mid, warm, (t - 0.4) * 5.0);
    if (t < 0.8) return mix(warm, hot, (t - 0.6) * 5.0);
    return mix(hot, core, (t - 0.8) * 5.0);
  }

  void main() {
    if (vIsUser < 0.5) discard;

    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;
    float strength = 1.0 - dist * 2.0;

    // Default "Body Ghost" color
    vec3 ghostColor = vec3(0.2, 0.5, 1.0) * (0.2 + 0.8 * vLuminance);
    
    // Thermal reconstruction
    vec3 thermal = thermalPalette(vLuminance);
    
    // Topographic depth-lines (Medical Sonar look)
    float topo = sin(vPosition.z * 20.0 - uTime * 2.0) * 0.5 + 0.5;
    thermal *= (0.7 + 0.3 * topo);

    // Dynamic horizontal scanning bar
    float scanLineY = fract(uTime * 0.4) * 8.0 - 4.0; 
    float scanPulse = smoothstep(0.1, 0.0, abs(vPosition.y - scanLineY));
    thermal += scanPulse * vec3(0.0, 1.0, 1.0) * 2.0;

    vec3 finalColor = mix(ghostColor, thermal, vInside);
    float alpha = mix(0.15, 0.9, vInside) * strength;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export default function XRayPoints({ videoTexture, segmentationTexture, scannerRef }: XRayPointsProps) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { viewport } = useThree();

  const [positions, uvs] = useMemo(() => {
    const pos = new Float32Array(NUM_POINTS * 3);
    const uv = new Float32Array(NUM_POINTS * 2);

    const aspect = viewport.width / viewport.height;
    const scaleY = 4.142; 
    const scaleX = scaleY * aspect;

    // Video is 4:3 (1.333)
    const videoAspect = 4 / 3;
    const screenAspect = aspect;

    let uScale = 1;
    let vScale = 1;
    let uOffset = 0;
    let vOffset = 0;

    if (screenAspect > videoAspect) {
        // Wider screen: crop top/bottom
        vScale = videoAspect / screenAspect;
        vOffset = (1 - vScale) / 2;
    } else {
        // Taller screen: crop sides
        uScale = screenAspect / videoAspect;
        uOffset = (1 - uScale) / 2;
    }

    for (let i = 0; i < NUM_POINTS; i++) {
        const xIdx = (i % GRID_SIZE) / (GRID_SIZE - 1);
        const yIdx = Math.floor(i / GRID_SIZE) / (GRID_SIZE - 1);

        // Position: Map to full viewport world space
        // Standard mapping: index 0 (Left) -> pos -1 (Left), index 1 (Right) -> pos 1 (Right)
        pos[i * 3 + 0] = (xIdx - 0.5) * 2.0 * scaleX; 
        pos[i * 3 + 1] = (yIdx - 0.5) * 2.0 * scaleY;
        pos[i * 3 + 2] = 0;

        // UV: Filter through mirroring to match scaleX(-1) display
        uv[i * 2 + 0] = uOffset + (1.0 - xIdx) * uScale;
        uv[i * 2 + 1] = vOffset + yIdx * vScale;
    }
    return [pos, uv];
  }, [viewport.width, viewport.height]);

  useFrame((state) => {
    if (materialRef.current && videoTexture && segmentationTexture) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uVideoTexture.value = videoTexture;
      materialRef.current.uniforms.uSegmentationTexture.value = segmentationTexture;
      
      if (scannerRef.current) {
        materialRef.current.uniforms.uScannerMin.value.copy(scannerRef.current.min);
        materialRef.current.uniforms.uScannerMax.value.copy(scannerRef.current.max);
      }
    }
  });

  const uniforms = useMemo(() => ({
    uVideoTexture: { value: null },
    uSegmentationTexture: { value: null },
    uTime: { value: 0 },
    uScannerMin: { value: new THREE.Vector3() },
    uScannerMax: { value: new THREE.Vector3() }
  }), []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-uv"
          args={[uvs, 2]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </points>
  );
}

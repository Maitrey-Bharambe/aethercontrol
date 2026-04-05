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
    
    // Bio-Segmentation: white is user (mask value > 0.1)
    vIsUser = maskColor.r > 0.05 ? 1.0 : 0.0;

    // Luminance for displacement and thermal mapping
    float luminance = dot(videoColor.rgb, vec3(0.299, 0.587, 0.114));
    vLuminance = luminance;

    vec3 pos = position;
    // Map luminance to Z displacement - deeper for 256 resolution
    pos.z += (luminance * 3.5);

    // Scanner Check (Local X/Y bounds)
    float isInside = (pos.x >= uScannerMin.x && pos.x <= uScannerMax.x &&
                      pos.y >= uScannerMin.y && pos.y <= uScannerMax.y) ? 1.0 : 0.0;
    vInside = isInside;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Responsive sizing
    float sizeModifier = mix(1.2, 4.0, vInside);
    gl_PointSize = vIsUser * sizeModifier * (25.0 / -mvPosition.z);
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

  // Multi-chromatic Bio-Thermal Palette
  vec3 thermalPalette(float t) {
    vec3 c1 = vec3(0.0, 0.0, 0.2); // Deep Blue (Cold)
    vec3 c2 = vec3(0.0, 1.0, 1.0); // Cyan
    vec3 c3 = vec3(0.0, 1.0, 0.0); // Green
    vec3 c4 = vec3(1.0, 1.0, 0.0); // Yellow
    vec3 c5 = vec3(1.0, 0.1, 0.0); // Red-Orange
    vec3 c6 = vec3(1.0, 1.0, 1.0); // White (Hot)
    
    if (t < 0.2) return mix(c1, c2, t * 5.0);
    if (t < 0.4) return mix(c2, c3, (t - 0.2) * 5.0);
    if (t < 0.6) return mix(c3, c4, (t - 0.4) * 5.0);
    if (t < 0.8) return mix(c4, c5, (t - 0.6) * 5.0);
    return mix(c5, c6, (t - 0.8) * 5.0);
  }

  void main() {
    if (vIsUser < 0.5) discard;

    float strength = 1.0 - distance(gl_PointCoord, vec2(0.5)) * 2.0;
    if (strength < 0.01) discard;

    // Normal Ghost Vision (Outside)
    vec3 outsideColor = vec3(0.3, 0.6, 1.0) * (0.1 + 0.9 * vLuminance);
    
    // Detailed Thermal Mapping (Inside)
    vec3 thermal = thermalPalette(vLuminance);
    
    // Topographical Sonar Rips
    float ripple = sin(vPosition.z * 15.0 - uTime * 4.0) * 0.1 + 0.9;
    thermal *= ripple;

    // Scanning Line Highlight
    float scanline = smoothstep(0.48, 0.52, fract(vPosition.y * 0.2 - uTime * 0.3)) * 0.2;
    thermal += scanline * vec3(0.0, 1.0, 1.0);

    vec3 finalColor = mix(outsideColor, thermal, vInside);
    float finalAlpha = mix(0.1, 1.0, vInside);

    gl_FragColor = vec4(finalColor, finalAlpha * strength);
  }
`;

export default function XRayPoints({ videoTexture, segmentationTexture, scannerRef }: XRayPointsProps) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  const { viewport } = useThree();

  const [positions, uvs] = useMemo(() => {
    const pos = new Float32Array(NUM_POINTS * 3);
    const uv = new Float32Array(NUM_POINTS * 2);

    // Calculate aspect ratio calibration
    // Video is 640x480 (4:3). Viewport varies.
    const videoAspect = 4 / 3;
    const viewportAspect = viewport.width / viewport.height;
    
    let scaleX = 1;
    let scaleY = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (viewportAspect > videoAspect) {
        // Viewport is wider than video (letterbox vertical)
        scaleX = 1;
        scaleY = viewportAspect / videoAspect;
    } else {
        // Viewport is taller than video (letterbox horizontal)
        scaleX = videoAspect / viewportAspect;
        scaleY = 1;
    }

    for (let i = 0; i < NUM_POINTS; i++) {
        const x = (i % GRID_SIZE) / GRID_SIZE;
        const y = Math.floor(i / GRID_SIZE) / GRID_SIZE;

        // Corrected mapping to handle object-fit:cover logic
        // This ensures the point cloud perfectly aligns with the scaled video pixels
        pos[i * 3 + 0] = (0.5 - x) * viewport.width * scaleX; 
        pos[i * 3 + 1] = (y - 0.5) * viewport.height * scaleY;
        pos[i * 3 + 2] = 0;

        uv[i * 2 + 0] = x;
        uv[i * 2 + 1] = y;
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

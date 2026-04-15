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
    
    // High-resolution scanning: points are smaller and sharper inside scanner
    float sizeFactor = vInside > 0.5 ? 2.5 : 1.0;
    gl_PointSize = vIsUser * sizeFactor * (60.0 / -mvPosition.z);
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

  vec3 medicalXRayPalette(float t) {
    // Medical X-ray: Deep shadows -> Cold Cyan/Blue -> Dense Bone White
    vec3 black = vec3(0.01, 0.02, 0.05);
    vec3 deepCyan = vec3(0.1, 0.4, 0.6);
    vec3 boneCyan = vec3(0.6, 0.9, 1.0);
    vec3 pureWhite = vec3(1.0, 1.0, 1.0);
    
    if (t < 0.2) return mix(black, deepCyan, t * 5.0);
    if (t < 0.6) return mix(deepCyan, boneCyan, (t - 0.2) * 2.5);
    return mix(boneCyan, pureWhite, (t - 0.6) * 2.5);
  }

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    if (vIsUser < 0.5) discard;

    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;
    float strength = 1.0 - dist * 2.0;

    // Default "Body Ghost" color (Translucent Deep Blue)
    vec3 ghostColor = vec3(0.1, 0.3, 0.8) * (0.1 + 0.9 * vLuminance);
    
    // Medical X-Ray Reconstruction
    // Boost contrast for "bony" look
    float contrastLuma = smoothstep(0.2, 0.8, vLuminance);
    vec3 xray = medicalXRayPalette(contrastLuma);
    
    // High-frequency medical noise (Grain)
    float grain = random(vUv + uTime * 0.01) * 0.15;
    xray += grain;

    // Topographic depth-lines (Medical Imaging sonar feel)
    float topo = sin(vPosition.z * 15.0 - uTime * 1.5) * 0.5 + 0.5;
    xray *= (0.8 + 0.2 * topo);

    // Dynamic horizontal scanning bar
    float scanLineY = fract(uTime * 0.3) * 10.0 - 5.0; 
    float scanPulse = smoothstep(0.15, 0.0, abs(vPosition.y - scanLineY));
    xray += scanPulse * vec3(0.5, 1.0, 1.0) * 0.8;

    vec3 finalColor = mix(ghostColor, xray, vInside);
    
    // Within the scanner, make it significantly more opaque where "dense" (bright)
    float alpha = mix(0.1, mix(0.1, 0.95, contrastLuma), vInside) * strength;

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

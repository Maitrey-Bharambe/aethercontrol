'use client';

/**
 * MediaPipe Hand Tracking with Selfie Segmentation.
 * Using unpkg.com for more reliable WASM/MIME type delivery.
 */

export type LandmarkResult = {
  multiHandLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
  multiHandedness: Array<{ label: string; score: number }>;
  segmentationMask?: HTMLCanvasElement | ImageBitmap | null;
  image: any;
};

// Singleton instances
let handsInstance: any = null;
let selfieInstance: any = null;
let cameraInstance: any = null;
let isShuttingDown = false;

// Version constants (Unpkg format)
const HANDS_VER = '0.4.1675469240';
const SELFIE_VER = '0.1.1675465747';

export async function startTracking(
  videoEl: HTMLVideoElement,
  onResults: (results: LandmarkResult) => void
): Promise<void> {
  const { Hands } = await import('@mediapipe/hands');
  const { SelfieSegmentation } = await import('@mediapipe/selfie_segmentation');
  const { Camera } = await import('@mediapipe/camera_utils');

  // 1. Initialize Hands (EXPLICIT unpkg path)
  const hands = new Hands({
    locateFile: (file: string) => `https://unpkg.com/@mediapipe/hands@${HANDS_VER}/${file}`,
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });

  // Small delay to prevent loader cross-contamination
  await new Promise(r => setTimeout(r, 200));

  // 2. Initialize Selfie (EXPLICIT unpkg path)
  const selfie = new SelfieSegmentation({
    locateFile: (file: string) => `https://unpkg.com/@mediapipe/selfie_segmentation@${SELFIE_VER}/${file}`,
  });

  selfie.setOptions({
    modelSelection: 1, 
  });

  let latestHands: any = null;

  hands.onResults((results: any) => {
    latestHands = results;
  });

  selfie.onResults((results: any) => {
    onResults({
      multiHandLandmarks: latestHands?.multiHandLandmarks || [],
      multiHandedness: latestHands?.multiHandedness || [],
      segmentationMask: results.segmentationMask,
      image: results.image
    });
  });

  const camera = new Camera(videoEl, {
    onFrame: async () => {
      if (isShuttingDown) return;
      
      try {
        // Sequential processing to minimize browser memory pressure
        await hands.send({ image: videoEl });
        await selfie.send({ image: videoEl });
      } catch (e) {
        console.warn('MP worker cycle error:', e);
      }
    },
    width: 640,
    height: 480,
    facingMode: 'user',
  });

  await camera.start();
  handsInstance = hands;
  selfieInstance = selfie;
  cameraInstance = camera;
}

export async function stopTracking(): Promise<void> {
  isShuttingDown = true;
  if (cameraInstance) {
    cameraInstance.stop();
    cameraInstance = null;
  }
  if (handsInstance) {
    try { handsInstance.close(); } catch(e) {}
    handsInstance = null;
  }
  if (selfieInstance) {
    try { selfieInstance.close(); } catch(e) {}
    selfieInstance = null;
  }
  isShuttingDown = false;
}

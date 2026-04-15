import { GestureType } from '@/store/useGestureStore';

type Landmark = { x: number; y: number; z: number };

// MediaPipe finger tip/pip/mcp indices
const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_PIPS = [3, 6, 10, 14, 18];
const FINGER_MCPS = [2, 5, 9, 13, 17];

function dist(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function getHandCenter(landmarks: Landmark[]): Landmark {
  if (!landmarks || landmarks.length === 0) return { x: 0, y: 0, z: 0 };
  const sum = landmarks.reduce(
    (acc, l) => ({ x: acc.x + l.x, y: acc.y + l.y, z: acc.z + (l.z || 0) }),
    { x: 0, y: 0, z: 0 }
  );
  return {
    x: sum.x / landmarks.length,
    y: sum.y / landmarks.length,
    z: sum.z / landmarks.length,
  };
}

export function isFingerExtended(landmarks: Landmark[], fingerIndex: number): boolean {
  // fingerIndex 0=thumb, 1=index, 2=middle, 3=ring, 4=pinky
  const tipIdx = FINGER_TIPS[fingerIndex];
  const pipIdx = FINGER_PIPS[fingerIndex];
  const mcpIdx = FINGER_MCPS[fingerIndex];

  if (fingerIndex === 0) {
    // Thumb: compare tip to mcp
    return dist(landmarks[tipIdx], landmarks[mcpIdx]) > dist(landmarks[pipIdx], landmarks[mcpIdx]);
  }

  // Others: tip y above pip y (in MediaPipe coords, y=0 is top)
  return landmarks[tipIdx].y < landmarks[pipIdx].y;
}

export function isPinch(landmarks: Landmark[]): boolean {
  if (!landmarks || landmarks.length < 9) return false;
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  return dist(thumbTip, indexTip) < 0.07;
}

export function isFist(landmarks: Landmark[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  let closedCount = 0;
  for (let i = 1; i <= 4; i++) {
    if (!isFingerExtended(landmarks, i)) closedCount++;
  }
  return closedCount >= 4;
}

export function isPointing(landmarks: Landmark[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  const indexExtended = isFingerExtended(landmarks, 1);
  const othersClosed = [2, 3, 4].every(i => !isFingerExtended(landmarks, i));
  return indexExtended && othersClosed;
}


export function isOpenPalm(landmarks: Landmark[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  let extendedCount = 0;
  for (let i = 1; i <= 4; i++) {
    if (isFingerExtended(landmarks, i)) extendedCount++;
  }
  return extendedCount >= 4;
}

export function isSpread(landmarks: Landmark[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  if (!isOpenPalm(landmarks)) return false;
  // Check finger spread: angle between index and pinky
  const indexTip = landmarks[8];
  const pinkyTip = landmarks[20];
  const wrist = landmarks[0];
  const spread = dist(indexTip, pinkyTip);
  const handSize = dist(wrist, landmarks[9]); // wrist to middle MCP
  return spread / handSize > 1.4;
}

export function detectGesture(
  landmarks: Landmark[],
  velocity: { x: number; y: number; z: number },
  prevGesture: GestureType
): GestureType {
  if (!landmarks || landmarks.length < 21) return 'IDLE';

  if (isFist(landmarks)) return 'FREEZE';
  if (isPinch(landmarks)) return 'GRAB';
  if (isPointing(landmarks)) return 'POINT';
  if (isOpenPalm(landmarks)) return 'SPREAD';


  return 'IDLE';
}



export type ThumbDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NEUTRAL';

export function getThumbDirection(landmarks: Landmark[]): ThumbDirection {
  if (!landmarks || landmarks.length < 5) return 'NEUTRAL';
  
  const base = landmarks[2]; // Thumb MCP
  const tip = landmarks[4];  // Thumb Tip
  
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  
  const threshold = 0.04;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) < threshold) return 'NEUTRAL';
    // Mirrored X logic
    return dx > 0 ? 'LEFT' : 'RIGHT';
  } else {
    if (Math.abs(dy) < threshold) return 'NEUTRAL';
    return dy < 0 ? 'UP' : 'DOWN';
  }
}

// Convert MediaPipe normalized coords [0,1] → world space [-1,+1]
export function landmarkToWorld(
  lm: Landmark,
  scaleX = 3.5,
  scaleY = 2.5,
  scaleZ = 2.0
): { x: number; y: number; z: number } {
  return {
    x: (0.5 - lm.x) * 2 * scaleX,  // mirror + scale
    y: (0.5 - lm.y) * 2 * scaleY,
    z: -(lm.z || 0) * scaleZ,
  };
}

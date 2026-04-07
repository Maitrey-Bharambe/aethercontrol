import { create } from 'zustand';

export type GestureType =
  | 'IDLE'
  | 'SPREAD'
  | 'GRAB'
  | 'POINT'
  | 'FREEZE';


export type AppMode = 'cosmic' | 'electric' | 'fluid' | 'hologram';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface HandState {
  position: Vec3;
  velocity: Vec3;
  landmarks: Array<{ x: number; y: number; z: number }>;
  gesture: GestureType;
  handedness: 'Left' | 'Right';
  speed: number;
  rotation: number; // Angle in radians
}


interface GestureStore {
  // Tracking state
  isTracking: boolean;
  setIsTracking: (v: boolean) => void;

  // Hands
  hands: HandState[];
  setHands: (hands: HandState[]) => void;

  // Primary hand (first detected)
  handPosition: Vec3;
  handVelocity: Vec3;
  handSpeed: number;
  handRotation: number;
  gesture: GestureType;

  // Mode
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;

  // Targeted pointing
  targetLockedId: number | null;
  setTargetLockedId: (id: number | null) => void;

  // Pinch grab
  grabbedObjectId: number | null;
  setGrabbedObjectId: (id: number | null) => void;

  // Aether-Core / Hologram State
  explodeFactor: number;
  setExplodeFactor: (f: number) => void;
  hoveredPartId: string | null;
  setHoveredPartId: (id: string | null) => void;
}

export const useGestureStore = create<GestureStore>((set) => ({
  isTracking: false,
  setIsTracking: (v) => set({ isTracking: v }),

  hands: [],
  setHands: (hands) => {
    const primary = hands[0];
    if (primary) {
      set({
        hands,
        handPosition: primary.position,
        handVelocity: primary.velocity,
        handSpeed: primary.speed,
        handRotation: primary.rotation,
        gesture: primary.gesture,
      });
    } else {
      set({
        hands,
        gesture: 'IDLE',
        handSpeed: 0,
        targetLockedId: null, // Clear target if hand lost
      });
    }
  },

  handPosition: { x: 0, y: 0, z: 0 },
  handVelocity: { x: 0, y: 0, z: 0 },
  handSpeed: 0,
  handRotation: 0,
  gesture: 'IDLE',

  activeMode: 'cosmic',
  setActiveMode: (mode) => set({ activeMode: mode }),

  targetLockedId: null,
  setTargetLockedId: (id) => set({ targetLockedId: id }),

  grabbedObjectId: null,
  setGrabbedObjectId: (id) => set({ grabbedObjectId: id }),

  // Hologram defaults
  explodeFactor: 0,
  setExplodeFactor: (f) => set({ explodeFactor: f }),
  hoveredPartId: null,
  setHoveredPartId: (id) => set({ hoveredPartId: id }),
}));


import { create } from 'zustand';

export type PuzzleStatus = 'IDLE' | 'CROPPING' | 'SOLVING' | 'SOLVED';

export interface PuzzlePiece {
  id: number;
  originalIndex: number;
  currentIndex: number;
}

interface PuzzleStore {
  status: PuzzleStatus;
  setStatus: (status: PuzzleStatus) => void;
  
  gridSize: number;
  setGridSize: (size: number) => void;
  
  cropRect: { x: number; y: number; width: number; height: number } | null;
  setCropRect: (rect: { x: number; y: number; width: number; height: number } | null) => void;
  
  imageSrc: string | null;
  setImageSrc: (src: string | null) => void;
  
  pieces: PuzzlePiece[];
  setPieces: (pieces: PuzzlePiece[]) => void;
  
  shufflePieces: () => void;
  swapPieces: (idxA: number, idxB: number) => void;
  checkSolved: () => boolean;
  
  reset: () => void;
}

export const usePuzzleStore = create<PuzzleStore>((set, get) => ({
  status: 'IDLE',
  setStatus: (status) => set({ status }),
  
  gridSize: 3,
  setGridSize: (gridSize) => set({ gridSize }),
  
  cropRect: null,
  setCropRect: (cropRect) => set({ cropRect }),
  
  imageSrc: null,
  setImageSrc: (imageSrc) => set({ imageSrc }),
  
  pieces: [],
  setPieces: (pieces) => set({ pieces }),
  
  shufflePieces: () => {
    const { pieces } = get();
    if (pieces.length === 0) return;
    
    // Fisher-Yates shuffle of currentIndex
    const indices = pieces.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    const shuffled = pieces.map((p, i) => ({
      ...p,
      currentIndex: indices[i],
    }));
    
    set({ pieces: shuffled });
  },
  
  swapPieces: (idxA, idxB) => {
    const { pieces } = get();
    const newPieces = pieces.map((p) => {
      if (p.currentIndex === idxA) return { ...p, currentIndex: idxB };
      if (p.currentIndex === idxB) return { ...p, currentIndex: idxA };
      return p;
    });
    set({ pieces: newPieces });
    
    if (get().checkSolved()) {
      set({ status: 'SOLVED' });
    }
  },
  
  checkSolved: () => {
    const { pieces } = get();
    if (pieces.length === 0) return false;
    return pieces.every((p) => p.currentIndex === p.originalIndex);
  },
  
  reset: () => set({
    status: 'IDLE',
    cropRect: null,
    imageSrc: null,
    pieces: [],
  }),
}));

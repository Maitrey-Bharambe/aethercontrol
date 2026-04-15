'use client';

interface Props {
  id: number;
  originalIndex: number;
  currentIndex: number;
  gridSize: number;
  imageSrc: string;
  isHovered?: boolean;
  isGrabbed?: boolean;
  onSelect?: () => void;
  dragPosition?: { x: number; y: number } | null;
}

export default function PuzzlePiece({ 
  originalIndex, 
  currentIndex, 
  gridSize, 
  imageSrc,
  isHovered,
  isGrabbed,
  onSelect,
  dragPosition
}: Props) {
  // Original coords for background position
  const ox = originalIndex % gridSize;
  const oy = Math.floor(originalIndex / gridSize);
  
  // Current coords for grid placement
  const cx = currentIndex % gridSize;
  const cy = Math.floor(currentIndex / gridSize);
  
  const size = 100 / gridSize; // percentage
  
  // background-position usually works in percentages of the image overflow area
  // Formula: (targetX / (totalWidth - pieceWidth)) * 100
  const bgPosX = gridSize > 1 ? (ox / (gridSize - 1)) * 100 : 0;
  const bgPosY = gridSize > 1 ? (oy / (gridSize - 1)) * 100 : 0;

  // Calculate dynamic position if dragging
  const style: React.CSSProperties = {
    width: `${size}%`,
    height: `${size}%`,
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
    backgroundPosition: `${bgPosX}% ${bgPosY}%`,
  };

  if (isGrabbed && dragPosition) {
    // Already relative to container in pixels
    style.left = `${dragPosition.x}px`;
    style.top = `${dragPosition.y}px`;
    style.transform = 'translate(-50%, -50%)';
    style.pointerEvents = 'none'; // Don't block landmarks when dragging
    style.zIndex = 1000;
  } else {
    style.left = `${cx * size}%`;
    style.top = `${cy * size}%`;
    style.zIndex = isHovered ? 10 : 1;
  }

  return (
    <div
      onClick={onSelect}
      className={`absolute transition-all duration-300 ease-out border border-white/10 rounded-md overflow-hidden cursor-pointer
        ${isHovered ? 'shadow-[0_0_20px_rgba(0,210,255,0.4)] scale-[1.02] border-white/30 brightness-110' : ''}
        ${isGrabbed ? 'shadow-[0_0_40px_rgba(0,210,255,1)] scale-110 brightness-125 border-cyan-400 !duration-0' : ''}
      `}
      style={style}
    >
      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none" />
      
      {/* Solve indicator (very subtle) */}
      {originalIndex === currentIndex && (
        <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-cyan-400/30 blur-[1px]" />
      )}
    </div>
  );
}

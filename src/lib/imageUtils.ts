/**
 * Captures a specific region of a video element and returns it as a DataURL.
 */
export function captureCroppedFrame(
  video: HTMLVideoElement,
  rect: { x: number; y: number; width: number; height: number }
): string {
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Get scale between display size and intrinsic video size
  const scaleX = video.videoWidth / video.offsetWidth;
  const scaleY = video.videoHeight / video.offsetHeight;

  // Since the video is mirrored via CSS scaleX(-1), 
  // we need to mirror the capture if we want it to look "normal" 
  // OR we mirror the canvas to match the user's view.
  // Let's mirror the canvas to match exactly what the user sees.
  
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);

  // When mirrored, the X coordinate in intrinsic space 
  // needs to be calculated from the mirrored display coordinate.
  // The user clicks at rect.x on a mirrored video.
  // Display width = offsetWidth.
  // Mirrored X = offsetWidth - rect.x - rect.width
  
  const mirroredX = (video.offsetWidth - rect.x - rect.width) * scaleX;
  const sourceY = rect.y * scaleY;
  const sourceW = rect.width * scaleX;
  const sourceH = rect.height * scaleY;

  ctx.drawImage(
    video,
    mirroredX, sourceY, sourceW, sourceH,
    0, 0, rect.width, rect.height
  );
  
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Generates an array of puzzle piece objects.
 */
export function generatePieces(gridSize: number) {
  const pieces = [];
  const total = gridSize * gridSize;
  for (let i = 0; i < total; i++) {
    pieces.push({
      id: i,
      originalIndex: i,
      currentIndex: i,
    });
  }
  return pieces;
}

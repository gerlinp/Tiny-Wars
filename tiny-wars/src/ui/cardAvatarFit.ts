/** Uniform scale to fit a frame inside a box without cropping (CSS object-fit: contain). */
export function containAvatarScale(frameW: number, frameH: number, boxW: number, boxH: number): number {
  if (frameW <= 0 || frameH <= 0) return 1
  return Math.min(boxW / frameW, boxH / frameH)
}

/** Scale factors for center-crop then stretch-to-fill (legacy hand portrait size). */
export function centerCropFillScale(
  frameW: number,
  frameH: number,
  boxW: number,
  boxH: number,
  cropRatio: number,
): { cropW: number; cropH: number; scaleX: number; scaleY: number } | { scale: number } {
  if (cropRatio >= 1) {
    return { scale: containAvatarScale(frameW, frameH, boxW, boxH) }
  }
  const cropW = frameW * cropRatio
  const cropH = frameH * cropRatio
  return { cropW, cropH, scaleX: boxW / cropW, scaleY: boxH / cropH }
}

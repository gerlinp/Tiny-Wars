import { containAvatarScale } from './cardAvatarFit'

/** Backdrop portrait crop for air boat — shows hull + a sliver of balloon rigging. */
export const AIR_BOAT_AVATAR_CROP_RATIO = 0.52

/** Matches {@link FRAME_SHARK_Y} in AirBoatCrew. */
const PORTRAIT_SHARK_FRAME_Y = 0.65
/** Matches {@link SHARK_STERN_X_RATIO} in AirBoatCrew. */
const PORTRAIT_SHARK_STERN_RATIO = 0.13
/** Hull centre in the 256×256 frame — used to vertically centre the boat in the card slot. */
const PORTRAIT_HULL_CENTER_Y = 0.72

/** Extra upward shift for the boat art only (fraction of slot height). Shark stays put. */
export const AIR_BOAT_AVATAR_BOAT_UP_NUDGE = 0.25

/** Original portrait rower scale — sized against the full frame, not the cropped hull only. */
export const AIR_BOAT_AVATAR_SHARK_SCALE = 0.88

export interface AirBoatPortraitSharkSeat {
  x: number
  y: number
  width: number
  height: number
}

export interface AirBoatPortraitLayout {
  cropX: number
  cropY: number
  cropW: number
  cropH: number
  /** Uniform scale applied to the cropped boat art. */
  scale: number
  /** Vertical offset so the hull centre sits in the middle of the icon box. */
  boatY: number
  shark: AirBoatPortraitSharkSeat
}

/**
 * Lay out the air-boat portrait: width-fill scale, hull centred in the slot, paddle shark at
 * the original (full-frame) size seated with on-map frame ratios.
 */
export function layoutAirBoatPortrait(
  frameW: number,
  frameH: number,
  slotW: number,
  slotH: number,
  cropRatio: number,
  focusY: number,
  sharkToBoatHeightRatio: number,
): AirBoatPortraitLayout {
  const cropW = frameW * cropRatio
  const cropH = frameH * cropRatio
  const cropX = (frameW - cropW) / 2
  const cropY = (frameH - cropH) * clamp01(focusY)
  const cropCenterX = cropX + cropW / 2
  const cropCenterY = cropY + cropH / 2

  // Fill the slot width; clamp with contain so tall slots never stretch vertically.
  const widthScale = slotW / cropW
  const scale = Math.min(widthScale, containAvatarScale(cropW, cropH, slotW, slotH))

  const hullFrameY = frameH * PORTRAIT_HULL_CENTER_Y
  const baseBoatY = -(hullFrameY - cropCenterY) * scale
  const boatY = baseBoatY - slotH * AIR_BOAT_AVATAR_BOAT_UP_NUDGE

  const sharkFrameY = frameH * PORTRAIT_SHARK_FRAME_Y
  const sharkFrameX = frameW / 2 - PORTRAIT_SHARK_STERN_RATIO * frameW

  // Original sizing: rower proportional to the full frame height at portrait scale.
  const sharkH = sharkToBoatHeightRatio * frameH * scale * AIR_BOAT_AVATAR_SHARK_SCALE
  const sharkW = sharkH

  const sharkY = baseBoatY + (sharkFrameY - cropCenterY) * scale

  return {
    cropX,
    cropY,
    cropW,
    cropH,
    scale,
    boatY,
    shark: {
      x: (sharkFrameX - cropCenterX) * scale,
      y: sharkY,
      width: sharkW,
      height: sharkH,
    },
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

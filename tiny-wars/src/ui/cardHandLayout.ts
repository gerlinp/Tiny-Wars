import Phaser from 'phaser'
import { GAME_WIDTH, HUD_HEIGHT } from '@data/GameConstants'

/** Maximize avatars within the HUD — row spans the screen, slots fill deck height. */

const HAND_SLOTS = 4
const DECK_MARGIN_X = 6
const CARD_SLOT_GAP = 4
const NEXT_HAND_GAP = 8
const NEXT_SLOT_SCALE = 0.65

export const ELIXIR_BAND_H = 18
export const DECK_PAD_TOP = 1
export const DECK_PAD_BOTTOM = 2

export const CARD_SLOT_H = HUD_HEIGHT - ELIXIR_BAND_H - DECK_PAD_TOP - DECK_PAD_BOTTOM

const deckInnerW = GAME_WIDTH - DECK_MARGIN_X * 2
const nextWidthRatio = NEXT_SLOT_SCALE
export const CARD_SLOT_W = Math.floor(
  (deckInnerW - (HAND_SLOTS - 1) * CARD_SLOT_GAP - NEXT_HAND_GAP)
  / (HAND_SLOTS + nextWidthRatio),
)

export const NEXT_SLOT_W = Math.round(CARD_SLOT_W * nextWidthRatio)
export const NEXT_SLOT_H = Math.round(CARD_SLOT_H * NEXT_SLOT_SCALE)

const DECK_ROW_WIDTH =
  HAND_SLOTS * CARD_SLOT_W
  + (HAND_SLOTS - 1) * CARD_SLOT_GAP
  + NEXT_HAND_GAP
  + NEXT_SLOT_W

const DECK_ROW_LEFT = (GAME_WIDTH - DECK_ROW_WIDTH) / 2

export const CARD_SELECTED_LIFT = 6

/** Draw avatars slightly inside the slot so frame art isn't clipped. */
const AVATAR_SLOT_FILL = 0.94

/** Crop PNG padding but keep the full portrait frame visible. */
const AVATAR_CROP_RATIO = 0.62

/** Backdrop tile behind raw sprites — sized/tilted like plaques in enemy avatar PNGs. */
export const AVATAR_BACKDROP_SCALE = 0.74
/** Counter-clockwise tilt — matches angled plaques on enemy avatar PNGs. */
export const AVATAR_BACKDROP_ROTATION = -0.26
/** Tighter crop zooms small unit sprites (bomb) to match face size on framed avatars. */
const AVATAR_ON_BACKDROP_CROP_RATIO = 0.48

export function deckCenterY(gameHeight: number): number {
  return gameHeight + ELIXIR_BAND_H + DECK_PAD_TOP + CARD_SLOT_H / 2
}

export function elixirBarY(gameHeight: number): number {
  return gameHeight + 8
}

export function cardIconDisplaySize(): { w: number; h: number } {
  return { w: CARD_SLOT_W * AVATAR_SLOT_FILL, h: CARD_SLOT_H * AVATAR_SLOT_FILL }
}

export function nextIconDisplaySize(): { w: number; h: number } {
  return { w: NEXT_SLOT_W * AVATAR_SLOT_FILL, h: NEXT_SLOT_H * AVATAR_SLOT_FILL }
}

export function applyIconDisplaySize(icon: Phaser.GameObjects.Image, w: number, h: number): void {
  const fw = icon.frame.width
  const fh = icon.frame.height
  if (fw <= 0 || fh <= 0) {
    icon.setDisplaySize(w, h)
    return
  }

  const cropW = fw * AVATAR_CROP_RATIO
  const cropH = fh * AVATAR_CROP_RATIO
  icon.setCrop((fw - cropW) / 2, (fh - cropH) / 2, cropW, cropH)
  icon.setScale(w / cropW, h / cropH)
  icon.setRotation(0)
}

/** Fill slot with a UI backdrop tile (no crop). */
export function applyBackdropDisplaySize(icon: Phaser.GameObjects.Image, w: number, h: number): void {
  const fw = icon.frame.width
  const fh = icon.frame.height
  if (fw > 0 && fh > 0) icon.setCrop(0, 0, fw, fh)
  icon.setDisplaySize(w * AVATAR_BACKDROP_SCALE, h * AVATAR_BACKDROP_SCALE)
  icon.setRotation(AVATAR_BACKDROP_ROTATION)
}

/** Foreground portrait on a backdrop — full slot size, tighter crop than framed avatars. */
export function applyLayeredPortraitDisplaySize(icon: Phaser.GameObjects.Image, w: number, h: number): void {
  const fw = icon.frame.width
  const fh = icon.frame.height
  if (fw <= 0 || fh <= 0) {
    icon.setDisplaySize(w, h)
    return
  }

  const cropW = fw * AVATAR_ON_BACKDROP_CROP_RATIO
  const cropH = fh * AVATAR_ON_BACKDROP_CROP_RATIO
  icon.setCrop((fw - cropW) / 2, (fh - cropH) / 2, cropW, cropH)
  icon.setScale(w / cropW, h / cropH)
  icon.setRotation(0)
}

/** Fit a tall building sprite inside the card slot (full frame, no portrait crop). */
export function applyBuildingAvatarDisplaySize(icon: Phaser.GameObjects.Image, w: number, h: number): void {
  const fw = icon.frame.width
  const fh = icon.frame.height
  if (fw <= 0 || fh <= 0) {
    icon.setDisplaySize(w, h)
    return
  }

  icon.setCrop(0, 0, fw, fh)
  const scale = Math.min(w / fw, h / fh) * 0.94
  icon.setScale(scale)
  icon.setRotation(0)
}

export function handSlotCenterX(_cx: number, index: number): number {
  return DECK_ROW_LEFT + CARD_SLOT_W / 2 + index * (CARD_SLOT_W + CARD_SLOT_GAP)
}

export function nextCardCenterX(_cx: number): number {
  const handEnd = DECK_ROW_LEFT + HAND_SLOTS * (CARD_SLOT_W + CARD_SLOT_GAP) - CARD_SLOT_GAP
  return handEnd + NEXT_HAND_GAP + NEXT_SLOT_W / 2
}

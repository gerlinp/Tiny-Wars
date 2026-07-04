import Phaser from 'phaser'
import { GAME_WIDTH, HUD_HEIGHT } from '@data/GameConstants'
import { getCardAvatarBuildingFit, getCardAvatarCropRatio, getCardAvatarFocusY, getCardAvatarHandScale, AVATAR_CROP_RATIO_DEFAULT } from '@data/AssetManifest'
import { centerCropFillScale, containAvatarScale } from './cardAvatarFit'

export const CINZEL_FONT  = "'Philosopher', Georgia, serif"
export const NUMBER_FONT  = "'Philosopher', Georgia, serif"

/** Maximize avatars within the HUD — row spans the screen, slots fill deck height. */

const HAND_SLOTS = 4
const DECK_MARGIN_X = 14
const CARD_SLOT_GAP = 10
const NEXT_HAND_GAP = 20
const NEXT_SLOT_SCALE = 0.65

export const ELIXIR_BAND_H = 56
export const DECK_PAD_TOP = 4
export const DECK_PAD_BOTTOM = 8

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

export const CARD_SELECTED_LIFT = 16

/** Draw avatars slightly inside the slot so frame art isn't clipped. */
const AVATAR_SLOT_FILL = 0.94

/** Default center crop — zooms portraits to fill the slot (pre-contain hand size). */
export const AVATAR_CROP_RATIO = AVATAR_CROP_RATIO_DEFAULT

/** Backdrop tile behind raw sprites — sized/tilted like plaques in enemy avatar PNGs. */
export const AVATAR_BACKDROP_SCALE = 0.74
/** Counter-clockwise tilt — matches angled plaques on enemy avatar PNGs. */
export const AVATAR_BACKDROP_ROTATION = -0.26
/** Tighter crop zooms small unit sprites (bomb) to match face size on framed avatars. */
export const AVATAR_ON_BACKDROP_CROP_RATIO = 0.48

export function applyHandScale(icon: Phaser.GameObjects.Image, handScale: number): void {
  if (handScale !== 1) {
    icon.setScale(icon.scaleX * handScale, icon.scaleY * handScale)
  }
}

function applyCenterCropFillDisplaySize(
  icon: Phaser.GameObjects.Image,
  w: number,
  h: number,
  cropRatio: number,
  focusY = 0.5,
): void {
  const fw = icon.frame.width
  const fh = icon.frame.height
  if (fw <= 0 || fh <= 0) {
    icon.setDisplaySize(w, h)
    icon.setRotation(0)
    return
  }

  const fit = centerCropFillScale(fw, fh, w, h, cropRatio)
  if ('scale' in fit) {
    icon.setCrop(0, 0, fw, fh)
    icon.setScale(fit.scale)
  } else {
    // focusY shifts the crop window vertically (0 = top, 0.5 = centre, 1 = bottom) so portraits
    // can centre on a subject in the lower part of the frame (e.g. the air boat's hull).
    const cropY = (fh - fit.cropH) * Phaser.Math.Clamp(focusY, 0, 1)
    icon.setCrop((fw - fit.cropW) / 2, cropY, fit.cropW, fit.cropH)
    icon.setScale(fit.scaleX, fit.scaleY)
  }
  icon.setRotation(0)
}

export function deckCenterY(gameHeight: number): number {
  return gameHeight + ELIXIR_BAND_H + DECK_PAD_TOP + CARD_SLOT_H / 2
}

export function elixirBarY(gameHeight: number): number {
  return gameHeight + 26
}

export function cardIconDisplaySize(): { w: number; h: number } {
  return { w: CARD_SLOT_W * AVATAR_SLOT_FILL, h: CARD_SLOT_H * AVATAR_SLOT_FILL }
}

export function nextIconDisplaySize(): { w: number; h: number } {
  return { w: NEXT_SLOT_W * AVATAR_SLOT_FILL, h: NEXT_SLOT_H * AVATAR_SLOT_FILL }
}

export function applyIconDisplaySize(icon: Phaser.GameObjects.Image, w: number, h: number, cropRatio = AVATAR_CROP_RATIO, focusY = 0.5): void {
  applyCenterCropFillDisplaySize(icon, w, h, cropRatio, focusY)
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
export function applyLayeredPortraitDisplaySize(
  icon: Phaser.GameObjects.Image,
  w: number,
  h: number,
  focusY = 0.5,
  cropRatio = AVATAR_ON_BACKDROP_CROP_RATIO,
): void {
  applyCenterCropFillDisplaySize(icon, w, h, cropRatio, focusY)
}

/** Fit a tall building sprite inside the card slot (full frame, no portrait crop). */
export function applyBuildingAvatarDisplaySize(icon: Phaser.GameObjects.Image, w: number, h: number): void {
  const fw = icon.frame.width
  const fh = icon.frame.height
  if (fw <= 0 || fh <= 0) {
    icon.setDisplaySize(w, h)
    icon.setRotation(0)
    return
  }

  icon.setCrop(0, 0, fw, fh)
  icon.setScale(containAvatarScale(fw, fh, w, h) * 0.94)
  icon.setRotation(0)
}

export function handSlotCenterX(_cx: number, index: number): number {
  return DECK_ROW_LEFT + CARD_SLOT_W / 2 + index * (CARD_SLOT_W + CARD_SLOT_GAP)
}

export function nextCardCenterX(_cx: number): number {
  const handEnd = DECK_ROW_LEFT + HAND_SLOTS * (CARD_SLOT_W + CARD_SLOT_GAP) - CARD_SLOT_GAP
  return handEnd + NEXT_HAND_GAP + NEXT_SLOT_W / 2
}

/** Apply the correct display sizing for a non-arrows card avatar icon. */
export function applyCardAvatarIconSize(
  icon: Phaser.GameObjects.Image,
  cardId: string,
  w: number,
  h: number,
  _hasBackdrop: boolean,
): void {
  const focusY = getCardAvatarFocusY(cardId)
  if (getCardAvatarBuildingFit(cardId)) {
    applyBuildingAvatarDisplaySize(icon, w, h)
  } else if (_hasBackdrop) {
    applyLayeredPortraitDisplaySize(icon, w, h, focusY)
  } else {
    applyIconDisplaySize(icon, w, h, getCardAvatarCropRatio(cardId), focusY)
  }
  applyHandScale(icon, getCardAvatarHandScale(cardId))
}

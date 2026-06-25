import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { idleSheetKey, clipAnimKey } from '@data/AssetManifest'

/** Convert a row in the 256px-tall tower/castle PNG to a Y offset from sprite centre. */
function deckRelY(nativeRow: number, canvasHeight = 256): number {
  return nativeRow / canvasHeight - 0.5
}

/** Stone merlon band cropped from the tower PNG and drawn over garrison archers. */
export interface MerlonOverlayCrop {
  y: number
  height: number
}

export const MERLON_OVERLAY: Record<'princess' | 'king', MerlonOverlayCrop> = {
  princess: { y: 58, height: 22 },
  king:     { y: 57, height: 24 },
}

/** Archer placement on tower/castle sprites (fractions of tower display size from centre). */
export interface GarrisonSlot {
  relX: number
  /** Y of the wooden deck where the archer's feet stand (measured from sprite PNG). */
  deckRelY: number
  flipX?: boolean
}

/** Feet row in the archer idle frame (192×192 sheet, frame 0 trim). */
export const GARRISON_ARCHER_FEET_Y = 136 / 192

/** Extra downward nudge applied on top of measured deck rows (fraction of tower height). */
export const GARRISON_DECK_SINK = 0.04

// Wood deck on Knights Tower_Blue.png — row 90 was still visually high; use ~101.
const PRINCESS_GARRISON: GarrisonSlot[] = [
  { relX: 0, deckRelY: deckRelY(101) + GARRISON_DECK_SINK },
]

// Knights Castle_Blue.png — side decks ~97, rear deck ~101.
const KING_GARRISON: GarrisonSlot[] = [
  { relX: -0.28, deckRelY: deckRelY(97) + GARRISON_DECK_SINK },
  { relX: 0, deckRelY: deckRelY(101) + GARRISON_DECK_SINK },
  { relX: 0.28, deckRelY: deckRelY(97) + GARRISON_DECK_SINK, flipX: true },
]

export function garrisonSlots(isKing: boolean): readonly GarrisonSlot[] {
  return isKing ? KING_GARRISON : PRINCESS_GARRISON
}

export function garrisonSheetKey(owner: Owner): string {
  return idleSheetKey('archer', owner)
}

export function garrisonIdleAnimKey(owner: Owner): string {
  return clipAnimKey('archer', owner, 'idle')
}

export function garrisonShootAnimKey(owner: Owner): string {
  return clipAnimKey('archer', owner, 'attack')
}

/** Pick the garrison archer closest to the aim point (screen space). */
export function pickGarrisonArcherIndex(
  archerPositions: readonly Vec2[],
  aim: Vec2,
): number {
  if (archerPositions.length === 0) return 0
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < archerPositions.length; i++) {
    const dx = archerPositions[i].x - aim.x
    const dy = archerPositions[i].y - aim.y
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

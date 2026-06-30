import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import {
  garrisonCannonIdleKey,
  idleSheetKey,
  clipAnimKey,
  resolveGarrisonCannonKey,
} from '@data/AssetManifest'
import {
  BOT_KING_CANNON_ROW,
  CELL_SIZE,
  PLAYER_KING_CANNON_ROW,
} from '@data/GameConstants'
import { targetHeightForCard, targetHeightForTower } from '@rendering/assetDisplaySize'
import { towerRenderX } from '@rendering/towerRenderPosition'

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

export type GarrisonUnit = 'archer' | 'cannon'

/** Troop card whose sprites animate tower garrison archers. */
export const GARRISON_ARCHER_CARD_ID = 'elite_archer'

/** Archer placement on tower/castle sprites (fractions of tower display size from centre). */
export interface GarrisonSlot {
  relX: number
  /** Y of the wooden deck where the unit's feet stand (measured from sprite PNG). */
  deckRelY: number
  flipX?: boolean
  unit?: GarrisonUnit
}

/** Feet row in the archer idle frame (192×192 sheet, frame 0 trim). */
export const GARRISON_ARCHER_FEET_Y = 136 / 192

/** Feet anchor for the 128×128 cannon sheet on the castle deck. */
export const GARRISON_CANNON_FEET_Y = 0.88

/** Extra downward nudge applied on top of measured deck rows (fraction of tower height). */
export const GARRISON_DECK_SINK = 0.04

/** Cannon display scale vs side archers on the king tower. */
export const GARRISON_CANNON_SIZE_MULT = 1.25

/** Muzzle height above feet for tower projectiles spawned from the cannon. */
export const GARRISON_CANNON_MUZZLE_LIFT = 0.42

/** Pause at full recoil scale before snapping back (ms). */
export const GARRISON_CANNON_RECOIL_HOLD_MS = 70

/** @deprecated Use GARRISON_CANNON_RECOIL_HOLD_MS — kept for tower shot timer fallback */
export const GARRISON_CANNON_SHOT_MS = GARRISON_CANNON_RECOIL_HOLD_MS

/** Bomb-card fire — brief scale burst on the garrison cannon. */
export const GARRISON_CANNON_ROCKET_BURST_SCALE = 1.14

/** Kick distance (px) opposite the shot direction. */
export const GARRISON_CANNON_ROCKET_KICK_PX = 5

/** Pirate-tower deck row for bomb-tower crew (fraction of building height from base). */
export const BOMB_TOWER_DECK_Y_FRAC = 0.82

/** Bomb fish feet row in idle frame — matches map-editor garrison archer feet. */
export const BOMB_TOWER_BOMBER_FEET_Y = 136 / 192

/** Troop card whose sprites animate the bomb-tower deck bomber. */
export const BOMB_TOWER_CREW_CARD_ID = 'bomb_fish'

// Wood deck on Knights Tower_Blue.png — row 90 was still visually high; use ~101.
const PRINCESS_GARRISON: GarrisonSlot[] = [
  { relX: 0, deckRelY: deckRelY(101) + GARRISON_DECK_SINK },
]

// Knights Castle_Blue.png — side archers; centre cannon Y comes from map rows.
const KING_GARRISON: GarrisonSlot[] = [
  { relX: -0.28, deckRelY: deckRelY(97) + GARRISON_DECK_SINK },
  { relX: 0, deckRelY: 0, unit: 'cannon' },
  { relX: 0.28, deckRelY: deckRelY(97) + GARRISON_DECK_SINK, flipX: true },
]

export function kingCannonMapRow(owner: Owner): number {
  return owner === Owner.PLAYER ? PLAYER_KING_CANNON_ROW : BOT_KING_CANNON_ROW
}

/** World Y at the centre of the king cannon's map row. */
export function kingCannonDeckWorldY(owner: Owner): number {
  return kingCannonMapRow(owner) * CELL_SIZE + CELL_SIZE / 2
}

export function isKingCannonSlot(isKing: boolean, slot: GarrisonSlot): boolean {
  return isKing && garrisonSlotUnit(slot) === 'cannon'
}

export function garrisonSlots(isKing: boolean): readonly GarrisonSlot[] {
  return isKing ? KING_GARRISON : PRINCESS_GARRISON
}

export function garrisonSlotUnit(slot: GarrisonSlot): GarrisonUnit {
  return slot.unit ?? 'archer'
}

export function garrisonArcherSheetKey(owner: Owner): string {
  return idleSheetKey(GARRISON_ARCHER_CARD_ID, owner)
}

export function garrisonArcherIdleAnimKey(owner: Owner): string {
  return clipAnimKey(GARRISON_ARCHER_CARD_ID, owner, 'idle')
}

export function garrisonArcherShootAnimKey(owner: Owner): string {
  return clipAnimKey(GARRISON_ARCHER_CARD_ID, owner, 'attack')
}

export { garrisonCannonIdleKey, resolveGarrisonCannonKey }

/** Screen-space muzzle for king-tower rocket spells (matches TowerSprite layout). */
export function kingCannonMuzzlePosition(
  towerLogicX: number,
  _towerLogicY: number,
  owner: Owner,
): Vec2 {
  const slot = KING_GARRISON[1]
  const towerW = targetHeightForTower(true)
  const cannonH = targetHeightForCard(GARRISON_ARCHER_CARD_ID) * GARRISON_CANNON_SIZE_MULT
  const rx = towerRenderX(towerLogicX, owner, true)
  const deckY = kingCannonDeckWorldY(owner)
  return {
    x: rx + slot.relX * towerW,
    y: deckY - cannonH * GARRISON_CANNON_MUZZLE_LIFT,
  }
}

/** Pick the garrison unit closest to the aim point (screen space). */
export function pickGarrisonShooterIndex(
  shooterPositions: readonly Vec2[],
  aim: Vec2,
): number {
  if (shooterPositions.length === 0) return 0
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < shooterPositions.length; i++) {
    const dx = shooterPositions[i].x - aim.x
    const dy = shooterPositions[i].y - aim.y
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

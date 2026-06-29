import { Owner } from '@core/types'
import type { TowerSlotPoint } from '@core/AttackSlots'

/** Attack slot offset in cells from the tower slot-origin centre. */
export type { TowerSlotPoint }

export interface PrincessTowerMeleeSideLayout {
  /** Cells from logic anchor — melee hit-zone ring centre (unit editor orange dot). */
  slotOriginOffsetCells: { x: number; y: number }
  slotPositions: TowerSlotPoint[]
}

/** Player princess towers (plyLeft / plyRight) — tuned in unit editor export 2026-06-29. */
export const PLAYER_PRINCESS_TOWER_MELEE: PrincessTowerMeleeSideLayout = {
  slotOriginOffsetCells: { x: 0, y: 1.25 },
  slotPositions: [
    { x: 0, y: -2.9 },
    { x: 0, y: 2.9 },
    { x: -0.85, y: -2.6 },
    { x: 0.85, y: 2.6 },
    { x: -1.6, y: -2.1 },
    { x: 1.6, y: 2.1 },
    { x: -2, y: 1.35 },
    { x: 2, y: -1.35 },
    { x: -1.55, y: 2 },
    { x: 1.55, y: -2 },
    { x: -0.85, y: 2.6 },
    { x: 0.85, y: -2.6 },
    { x: -2.1, y: -1.4 },
    { x: 2.1, y: 1.4 },
    { x: -1.75, y: -0.5 },
    { x: 1.75, y: 0.5 },
    { x: -1.75, y: 0.45 },
    { x: 1.75, y: -0.45 },
  ],
}

/** Bot princess towers (botLeft / botRight) — tuned in unit editor export 2026-06-29. */
export const BOT_PRINCESS_TOWER_MELEE: PrincessTowerMeleeSideLayout = {
  slotOriginOffsetCells: { x: 0, y: -1.55 },
  slotPositions: [
    { x: 0, y: 2.9 },
    { x: 0, y: -2.9 },
    { x: -0.85, y: 2.6 },
    { x: 0.85, y: -2.6 },
    { x: -1.6, y: 2.1 },
    { x: 1.6, y: -2.1 },
    { x: -2, y: -1.35 },
    { x: 2, y: 1.35 },
    { x: -1.55, y: -2 },
    { x: 1.55, y: 2 },
    { x: -0.85, y: -2.6 },
    { x: 0.85, y: 2.6 },
    { x: -2.1, y: 1.4 },
    { x: 2.1, y: -1.4 },
    { x: -1.75, y: 0.5 },
    { x: 1.75, y: -0.5 },
    { x: -1.75, y: -0.45 },
    { x: 1.75, y: 0.45 },
  ],
}

export function princessTowerMeleeLayout(owner: Owner, isKing: boolean): PrincessTowerMeleeSideLayout | null {
  if (isKing) return null
  if (owner === Owner.PLAYER) return PLAYER_PRINCESS_TOWER_MELEE
  if (owner === Owner.BOT) return BOT_PRINCESS_TOWER_MELEE
  return null
}

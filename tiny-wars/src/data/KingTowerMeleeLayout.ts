import { Owner } from '@core/types'
import type { TowerSlotPoint } from '@core/AttackSlots'

/** Attack slot offset in cells from the tower slot-origin centre. */
export type { TowerSlotPoint }

export interface KingTowerMeleeSideLayout {
  /** Cells from logic anchor — melee hit-zone ring centre (unit editor orange dot). */
  slotOriginOffsetCells: { x: number; y: number }
  /** Cells from logic anchor — tower attack range centre (king range ring). */
  rangeCenterOffsetCells: { x: number; y: number }
  slotPositions: TowerSlotPoint[]
}

/** Player king tower (plyKing) — tuned in unit editor export 2026-06-30. */
export const PLAYER_KING_TOWER_MELEE: KingTowerMeleeSideLayout = {
  slotOriginOffsetCells: { x: 0.05, y: -0.2 },
  rangeCenterOffsetCells: { x: 0, y: 7.7 },
  slotPositions: [
    { x: 0, y: -3.45 },
    { x: 0, y: 3.45 },
    { x: -4.7, y: 2.5 },
    { x: 4.7, y: -2.5 },
    { x: -3.85, y: 2.95 },
    { x: 3.85, y: -2.95 },
    { x: -3.05, y: 3.4 },
    { x: 3.05, y: -3.4 },
    { x: -2.05, y: 3.45 },
    { x: 2.05, y: -3.45 },
    { x: -1, y: 3.45 },
    { x: 1, y: -3.45 },
    { x: -5.1, y: 1.7 },
    { x: 5.1, y: -1.7 },
    { x: -5, y: 0.75 },
    { x: 5, y: -0.75 },
    { x: -4.8, y: -0.25 },
    { x: 4.8, y: 0.25 },
    { x: -4.9, y: -1.2 },
    { x: 4.9, y: 1.2 },
    { x: -4.8, y: -2.2 },
    { x: 4.8, y: 2.2 },
    { x: -4.05, y: -2.85 },
    { x: 4.05, y: 2.85 },
    { x: -3.05, y: -3.3 },
    { x: 3.05, y: 3.3 },
    { x: 2, y: 3.4 },
    { x: -2, y: -3.4 },
    { x: 1, y: 3.45 },
    { x: -1, y: -3.45 },
  ],
}

/** Bot king tower (botKing) — tuned in unit editor export 2026-06-30. */
export const BOT_KING_TOWER_MELEE: KingTowerMeleeSideLayout = {
  slotOriginOffsetCells: { x: 0.05, y: 0.2 },
  rangeCenterOffsetCells: { x: 0, y: -7.7 },
  slotPositions: [
    { x: 0, y: 3.45 },
    { x: 0, y: -3.45 },
    { x: -4.7, y: -2.5 },
    { x: 4.7, y: 2.5 },
    { x: -3.85, y: -2.95 },
    { x: 3.85, y: 2.95 },
    { x: -3.05, y: -3.4 },
    { x: 3.05, y: 3.4 },
    { x: -2.05, y: -3.45 },
    { x: 2.05, y: 3.45 },
    { x: -1, y: -3.45 },
    { x: 1, y: 3.45 },
    { x: -5.1, y: -1.7 },
    { x: 5.1, y: 1.7 },
    { x: -5, y: -0.75 },
    { x: 5, y: 0.75 },
    { x: -4.8, y: 0.25 },
    { x: 4.8, y: -0.25 },
    { x: -4.9, y: 1.2 },
    { x: 4.9, y: -1.2 },
    { x: -4.8, y: 2.2 },
    { x: 4.8, y: -2.2 },
    { x: -4.05, y: 2.85 },
    { x: 4.05, y: -2.85 },
    { x: -3.05, y: 3.3 },
    { x: 3.05, y: -3.3 },
    { x: 2, y: -3.4 },
    { x: -2, y: 3.4 },
    { x: 1, y: -3.45 },
    { x: -1, y: 3.45 },
  ],
}

export function kingTowerMeleeLayout(owner: Owner): KingTowerMeleeSideLayout {
  return owner === Owner.PLAYER ? PLAYER_KING_TOWER_MELEE : BOT_KING_TOWER_MELEE
}

import type { TowerSlotPoint } from '@core/AttackSlots'

export interface BombTowerMeleeLayout {
  slotPositions: TowerSlotPoint[]
}

/** Melee surround ring — tuned in unit editor export 2026-06-30 (wood_tower). */
const BOMB_TOWER_SLOT_POSITIONS: readonly TowerSlotPoint[] = [
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
]

export function bombTowerMeleeLayout(): BombTowerMeleeLayout {
  return { slotPositions: [...BOMB_TOWER_SLOT_POSITIONS] }
}

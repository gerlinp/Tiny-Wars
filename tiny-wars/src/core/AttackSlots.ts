import type { Vec2 } from './types'
import { CELL_SIZE } from '@data/GameConstants'

/** Attack slot offset in cells from a layout origin centre. */
export interface TowerSlotPoint {
  x: number
  y: number
}

/**
 * Swarm attack slots — distribute melee attackers around a shared target so they surround
 * it instead of clumping at one approach point. Pure geometry; no game state.
 *
 * Note: Clash Royale (Java reference) has no slot system — troops simply path to the target
 * and stack. This is an intentional Tiny-Wars deviation to spread swarms naturally.
 */

/** Deterministic slot assignment: sort attacker ids so every unit agrees on the ordering. */
export function assignSlotIndex(
  troopId: string,
  allyIds: readonly string[],
): { index: number; total: number } {
  const sorted = [...allyIds].sort()
  const index = sorted.indexOf(troopId)
  return { index: index < 0 ? 0 : index, total: Math.max(1, sorted.length) }
}

/** Angle pointing from the target centre toward the attacker — slots fill the facing side first. */
export function slotBaseAngle(attackerPos: Vec2, center: Vec2): number {
  return Math.atan2(attackerPos.y - center.y, attackerPos.x - center.x)
}

/**
 * World position of one attack slot on a ring around the target.
 * Ring radius mirrors meleeApproachPoint's standoff so a unit parked on its slot is in range.
 */
export function attackSlotPosition(
  center: Vec2,
  targetRadius: number,
  attackerRadius: number,
  rangePx: number,
  index: number,
  total: number,
  baseAngle: number,
  slack = 0,
  minSlots = 1,
): Vec2 {
  const radius = Math.max(0, targetRadius + attackerRadius + rangePx - slack)
  // Use at least minSlots as the angular divisor so a small swarm packs tightly
  // (no large gaps) rather than spreading evenly around the full 360°.
  const divisor = Math.max(total, minSlots)
  const angle = baseAngle + (Math.PI * 2 * index) / Math.max(1, divisor)
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  }
}

/** World position for a custom slot layout (offsets in cells from layout origin). */
export function attackSlotPositionFromLayout(
  originCenter: Vec2,
  index: number,
  slots: readonly TowerSlotPoint[],
): Vec2 {
  if (slots.length === 0) {
    return { x: originCenter.x, y: originCenter.y }
  }
  const i = ((index % slots.length) + slots.length) % slots.length
  const p = slots[i]
  return {
    x: originCenter.x + p.x * CELL_SIZE,
    y: originCenter.y + p.y * CELL_SIZE,
  }
}


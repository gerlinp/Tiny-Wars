import type { Vec2 } from './types'

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
): Vec2 {
  const radius = Math.max(0, targetRadius + attackerRadius + rangePx - slack)
  const angle = baseAngle + (Math.PI * 2 * index) / Math.max(1, total)
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  }
}

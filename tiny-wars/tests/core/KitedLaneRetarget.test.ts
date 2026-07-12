import { describe, it, expect } from 'vitest'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { Troop } from '@core/entities/Troop'
import { AttackType, Owner, UnitType } from '@core/types'
import type { EntityStats } from '@core/types'
import { CELL_SIZE, BRIDGE_CENTER_COL, TROOP_SPAWN_DELAY_MS } from '@data/GameConstants'

const meleeStats: EntityStats = {
  maxHp: 100000,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 0.7,
  unitType: UnitType.GROUND,
  attackType: AttackType.AIR_AND_GROUND,
}

/** March objective x for the given troop (attack goal of its structure target). */
function objectiveX(troop: Troop, sim: GameSimulator): number {
  const info = troop.getDevInfo(sim.state)
  const goal = info.targetPos ?? info.marchGoal
  expect(goal).not.toBeNull()
  return goal!.x
}

describe('kited troops re-evaluate their lane', () => {
  it('a troop dragged across the arena marches to the near side tower, not its spawn lane', () => {
    const grid = new Grid()
    const sim = new GameSimulator(grid)
    const centerX = BRIDGE_CENTER_COL * CELL_SIZE

    // Spawn on the LEFT lane (player side, below the river).
    const troop = new Troop(
      Owner.PLAYER, meleeStats, { x: 3.5 * CELL_SIZE, y: 20.5 * CELL_SIZE }, grid, 'skeleton',
    )
    sim.state.entities.set(troop.id, troop)
    troop.tick(TROOP_SPAWN_DELAY_MS + 1, sim.state)
    troop.tick(50, sim.state)
    expect(objectiveX(troop, sim)).toBeLessThan(centerX)

    // Kite: the unit ends up far on the RIGHT side of its own half.
    troop.position.x = 15.5 * CELL_SIZE
    troop.position.y = 20.5 * CELL_SIZE
    for (let i = 0; i < 10; i++) troop.tick(50, sim.state)

    // It must now march toward the right-side tower — not walk back to the left lane.
    expect(objectiveX(troop, sim)).toBeGreaterThan(centerX)
  })
})

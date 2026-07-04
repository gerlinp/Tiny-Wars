import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { AttackType, Owner, UnitType } from '@core/types'
import type { EntityStats } from '@core/types'
import { CELL_SIZE, TROOP_SPAWN_DELAY_MS } from '@data/GameConstants'

const meleeStats: EntityStats = {
  maxHp: 1000,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 0.7,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

const tankStats: EntityStats = { ...meleeStats, maxHp: 100000 }

function clearSpawnFreeze(troop: Troop, state: ReturnType<typeof createInitialGameState>) {
  troop.tick(TROOP_SPAWN_DELAY_MS + 1, state)
}

describe('swarm surround stability', () => {
  it('attackers spread to distinct slots and keep them across ticks', () => {
    const grid = new Grid()
    const state = createInitialGameState()
    const victim = new Troop(Owner.BOT, tankStats, { x: 450, y: 1000 }, grid, 'warrior')
    state.entities.set(victim.id, victim)

    const swarm = [
      new Troop(Owner.PLAYER, meleeStats, { x: 380, y: 1100 }, grid, 'skeleton'),
      new Troop(Owner.PLAYER, meleeStats, { x: 450, y: 1110 }, grid, 'skeleton'),
      new Troop(Owner.PLAYER, meleeStats, { x: 520, y: 1100 }, grid, 'skeleton'),
    ]
    for (const unit of swarm) {
      state.entities.set(unit.id, unit)
      clearSpawnFreeze(unit, state)
    }
    for (const unit of swarm) unit.tick(33, state)

    // Each attacker claims its own slot around the shared target.
    const claims = swarm.map(u => u.slotClaimIndex)
    expect(new Set(claims).size).toBe(swarm.length)
    expect(claims.every(c => c >= 0)).toBe(true)
    expect(swarm.every(u => u.slotClaimTargetId === victim.id)).toBe(true)

    // Claims stay stable while the swarm closes in (no per-tick churn).
    for (let i = 0; i < 10; i++) for (const unit of swarm) unit.tick(33, state)
    expect(swarm.map(u => u.slotClaimIndex)).toEqual(claims)
  })
})

describe('stuck recovery escalation', () => {
  it('a boxed-in unit escapes to walkable ground instead of sticking forever', () => {
    const grid = new Grid()
    // Wall off a pocket around cell (9, 20) — unit inside, goal far below.
    const pocket = { col: 9, row: 20 }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        grid.blockCell(pocket.col + dc, pocket.row + dr)
      }
    }

    const state = createInitialGameState()
    const start = grid.cellToWorld(pocket.col, pocket.row)
    const unit = new Troop(Owner.PLAYER, meleeStats, { ...start }, grid, 'warrior')
    const prey = new Troop(Owner.BOT, tankStats, { x: start.x, y: start.y + 4 * CELL_SIZE }, grid, 'warrior')
    state.entities.set(unit.id, unit)
    state.entities.set(prey.id, prey)
    clearSpawnFreeze(unit, state)

    // Tick well past several stuck-recovery windows (600ms each, escalating).
    for (let i = 0; i < 120; i++) unit.tick(33, state)

    const cell = grid.worldToCell(unit.position.x, unit.position.y)
    expect(grid.isWalkable(cell.x, cell.y)).toBe(true)
    // Level-2 recovery snaps out of the pocket — the unit must not still be inside it.
    const stillInPocket = cell.x === pocket.col && cell.y === pocket.row
    expect(stillInPocket).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { refreshStickyTarget } from '@core/TargetSelection'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'

const troopStats: EntityStats = {
  maxHp: 500,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('refreshStickyTarget', () => {
  const grid = new Grid()
  const from = { x: 100, y: 100 }

  it('returns the current target while it is alive', () => {
    const far = new Troop(Owner.BOT, troopStats, { x: 220, y: 100 }, grid, 'warrior')
    const near = new Troop(Owner.BOT, troopStats, { x: 130, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(far.id, far)
    state.entities.set(near.id, near)

    const picked = refreshStickyTarget(far, state, {
      owner: Owner.PLAYER,
      from,
      distance: (a, b) => Math.hypot(a.x - b.position.x, a.y - b.position.y),
    })

    expect(picked?.id).toBe(far.id)
  })

  it('picks the closest enemy when there is no current target', () => {
    const far = new Troop(Owner.BOT, troopStats, { x: 220, y: 100 }, grid, 'warrior')
    const near = new Troop(Owner.BOT, troopStats, { x: 130, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(far.id, far)
    state.entities.set(near.id, near)

    const picked = refreshStickyTarget(null, state, {
      owner: Owner.PLAYER,
      from,
      distance: (a, b) => Math.hypot(a.x - b.position.x, a.y - b.position.y),
    })

    expect(picked?.id).toBe(near.id)
  })

  it('picks the closest enemy when the current target is dead', () => {
    const dead = new Troop(Owner.BOT, troopStats, { x: 120, y: 100 }, grid, 'warrior')
    dead.hp = 0
    const next = new Troop(Owner.BOT, troopStats, { x: 200, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(dead.id, dead)
    state.entities.set(next.id, next)

    const picked = refreshStickyTarget(dead, state, {
      owner: Owner.PLAYER,
      from,
      distance: (a, b) => Math.hypot(a.x - b.position.x, a.y - b.position.y),
    })

    expect(picked?.id).toBe(next.id)
  })
})

import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { circlesOverlap, separateCirclePair, troopCollisionRadius } from '@core/EntityGeometry'
import { resolveTroopCollisions } from '@core/TroopCollision'
import { crSpeedToCellsPerSec, CR_SPEED } from '@data/GameConstants'

const slowStats: EntityStats = {
  maxHp: 500,
  speed: crSpeedToCellsPerSec(CR_SPEED.medium),
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

const fastStats: EntityStats = {
  ...slowStats,
  speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
}

describe('TroopCollision', () => {
  const grid = new Grid()

  it('separates overlapping ground troops', () => {
    const a = new Troop(Owner.PLAYER, slowStats, { x: 200, y: 500 }, grid, 'warrior')
    const b = new Troop(Owner.BOT, slowStats, { x: 200, y: 500 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(a.id, a)
    state.entities.set(b.id, b)

    resolveTroopCollisions(state, 33)

    const r = troopCollisionRadius(a)
    expect(circlesOverlap(a.position, r, b.position, r)).toBe(false)
  })

  it('pushes a slower ally forward when a faster unit is behind', () => {
    const slow = new Troop(Owner.PLAYER, slowStats, { x: 200, y: 500 }, grid, 'warrior')
    const fast = new Troop(Owner.PLAYER, fastStats, { x: 200, y: 512 }, grid, 'torch_goblin')
    const state = createInitialGameState()
    state.entities.set(slow.id, slow)
    state.entities.set(fast.id, fast)

    const beforeY = slow.position.y
    resolveTroopCollisions(state, 200)

    expect(slow.position.y).toBeLessThan(beforeY)
  })

  it('still separates overlapping enemy troops', () => {
    const front = new Troop(Owner.PLAYER, slowStats, { x: 200, y: 500 }, grid, 'warrior')
    const behind = new Troop(Owner.BOT, fastStats, { x: 200, y: 500 }, grid, 'torch_goblin')
    const state = createInitialGameState()
    state.entities.set(front.id, front)
    state.entities.set(behind.id, behind)

    const rFront = troopCollisionRadius(front)
    const rBehind = troopCollisionRadius(behind)
    expect(circlesOverlap(front.position, rFront, behind.position, rBehind)).toBe(true)

    resolveTroopCollisions(state, 200)

    expect(circlesOverlap(front.position, rFront, behind.position, rBehind)).toBe(false)
  })
})

describe('separateCirclePair', () => {
  it('fully separates two overlapping circles when split evenly', () => {
    const r = 7
    const a = { x: 100, y: 100 }
    const b = { x: 105, y: 100 }

    separateCirclePair(a, r, b, r, 0.5)

    const dx = a.x - b.x
    const dy = a.y - b.y
    expect(dx * dx + dy * dy).toBeGreaterThanOrEqual((r + r) * (r + r) - 0.01)
  })
})

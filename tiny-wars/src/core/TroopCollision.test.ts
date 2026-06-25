import { describe, it, expect } from 'vitest'
import { Troop } from './entities/Troop'
import { Grid } from './Grid'
import { createInitialGameState } from './GameState'
import { Owner, UnitType, AttackType } from './types'
import type { EntityStats } from './types'
import { boxesOverlap, entityHalfExtents, separateBoxPair } from './EntityGeometry'
import { resolveTroopCollisions } from './TroopCollision'
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

    const half = entityHalfExtents(a)
    expect(boxesOverlap(a.position, half, b.position, half)).toBe(false)
  })

  it('pushes a slower ally forward when a faster unit is behind', () => {
    const slow = new Troop(Owner.PLAYER, slowStats, { x: 200, y: 500 }, grid, 'warrior')
    const fast = new Troop(Owner.PLAYER, fastStats, { x: 200, y: 520 }, grid, 'torch_goblin')
    const state = createInitialGameState()
    state.entities.set(slow.id, slow)
    state.entities.set(fast.id, fast)

    const beforeY = slow.position.y
    resolveTroopCollisions(state, 200)

    expect(slow.position.y).toBeLessThan(beforeY)
  })

  it('still separates overlapping enemy troops', () => {
    const front = new Troop(Owner.PLAYER, slowStats, { x: 200, y: 500 }, grid, 'warrior')
    const behind = new Troop(Owner.BOT, fastStats, { x: 230, y: 518 }, grid, 'torch_goblin')
    const state = createInitialGameState()
    state.entities.set(front.id, front)
    state.entities.set(behind.id, behind)

    const halfFront = entityHalfExtents(front)
    const halfBehind = entityHalfExtents(behind)
    expect(boxesOverlap(front.position, halfFront, behind.position, halfBehind)).toBe(true)

    resolveTroopCollisions(state, 200)

    expect(boxesOverlap(front.position, halfFront, behind.position, halfBehind)).toBe(false)
  })
})

describe('separateBoxPair', () => {
  it('fully separates two overlapping boxes when split evenly', () => {
    const half = { halfW: 10, halfH: 10 }
    const a = { x: 100, y: 100 }
    const b = { x: 105, y: 100 }

    separateBoxPair(a, half, b, half, 0.5)

    expect(boxesOverlap(a, half, b, half)).toBe(false)
  })
})

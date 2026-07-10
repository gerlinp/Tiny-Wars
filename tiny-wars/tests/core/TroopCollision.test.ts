import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { circlesOverlap, separateCirclePair, troopCollisionRadius } from '@core/EntityGeometry'
import { resolveTroopCollisions } from '@core/TroopCollision'
import { crSpeedToCellsPerSec, CR_SPEED } from '@data/GameConstants'
import { CARD_DEFINITIONS } from '@data/CardData'

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

  it('spreads overlapping ground troops apart (soft separation)', () => {
    const a = new Troop(Owner.PLAYER, slowStats, { x: 200, y: 500 }, grid, 'warrior')
    const b = new Troop(Owner.BOT, slowStats, { x: 201, y: 500 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(a.id, a)
    state.entities.set(b.id, b)

    const before = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)
    resolveTroopCollisions(state, 33)
    const after = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)

    const r = troopCollisionRadius(a)
    // Soft separation pushes them apart toward (but not necessarily fully to) the rest distance.
    expect(after).toBeGreaterThan(before)
    expect(after).toBeGreaterThan((r + r) * 0.95)
  })

  it('pushes a slower ally forward when a faster unit is behind', () => {
    const slow = new Troop(Owner.PLAYER, slowStats, { x: 200, y: 500 }, grid, 'warrior')
    const fast = new Troop(Owner.PLAYER, fastStats, { x: 200, y: 510 }, grid, 'fire_goblin')
    const state = createInitialGameState()
    state.entities.set(slow.id, slow)
    state.entities.set(fast.id, fast)

    const beforeY = slow.position.y
    resolveTroopCollisions(state, 200)

    expect(slow.position.y).toBeLessThan(beforeY)
  })

  it('softly separates overlapping enemy melee troops (no hard body-block)', () => {
    const front = new Troop(Owner.PLAYER, slowStats, { x: 200, y: 500 }, grid, 'warrior')
    const behind = new Troop(Owner.BOT, slowStats, { x: 201, y: 500 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(front.id, front)
    state.entities.set(behind.id, behind)

    const rFront = troopCollisionRadius(front)
    const rBehind = troopCollisionRadius(behind)
    expect(circlesOverlap(front.position, rFront, behind.position, rBehind)).toBe(true)

    resolveTroopCollisions(state, 200)

    // Enemies use the soft separation fraction too: they are pushed nearly fully apart rather
    // than rigidly snapped to exactly the rest distance.
    const dist = Math.hypot(front.position.x - behind.position.x, front.position.y - behind.position.y)
    expect(dist).toBeGreaterThan((rFront + rBehind) * 0.95)
  })

  it('does not push ranged troops away from overlapping enemy melee', () => {
    const warrior = new Troop(Owner.PLAYER, slowStats, { x: 200, y: 500 }, grid, 'warrior')
    const torchStats = CARD_DEFINITIONS.fire_goblin!.stats!
    const torch = new Troop(Owner.BOT, torchStats, { x: 200, y: 500 }, grid, 'fire_goblin')
    const state = createInitialGameState()
    state.entities.set(warrior.id, warrior)
    state.entities.set(torch.id, torch)

    const rWarrior = troopCollisionRadius(warrior)
    const rTorch = troopCollisionRadius(torch)
    expect(circlesOverlap(warrior.position, rWarrior, torch.position, rTorch)).toBe(true)

    resolveTroopCollisions(state, 200)

    expect(circlesOverlap(warrior.position, rWarrior, torch.position, rTorch)).toBe(true)
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

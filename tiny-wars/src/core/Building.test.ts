import { describe, it, expect } from 'vitest'
import { Building } from './entities/Building'
import { createInitialGameState } from './GameState'
import { Owner, UnitType, AttackType } from './types'
import type { EntityStats } from './types'
import { BUILDING_LIFETIME_MS } from '@data/GameConstants'

const WOOD_TOWER_STATS: EntityStats = {
  maxHp: 800,
  speed: 0,
  damage: 210,
  attackRate: 1.5,
  attackRange: 6.0,
  unitType: UnitType.GROUND,
  attackType: AttackType.AIR_AND_GROUND,
  lifetimeMs: BUILDING_LIFETIME_MS,
}

describe('Building lifetime decay', () => {
  it('loses HP over time even without combat', () => {
    const building = new Building(Owner.PLAYER, WOOD_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const state = createInitialGameState()

    building.tick(BUILDING_LIFETIME_MS / 2, state)

    expect(building.hp).toBeLessThan(800)
    expect(building.hp).toBeCloseTo(400, -1)
    expect(building.isAlive).toBe(true)
  })

  it('expires when lifetime runs out', () => {
    const building = new Building(Owner.PLAYER, WOOD_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const state = createInitialGameState()

    building.tick(BUILDING_LIFETIME_MS + 100, state)

    expect(building.hp).toBe(0)
    expect(building.isAlive).toBe(false)
  })

  it('combat damage stacks with lifetime decay', () => {
    const building = new Building(Owner.PLAYER, WOOD_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const state = createInitialGameState()

    building.takeDamage(500)
    building.tick(BUILDING_LIFETIME_MS / 4, state)

    expect(building.hp).toBeLessThanOrEqual(300)
    expect(building.isAlive).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { Troop } from './entities/Troop'
import { Building } from './entities/Building'
import { Grid } from './Grid'
import { createInitialGameState } from './GameState'
import { Owner, UnitType, AttackType } from './types'
import type { EntityStats } from './types'
import { BOMB_TOWER_LIFETIME_MS } from '@data/GameConstants'

const troopStats: EntityStats = {
  maxHp: 500,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

const BOMB_TOWER_STATS: EntityStats = {
  maxHp: 1356,
  speed: 0,
  damage: 222,
  attackRate: 1 / 1.8,
  attackRange: 6.0,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
  splashRadius: 1.5,
  deathSplashRadius: 3,
  lifetimeMs: BOMB_TOWER_LIFETIME_MS,
}

describe('Troop targeting', () => {
  const grid = new Grid()

  it('retargets to a closer troop while walking toward a building', () => {
    const warrior = new Troop(Owner.PLAYER, troopStats, { x: 200, y: 500 }, grid, 'warrior')
    const building = new Building(Owner.BOT, BOMB_TOWER_STATS, { x: 350, y: 500 }, 'wood_tower')
    const nearerTroop = new Troop(Owner.BOT, troopStats, { x: 260, y: 500 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(warrior.id, warrior)
    state.entities.set(building.id, building)
    state.entities.set(nearerTroop.id, nearerTroop)

    warrior.tick(33, state)

    const targetPos = warrior.getDevInfo(state).targetPos
    expect(targetPos?.x).toBeCloseTo(260, 0)
    expect(targetPos?.y).toBeCloseTo(500, 0)
  })

  it('switches to a closer enemy while marching but not yet in attack range', () => {
    const warrior = new Troop(Owner.PLAYER, troopStats, { x: 100, y: 100 }, grid, 'warrior')
    const far = new Troop(Owner.BOT, troopStats, { x: 200, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(warrior.id, warrior)
    state.entities.set(far.id, far)

    warrior.tick(33, state)

    const near = new Troop(Owner.BOT, troopStats, { x: 130, y: 100 }, grid, 'warrior')
    state.entities.set(near.id, near)
    warrior.tick(33, state)

    const targetPos = warrior.getDevInfo(state).targetPos
    expect(targetPos?.x).toBeCloseTo(130, 0)
  })

  it('keeps attacking the current target once in melee range', () => {
    const warrior = new Troop(Owner.PLAYER, troopStats, { x: 100, y: 100 }, grid, 'warrior')
    const far = new Troop(Owner.BOT, troopStats, { x: 115, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(warrior.id, warrior)
    state.entities.set(far.id, far)

    warrior.tick(1000, state)
    const farHpAfter = far.hp
    expect(farHpAfter).toBeLessThan(troopStats.maxHp)

    const near = new Troop(Owner.BOT, troopStats, { x: 105, y: 100 }, grid, 'warrior')
    state.entities.set(near.id, near)
    warrior.tick(1000, state)

    expect(far.hp).toBeLessThan(farHpAfter)
    expect(near.hp).toBe(troopStats.maxHp)
  })
})

import { describe, it, expect } from 'vitest'
import { Building } from '@core/entities/Building'
import { Troop } from '@core/entities/Troop'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { Grid } from '@core/Grid'

const BOMB_TOWER_STATS = CARD_DEFINITIONS.wood_tower!.stats!

const AIR_STATS: EntityStats = {
  maxHp: 500,
  speed: 2,
  damage: 50,
  attackRate: 1,
  attackRange: 3.5,
  unitType: UnitType.AIR,
  attackType: AttackType.AIR_AND_GROUND,
  splashRadius: 2.5,
}

const GROUND_STATS: EntityStats = {
  maxHp: 500,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('Bomb Tower ground-only targeting', () => {
  it('card stats are ground-only', () => {
    expect(BOMB_TOWER_STATS.attackType).toBe(AttackType.GROUND_ONLY)
  })

  it('ignores air troops and attacks ground in range', () => {
    const grid = new Grid()
    const building = new Building(Owner.PLAYER, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const air = new Troop(Owner.BOT, AIR_STATS, { x: 200, y: 540 }, grid, 'lizard')
    const ground = new Troop(Owner.BOT, GROUND_STATS, { x: 200, y: 580 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(building.id, building)
    state.entities.set(air.id, air)
    state.entities.set(ground.id, ground)

    for (let i = 0; i < 120 && ground.hp === GROUND_STATS.maxHp; i++) {
      building.tick(50, state)
    }

    expect(air.hp).toBe(AIR_STATS.maxHp)
    expect(ground.hp).toBeLessThan(GROUND_STATS.maxHp)
  })

  it('does not splash damage onto air troops near a ground target', () => {
    const grid = new Grid()
    const building = new Building(Owner.PLAYER, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const ground = new Troop(Owner.BOT, GROUND_STATS, { x: 200, y: 580 }, grid, 'warrior')
    const air = new Troop(Owner.BOT, AIR_STATS, { x: 215, y: 580 }, grid, 'lizard')
    const state = createInitialGameState()
    state.entities.set(building.id, building)
    state.entities.set(ground.id, ground)
    state.entities.set(air.id, air)

    for (let i = 0; i < 120 && ground.hp === GROUND_STATS.maxHp; i++) {
      building.tick(50, state)
    }

    expect(ground.hp).toBeLessThan(GROUND_STATS.maxHp)
    expect(air.hp).toBe(AIR_STATS.maxHp)
  })

  it('stays idle when only air is in range', () => {
    const grid = new Grid()
    const building = new Building(Owner.PLAYER, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const air = new Troop(Owner.BOT, AIR_STATS, { x: 200, y: 580 }, grid, 'lizard')
    const state = createInitialGameState()
    state.entities.set(building.id, building)
    state.entities.set(air.id, air)

    building.tick(2000, state)

    expect(air.hp).toBe(AIR_STATS.maxHp)
    expect(building.state).toBe('IDLE')
  })

  it('death bomb only damages ground troops in radius', () => {
    const grid = new Grid()
    const building = new Building(Owner.PLAYER, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const air = new Troop(Owner.BOT, AIR_STATS, { x: 200, y: 520 }, grid, 'lizard')
    const ground = new Troop(Owner.BOT, GROUND_STATS, { x: 200, y: 520 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(air.id, air)
    state.entities.set(ground.id, ground)

    building.applyDeathSplash(state)

    expect(air.hp).toBe(AIR_STATS.maxHp)
    expect(ground.hp).toBeLessThan(GROUND_STATS.maxHp)
  })
})

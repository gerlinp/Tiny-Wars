import { describe, it, expect } from 'vitest'
import { Building } from '@core/entities/Building'
import { Troop } from '@core/entities/Troop'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { BOMB_TOWER_LIFETIME_MS } from '@data/GameConstants'
import { Grid } from '@core/Grid'

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

const MELEE_STATS: EntityStats = {
  maxHp: 300,
  speed: 2,
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('Building lifetime decay', () => {
  it('loses HP over time even without combat', () => {
    const building = new Building(Owner.PLAYER, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const state = createInitialGameState()

    building.tick(BOMB_TOWER_LIFETIME_MS / 2, state)

    expect(building.hp).toBeLessThan(1356)
    expect(building.hp).toBeCloseTo(678, -1)
    expect(building.isAlive).toBe(true)
  })

  it('expires when lifetime runs out', () => {
    const building = new Building(Owner.PLAYER, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const state = createInitialGameState()

    building.tick(BOMB_TOWER_LIFETIME_MS + 100, state)

    expect(building.hp).toBe(0)
    expect(building.isAlive).toBe(false)
  })

  it('combat damage stacks with lifetime decay', () => {
    const building = new Building(Owner.PLAYER, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const state = createInitialGameState()

    building.takeDamage(500)
    building.tick(BOMB_TOWER_LIFETIME_MS / 4, state)

    expect(building.hp).toBeLessThanOrEqual(856)
    expect(building.isAlive).toBe(true)
  })
})

describe('Bomb Tower combat', () => {
  it('splashes ground troops near the primary target', () => {
    const grid = new Grid()
    const building = new Building(Owner.PLAYER, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const primary = new Troop(Owner.BOT, MELEE_STATS, { x: 200, y: 580 }, grid, 'pawn')
    const nearby = new Troop(Owner.BOT, MELEE_STATS, { x: 215, y: 580 }, grid, 'pawn')
    const state = createInitialGameState()
    state.entities.set(building.id, building)
    state.entities.set(primary.id, primary)
    state.entities.set(nearby.id, nearby)

    building.tick(2000, state)

    expect(primary.hp).toBeLessThan(MELEE_STATS.maxHp)
    expect(nearby.hp).toBeLessThan(MELEE_STATS.maxHp)
  })

  it('drops a death bomb when destroyed', () => {
    const grid = new Grid()
    const building = new Building(Owner.PLAYER, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const victim = new Troop(Owner.BOT, MELEE_STATS, { x: 200, y: 520 }, grid, 'pawn')
    const state = createInitialGameState()
    state.entities.set(victim.id, victim)

    building.applyDeathSplash(state)

    expect(victim.hp).toBeLessThan(MELEE_STATS.maxHp)
    expect(state.events.some(e => e.type === 'DAMAGE')).toBe(true)
  })

  it('exposes aim point while attacking a target', () => {
    const grid = new Grid()
    const building = new Building(Owner.PLAYER, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const target = new Troop(Owner.BOT, MELEE_STATS, { x: 200, y: 580 }, grid, 'pawn')
    const state = createInitialGameState()
    state.entities.set(building.id, building)
    state.entities.set(target.id, target)

    expect(building.getAttackAimPoint()).toBeNull()

    building.tick(2000, state)

    expect(building.getAttackAimPoint()).toEqual({ x: 200, y: 580 })
  })
})

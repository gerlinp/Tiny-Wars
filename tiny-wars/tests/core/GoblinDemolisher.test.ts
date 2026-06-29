import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Building } from '@core/entities/Building'
import { resolveDeaths } from '@core/CombatSystem'
import { createInitialGameState } from '@core/GameState'
import type { EntityStats } from '@core/types'
import { Owner, UnitType, AttackType } from '@core/types'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { edgeDistBetweenEntities } from '@core/EntityGeometry'
import { BOMB_TOWER_LIFETIME_MS, CELL_SIZE } from '@data/GameConstants'
import { CARD_DEFINITIONS } from '@data/CardData'

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

const WARRIOR_STATS: EntityStats = {
  maxHp: 2332,
  speed: 1.5,
  damage: 267,
  attackRate: 1 / 1.2,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('Goblin Demolisher', () => {
  const grid = new Grid()
  const stats = CARD_DEFINITIONS.goblin_demolisher!.stats!

  it('deploys a single unit with CR-style charge threshold', () => {
    expect(CARD_DEFINITIONS.goblin_demolisher!.deployCount).toBe(1)
    expect(stats.buildingChargeHpFraction).toBe(0.5)
    expect(stats.maxHp).toBe(1300)
    expect(stats.deathSplashRadius).toBe(2.5)
    expect(stats.deathSplashDamage).toBe(614)
    expect(stats.buildingChargeAttackRange).toBe(1.0)
    expect(stats.attackRange).toBe(5.0)
  })

  it('enters charge mode at exactly half HP (CR 50% activation)', () => {
    const demolisher = new Troop(
      Owner.PLAYER,
      stats,
      { x: 200, y: 500 },
      grid,
      'goblin_demolisher',
    )

    demolisher.hp = 651
    expect(demolisher.inBuildingChargeMode()).toBe(false)
    expect(demolisher.getEffectiveSpeed()).toBe(stats.speed)

    demolisher.hp = 650
    expect(demolisher.inBuildingChargeMode()).toBe(true)
    expect(demolisher.getEffectiveSpeed()).toBe(stats.speed)
    expect(demolisher.isBuildingChargeRunActive()).toBe(false)
  })

  it('clamps HP at half and ignores overflow damage until the charge run starts', () => {
    const building = new Building(Owner.BOT, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const demolisher = new Troop(
      Owner.PLAYER,
      stats,
      { x: 200 + CELL_SIZE * 4, y: 500 },
      grid,
      'goblin_demolisher',
    )
    const halfHp = Math.floor(demolisher.maxHp * 0.5)

    demolisher.hp = 700
    demolisher.takeDamage(200)
    expect(demolisher.hp).toBe(halfHp)
    expect(demolisher.inBuildingChargeMode()).toBe(true)

    demolisher.takeDamage(500)
    expect(demolisher.hp).toBe(halfHp)

    const state = createInitialGameState()
    state.entities.set(building.id, building)
    state.entities.set(demolisher.id, demolisher)

    for (let i = 0; i < 60 && !demolisher.isBuildingChargeRunActive(); i++) {
      demolisher.tick(33, state)
    }

    expect(demolisher.isBuildingChargeRunActive()).toBe(true)
    expect(demolisher.getEffectiveSpeed()).toBe(stats.buildingChargeSpeed)

    demolisher.takeDamage(50)
    expect(demolisher.hp).toBeLessThan(halfHp)
  })

  it('does not suicide while above half health', () => {
    const building = new Building(Owner.BOT, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const demolisher = new Troop(
      Owner.PLAYER,
      stats,
      { x: 200 + CELL_SIZE * 4, y: 500 },
      grid,
      'goblin_demolisher',
    )
    const state = createInitialGameState()
    state.entities.set(building.id, building)
    state.entities.set(demolisher.id, demolisher)

    for (let i = 0; i < 120; i++) {
      demolisher.tick(33, state)
      building.tick(33, state)
      resolveDeaths(state)
      if (!state.entities.has(demolisher.id)) break
    }

    expect(state.entities.has(demolisher.id)).toBe(true)
  })

  it('detonates on building contact when below half health', () => {
    const building = new Building(Owner.BOT, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const demolisher = new Troop(
      Owner.PLAYER,
      stats,
      { x: 200 + CELL_SIZE * 1.1, y: 500 },
      grid,
      'goblin_demolisher',
    )
    demolisher.hp = Math.floor(demolisher.maxHp * 0.4)

    const state = createInitialGameState()
    state.entities.set(building.id, building)
    state.entities.set(demolisher.id, demolisher)

    const hpBefore = building.hp
    for (let i = 0; i < 200 && state.entities.has(demolisher.id); i++) {
      demolisher.tick(33, state)
      building.tick(33, state)
      resolveDeaths(state)
    }

    expect(state.entities.has(demolisher.id)).toBe(false)
    expect(building.hp).toBeLessThan(hpBefore)
  })

  it('explodes on death when killed during charge mode', () => {
    const warrior = new Troop(Owner.BOT, WARRIOR_STATS, { x: 220, y: 500 }, grid, 'warrior')
    const demolisher = new Troop(
      Owner.PLAYER,
      stats,
      { x: 200, y: 500 },
      grid,
      'goblin_demolisher',
    )
    demolisher.hp = Math.floor(demolisher.maxHp * 0.4)

    const state = createInitialGameState()
    state.entities.set(warrior.id, warrior)
    state.entities.set(demolisher.id, demolisher)

    demolisher.takeDamage(demolisher.hp)
    resolveDeaths(state)

    expect(state.entities.has(demolisher.id)).toBe(false)
    expect(warrior.hp).toBeLessThan(WARRIOR_STATS.maxHp)
  })

  it('charges a tower after dropping below half health', () => {
    const sim = new GameSimulator(grid)
    const botTower = [...sim.state.towers.values()].find(t => t.owner === Owner.BOT && !t.isKing)!
    const demolisher = new Troop(
      Owner.PLAYER,
      stats,
      { x: botTower.position.x, y: botTower.position.y + CELL_SIZE * 2 },
      grid,
      'goblin_demolisher',
    )
    demolisher.hp = Math.floor(demolisher.maxHp * 0.4)
    sim.state.entities.set(demolisher.id, demolisher)

    const hpBefore = botTower.hp
    for (let i = 0; i < 1200 && sim.state.entities.has(demolisher.id); i++) {
      sim.tick(33)
    }

    expect(sim.state.entities.has(demolisher.id)).toBe(false)
    expect(botTower.hp).toBeLessThan(hpBefore)
  })

  it('death explosion splashes nearby troops on structure contact', () => {
    const building = new Building(Owner.BOT, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const nearby = new Troop(Owner.BOT, WARRIOR_STATS, { x: 210, y: 500 }, grid, 'warrior')
    const demolisher = new Troop(
      Owner.PLAYER,
      stats,
      { x: 200 + CELL_SIZE * 1.1, y: 500 },
      grid,
      'goblin_demolisher',
    )
    demolisher.hp = Math.floor(demolisher.maxHp * 0.4)

    const state = createInitialGameState()
    state.entities.set(building.id, building)
    state.entities.set(nearby.id, nearby)
    state.entities.set(demolisher.id, demolisher)

    for (let i = 0; i < 200 && state.entities.has(demolisher.id); i++) {
      demolisher.tick(33, state)
      building.tick(33, state)
      nearby.tick(33, state)
      resolveDeaths(state)
    }

    expect(state.entities.has(demolisher.id)).toBe(false)
    expect(nearby.hp).toBeLessThan(WARRIOR_STATS.maxHp)
  })

  it('reaches a building from several cells away without stalling in charge mode', () => {
    const building = new Building(Owner.BOT, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const demolisher = new Troop(
      Owner.PLAYER,
      stats,
      { x: 200, y: 500 + CELL_SIZE * 6 },
      grid,
      'goblin_demolisher',
    )
    demolisher.hp = Math.floor(demolisher.maxHp * 0.4)

    const state = createInitialGameState()
    state.entities.set(building.id, building)
    state.entities.set(demolisher.id, demolisher)

    const hpBefore = building.hp
    let lastDist = Infinity
    let stagnantTicks = 0
    for (let i = 0; i < 1800 && state.entities.has(demolisher.id); i++) {
      demolisher.tick(33, state)
      building.tick(33, state)
      const edge = edgeDistBetweenEntities(demolisher, building)
      if (Math.abs(edge - lastDist) < 0.5) stagnantTicks++
      else stagnantTicks = 0
      lastDist = edge
      expect(stagnantTicks).toBeLessThan(90)
      resolveDeaths(state)
    }

    expect(state.entities.has(demolisher.id)).toBe(false)
    expect(building.hp).toBeLessThan(hpBefore)
  })
})

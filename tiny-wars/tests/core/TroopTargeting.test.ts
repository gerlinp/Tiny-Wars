import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Building } from '@core/entities/Building'
import { Tower } from '@core/entities/Tower'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats, TargetClass } from '@core/types'
import { BOMB_TOWER_LIFETIME_MS, BOT_KING_COL, BOT_KING_ROW, BOT_TOWER_COLS, BOT_TOWER_ROW, CELL_SIZE } from '@data/GameConstants'
import { KING_TOWER, PRINCESS_TOWER } from '@data/TowerData'

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
    // Melee standoff toward the nearer troop (~260), not the distant building (~350)
    expect(targetPos?.x).toBeLessThan(255)
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
    expect(targetPos?.x).toBeGreaterThan(60)
    expect(targetPos?.x).toBeLessThan(140)
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

  it('marches toward active enemy king when princess towers are gone', () => {
    const warrior = new Troop(
      Owner.PLAYER,
      troopStats,
      { x: BOT_KING_COL * CELL_SIZE, y: 18 * CELL_SIZE },
      grid,
      'warrior',
    )
    const king = new Tower(
      Owner.BOT,
      KING_TOWER,
      { x: BOT_KING_COL * CELL_SIZE, y: BOT_KING_ROW * CELL_SIZE },
    )
    king.activate()
    const state = createInitialGameState()
    state.entities.set(warrior.id, warrior)
    state.towers.set(king.id, king)

    warrior.tick(33, state)
    const info = warrior.getDevInfo(state)
    expect(info.targetPos).not.toBeNull()
    expect(info.targetPos!.y).toBeLessThan(warrior.position.y)
    expect(info.marchGoal).toBeNull()
  })

  it('prefers nearest princess tower over king for march objective', () => {
    const leftCol = BOT_TOWER_COLS[0]!
    const princess = new Tower(
      Owner.BOT,
      PRINCESS_TOWER,
      { x: leftCol * CELL_SIZE, y: BOT_TOWER_ROW * CELL_SIZE },
    )
    const king = new Tower(
      Owner.BOT,
      KING_TOWER,
      { x: BOT_KING_COL * CELL_SIZE, y: BOT_KING_ROW * CELL_SIZE },
    )
    king.activate()
    const warrior = new Troop(
      Owner.PLAYER,
      troopStats,
      { x: leftCol * CELL_SIZE, y: 22 * CELL_SIZE },
      grid,
      'warrior',
    )
    const state = createInitialGameState()
    state.entities.set(warrior.id, warrior)
    state.towers.set(princess.id, princess)
    state.towers.set(king.id, king)

    warrior.tick(33, state)
    const info = warrior.getDevInfo(state)
    expect(info.targetPos).not.toBeNull()
    expect(info.targetPos!.y).toBeLessThan(warrior.position.y)
    expect(Math.abs(info.targetPos!.x - princess.position.x)).toBeLessThan(40)
  })

  it('ignores dormant enemy king for structure march', () => {
    const king = new Tower(
      Owner.BOT,
      KING_TOWER,
      { x: BOT_KING_COL * CELL_SIZE, y: BOT_KING_ROW * CELL_SIZE },
    )
    const warrior = new Troop(
      Owner.PLAYER,
      troopStats,
      { x: BOT_KING_COL * CELL_SIZE, y: 22 * CELL_SIZE },
      grid,
      'warrior',
    )
    const state = createInitialGameState()
    state.entities.set(warrior.id, warrior)
    state.towers.set(king.id, king)

    warrior.tick(33, state)
    const marchGoal = warrior.getDevInfo(state).marchGoal
    expect(marchGoal).not.toBeNull()
    expect(marchGoal!.y).toBeGreaterThan(king.position.y)
  })

  it('drops a fled enemy troop once it leaves leash range', () => {
    const warrior = new Troop(Owner.PLAYER, troopStats, { x: 100, y: 100 }, grid, 'warrior')
    const prey = new Troop(Owner.BOT, troopStats, { x: 180, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(warrior.id, warrior)
    state.entities.set(prey.id, prey)

    warrior.tick(16, state)
    // Acquired and chasing the prey.
    expect(warrior.getDevInfo(state).targetPos).not.toBeNull()

    // Prey flees far beyond leash range.
    prey.position.x = 1000
    warrior.tick(16, state)

    const info = warrior.getDevInfo(state)
    // Target dropped — falls back to lane march instead of chasing forever.
    expect(info.targetPos).toBeNull()
    expect(info.marchGoal).not.toBeNull()
  })

  it('honors targetPriority to prefer a building over a nearer enemy troop', () => {
    const buildingFirst: EntityStats = {
      ...troopStats,
      targetPriority: ['building', 'tower', 'troop', 'king'] as TargetClass[],
    }
    const unit = new Troop(Owner.PLAYER, buildingFirst, { x: 200, y: 500 }, grid, 'warrior')
    const building = new Building(Owner.BOT, BOMB_TOWER_STATS, { x: 350, y: 500 }, 'wood_tower')
    const nearerTroop = new Troop(Owner.BOT, troopStats, { x: 260, y: 500 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(unit.id, unit)
    state.entities.set(building.id, building)
    state.entities.set(nearerTroop.id, nearerTroop)

    unit.tick(33, state)

    const targetPos = unit.getDevInfo(state).targetPos
    // Princess-sized hull — standoff ~x=187 toward building at 350, not the nearer troop (~170).
    expect(targetPos?.x).toBeGreaterThan(170)
    expect(targetPos?.x).toBeLessThan(220)
  })

  it('building-only troops ignore enemy troops and march toward structures', () => {
    const giantStats: EntityStats = {
      ...troopStats,
      targetsBuildingsOnly: true,
    }
    const troll = new Troop(Owner.PLAYER, giantStats, { x: 200, y: 500 }, grid, 'troll')
    const building = new Building(Owner.BOT, BOMB_TOWER_STATS, { x: 350, y: 500 }, 'wood_tower')
    const nearerTroop = new Troop(Owner.BOT, troopStats, { x: 240, y: 500 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(troll.id, troll)
    state.entities.set(building.id, building)
    state.entities.set(nearerTroop.id, nearerTroop)

    troll.tick(33, state)

    // Building-only: targets the structure (standoff left of the nearer troop), never damages it.
    const targetPos = troll.getDevInfo(state).targetPos
    expect(targetPos).not.toBeNull()
    expect(targetPos!.x).toBeLessThan(nearerTroop.position.x)
    expect(nearerTroop.hp).toBe(troopStats.maxHp)
  })

  it('building-only troops attack towers and ignore blocking troops', () => {
    const giantStats: EntityStats = {
      ...troopStats,
      targetsBuildingsOnly: true,
    }
    const princess = new Tower(
      Owner.BOT,
      PRINCESS_TOWER,
      { x: BOT_TOWER_COLS[0]! * CELL_SIZE, y: BOT_TOWER_ROW * CELL_SIZE },
    )
    const blocker = new Troop(Owner.BOT, troopStats, { x: princess.position.x, y: princess.position.y + 40 }, grid, 'warrior')
    const troll = new Troop(
      Owner.PLAYER,
      giantStats,
      { x: princess.position.x, y: princess.position.y + 120 },
      grid,
      'troll',
    )
    const state = createInitialGameState()
    state.entities.set(troll.id, troll)
    state.entities.set(blocker.id, blocker)
    state.towers.set(princess.id, princess)

    for (let i = 0; i < 80; i++) troll.tick(50, state)

    expect(princess.hp).toBeLessThan(PRINCESS_TOWER.maxHp)
    expect(blocker.hp).toBe(troopStats.maxHp)
  })
})

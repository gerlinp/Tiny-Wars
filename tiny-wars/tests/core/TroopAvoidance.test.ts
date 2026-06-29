import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Tower } from '@core/entities/Tower'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { findBlockingAlly, moveTowardWithAllyAvoidance, tryAllyLateralSeparation } from '@core/TroopAvoidance'
import { resolveTroopCollisions } from '@core/TroopCollision'
import { edgeDistBetweenEntities, troopCollisionRadius } from '@core/EntityGeometry'
import { CELL_SIZE, BOT_TOWER_COLS, BOT_TOWER_ROW, LEFT_BRIDGE_COLS, RIVER_ROW_END } from '@data/GameConstants'
import { PRINCESS_TOWER } from '@data/TowerData'
import { CARD_DEFINITIONS } from '@data/CardData'

const warriorStats: EntityStats = {
  maxHp: 500,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('TroopAvoidance', () => {
  const grid = new Grid()

  it('detects an ally directly ahead on the march path', () => {
    const goal = { x: 240, y: 500 }
    const front = new Troop(Owner.PLAYER, warriorStats, { x: 240, y: 560 }, grid, 'warrior')
    const rear = new Troop(Owner.PLAYER, warriorStats, { x: 240, y: 573 }, grid, 'lancer')
    const state = createInitialGameState()
    state.entities.set(front.id, front)
    state.entities.set(rear.id, rear)

    expect(findBlockingAlly(rear, goal, state)).not.toBeNull()
    expect(findBlockingAlly(front, goal, state)).toBeNull()
  })

  it('sidesteps a rear unit around a blocking ally toward the goal', () => {
    const front = new Troop(Owner.PLAYER, warriorStats, { x: 240, y: 360 }, grid, 'warrior')
    const rear = new Troop(Owner.PLAYER, warriorStats, { x: 240, y: 373 }, grid, 'lancer')
    const state = createInitialGameState()
    state.entities.set(front.id, front)
    state.entities.set(rear.id, rear)

    for (let i = 0; i < 40; i++) {
      front.tick(50, state)
      rear.tick(50, state)
      resolveTroopCollisions(state, 50)
    }

    expect(Math.abs(rear.position.x - front.position.x)).toBeGreaterThan(2)
  })

  it('lets a rear lancer reach tower attack range after sidestepping a knight', () => {
    const lancerStats = CARD_DEFINITIONS.lancer!.stats!
    const towerCol = BOT_TOWER_COLS[0]!
    const tower = new Tower(
      Owner.BOT,
      PRINCESS_TOWER,
      { x: towerCol * CELL_SIZE, y: BOT_TOWER_ROW * CELL_SIZE },
    )
    const knight = new Troop(
      Owner.PLAYER,
      warriorStats,
      { x: towerCol * CELL_SIZE, y: 18 * CELL_SIZE },
      grid,
      'warrior',
    )
    const lancer = new Troop(
      Owner.PLAYER,
      lancerStats,
      { x: towerCol * CELL_SIZE, y: 19 * CELL_SIZE },
      grid,
      'lancer',
    )
    const state = createInitialGameState()
    state.entities.set(knight.id, knight)
    state.entities.set(lancer.id, lancer)
    state.towers.set(tower.id, tower)

    for (let i = 0; i < 200; i++) {
      knight.tick(50, state)
      lancer.tick(50, state)
      resolveTroopCollisions(state, 50)
    }

    const lancerRadius = troopCollisionRadius(lancer)
    expect(edgeDistBetweenEntities(lancer, tower)).toBeLessThanOrEqual(lancer.stats.attackRange * CELL_SIZE + lancerRadius)
    expect(Math.abs(lancer.position.x - knight.position.x)).toBeGreaterThan(6)
  })

  it('laterally separates a rear ally stuck behind a front ally', () => {
    const front = new Troop(Owner.PLAYER, warriorStats, { x: 240, y: 360 }, grid, 'warrior')
    const rear = new Troop(Owner.PLAYER, warriorStats, { x: 240, y: 369 }, grid, 'lancer')
    rear.getMarchDirection = () => ({ x: 0, y: -1 })

    expect(tryAllyLateralSeparation(rear, front)).toBe(true)
    expect(Math.abs(rear.position.x - front.position.x)).toBeGreaterThan(2)
  })

  it('steers toward goal with lateral bias when blocked', () => {
    const goal = { x: 240, y: 240 }
    const front = new Troop(Owner.PLAYER, warriorStats, { x: 240, y: 360 }, grid, 'warrior')
    const rear = new Troop(Owner.PLAYER, warriorStats, { x: 240, y: 373 }, grid, 'lancer')
    const state = createInitialGameState()
    state.entities.set(front.id, front)
    state.entities.set(rear.id, rear)

    moveTowardWithAllyAvoidance(rear.position, rear, goal, 20, state, grid)

    expect(rear.position.y).toBeLessThan(390)
  })

  it('does not avoid allies for ranged troops', () => {
    const archerStats = CARD_DEFINITIONS.elite_archer!.stats!
    const front = new Troop(Owner.PLAYER, archerStats, { x: 240, y: 360 }, grid, 'elite_archer')
    const rear = new Troop(Owner.PLAYER, archerStats, { x: 240, y: 390 }, grid, 'elite_archer')
    const goal = { x: 240, y: 240 }
    const state = createInitialGameState()
    state.entities.set(front.id, front)
    state.entities.set(rear.id, rear)

    expect(findBlockingAlly(rear, goal, state)).toBeNull()

    const beforeX = rear.position.x
    moveTowardWithAllyAvoidance(rear.position, rear, goal, 20, state, grid)
    expect(rear.position.x).toBeCloseTo(beforeX, 0)
  })

  it('does not sidestep melee troops into the river on a bridge', () => {
    const bridgeCol = LEFT_BRIDGE_COLS[0]!
    const bridgeX = bridgeCol * CELL_SIZE + CELL_SIZE / 2
    const bridgeY = (RIVER_ROW_END + 1) * CELL_SIZE + CELL_SIZE / 2
    const front = new Troop(Owner.PLAYER, warriorStats, { x: bridgeX, y: bridgeY - 8 }, grid, 'warrior')
    const rear = new Troop(Owner.PLAYER, warriorStats, { x: bridgeX, y: bridgeY + 10 }, grid, 'lancer')
    const state = createInitialGameState()
    state.entities.set(front.id, front)
    state.entities.set(rear.id, rear)

    for (let i = 0; i < 60; i++) {
      front.tick(50, state)
      rear.tick(50, state)
      resolveTroopCollisions(state, 50)
    }

    for (const troop of [front, rear]) {
      const cell = grid.worldToCell(troop.position.x, troop.position.y)
      expect(grid.isRiverCell(cell.x, cell.y)).toBe(false)
    }
  })
})

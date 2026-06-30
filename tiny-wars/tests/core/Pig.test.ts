import { describe, it, expect } from 'vitest'
import { Owner, TroopState, EntityKind } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { GameSimulator } from '@core/GameSimulator'
import { Grid } from '@core/Grid'
import { Troop } from '@core/entities/Troop'
import { Building } from '@core/entities/Building'
import { Tower } from '@core/entities/Tower'
import { createInitialGameState } from '@core/GameState'
import { BOMB_TOWER_LIFETIME_MS, BOT_TOWER_COLS, BOT_TOWER_ROW, CELL_SIZE, PLAYER_DEPLOY_ROW_MAX, LEFT_LANE_COL } from '@data/GameConstants'
import { PRINCESS_TOWER } from '@data/TowerData'
import { edgeDistBetweenEntities, meleeApproachPoint } from '@core/EntityGeometry'

describe('Pigs (Royal Hogs)', () => {
  const stats = CARD_DEFINITIONS.pig!.stats!

  it('deploys four building-only hogs', () => {
    expect(CARD_DEFINITIONS.pig!.elixirCost).toBe(5)
    expect(CARD_DEFINITIONS.pig!.deployCount).toBe(4)
    expect(stats.targetsBuildingsOnly).toBe(true)

    const sim = new GameSimulator(new Grid())
    const cell = { x: LEFT_LANE_COL, y: PLAYER_DEPLOY_ROW_MAX }
    expect(sim.deployCard(Owner.PLAYER, CARD_DEFINITIONS.pig!, cell)).toBe(true)

    const deployed = [...sim.state.entities.values()].filter(e => e.cardId === 'pig')
    expect(deployed).toHaveLength(4)
    expect(deployed.every(p => p.owner === Owner.PLAYER)).toBe(true)
  })

  it('swarm of hogs aims at melee standoff, not princess slot ring', () => {
    const grid = new Grid()
    const princess = new Tower(
      Owner.BOT,
      PRINCESS_TOWER,
      { x: BOT_TOWER_COLS[0]! * CELL_SIZE, y: BOT_TOWER_ROW * CELL_SIZE },
    )
    const state = createInitialGameState()
    state.towers.set(princess.id, princess)

    const baseY = princess.position.y + 120
    const hogs: Troop[] = []
    for (let i = 0; i < 4; i++) {
      const hog = new Troop(
        Owner.PLAYER,
        stats,
        { x: princess.position.x + (i - 1.5) * 24, y: baseY },
        grid,
        'pig',
      )
      hogs.push(hog)
      state.entities.set(hog.id, hog)
    }

    for (const hog of hogs) hog.tick(33, state)

    for (const hog of hogs) {
      const targetPos = hog.getDevInfo(state).targetPos
      expect(targetPos).not.toBeNull()
      const meleeGoal = meleeApproachPoint(hog.position, hog, princess, stats.attackRange)
      const distMelee = Math.hypot(targetPos!.x - meleeGoal.x, targetPos!.y - meleeGoal.y)
      expect(distMelee).toBeLessThan(CELL_SIZE * 0.5)
    }
  })

  it('reaches attack range and damages a placed building', () => {
    const grid = new Grid()
    const buildingStats = CARD_DEFINITIONS.wood_tower!.stats!
    const building = new Building(
      Owner.BOT,
      { ...buildingStats, lifetimeMs: BOMB_TOWER_LIFETIME_MS },
      { x: 400, y: 500 },
      'wood_tower',
    )
    const hog = new Troop(Owner.PLAYER, stats, { x: 400, y: 580 }, grid, 'pig')
    const state = createInitialGameState()
    state.entities.set(hog.id, hog)
    state.entities.set(building.id, building)

    let damaged = false
    for (let i = 0; i < 200; i++) {
      hog.tick(50, state)
      if (building.hp < buildingStats.maxHp) {
        damaged = true
        break
      }
    }

    expect(damaged).toBe(true)
    expect(hog.state).toBe(TroopState.ATTACKING)
  })

  it('reaches attack range and damages a princess tower in a swarm', () => {
    const grid = new Grid()
    const princess = new Tower(
      Owner.BOT,
      PRINCESS_TOWER,
      { x: BOT_TOWER_COLS[0]! * CELL_SIZE, y: BOT_TOWER_ROW * CELL_SIZE },
    )
    const state = createInitialGameState()
    state.towers.set(princess.id, princess)

    const baseY = princess.position.y + 120
    for (let i = 0; i < 4; i++) {
      const hog = new Troop(
        Owner.PLAYER,
        stats,
        { x: princess.position.x + (i - 1.5) * 20, y: baseY },
        grid,
        'pig',
      )
      state.entities.set(hog.id, hog)
    }

    let damaged = false
    for (let tick = 0; tick < 400; tick++) {
      for (const entity of state.entities.values()) {
        if (entity.kind === EntityKind.TROOP) (entity as Troop).tick(50, state)
      }
      if (princess.hp < PRINCESS_TOWER.maxHp) {
        damaged = true
        break
      }
    }

    expect(damaged).toBe(true)
  })

  it('can strike from melee approach distance (regression: short range vs building hull)', () => {
    const grid = new Grid()
    const buildingStats = CARD_DEFINITIONS.wood_tower!.stats!
    const building = new Building(
      Owner.BOT,
      { ...buildingStats, lifetimeMs: BOMB_TOWER_LIFETIME_MS },
      { x: 400, y: 500 },
      'wood_tower',
    )
    const hog = new Troop(Owner.PLAYER, stats, { x: 400, y: 560 }, grid, 'pig')
    const state = createInitialGameState()
    state.entities.set(hog.id, hog)
    state.entities.set(building.id, building)

    for (let i = 0; i < 120; i++) hog.tick(50, state)

    const edge = edgeDistBetweenEntities(hog, building)
    expect(edge).toBeLessThanOrEqual(stats.attackRange * CELL_SIZE + 1)
  })
})

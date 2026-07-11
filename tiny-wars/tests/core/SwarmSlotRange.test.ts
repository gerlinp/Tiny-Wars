import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Building } from '@core/entities/Building'
import { Tower } from '@core/entities/Tower'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { resolveTroopCollisions } from '@core/TroopCollision'
import { AttackType, Owner, TroopState, UnitType } from '@core/types'
import type { EntityStats } from '@core/types'
import { CELL_SIZE, TROOP_SPAWN_DELAY_MS, BOMB_TOWER_CARD_ID } from '@data/GameConstants'
import { PRINCESS_TOWER } from '@data/TowerData'
import type { GameState } from '@core/GameState'

const meleeStats: EntityStats = {
  maxHp: 100000,
  speed: 1.5,
  damage: 1, // negligible — targets must survive the whole run
  attackRate: 1,
  attackRange: 0.7,
  unitType: UnitType.GROUND,
  attackType: AttackType.AIR_AND_GROUND,
}

const buildingStats: EntityStats = {
  maxHp: 100000,
  speed: 0,
  damage: 0,
  attackRate: 0.0001,
  attackRange: 6,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

function spawnSwarm(state: GameState, grid: Grid, center: { x: number; y: number }, count: number): Troop[] {
  const swarm: Troop[] = []
  for (let i = 0; i < count; i++) {
    const x = center.x + (i - (count - 1) / 2) * CELL_SIZE * 0.9
    const unit = new Troop(Owner.PLAYER, meleeStats, { x, y: center.y }, grid, 'skeleton')
    state.entities.set(unit.id, unit)
    unit.tick(TROOP_SPAWN_DELAY_MS + 1, state) // clear spawn freeze
    swarm.push(unit)
  }
  return swarm
}

function runSim(state: GameState, swarm: Troop[], ticks: number): void {
  for (let t = 0; t < ticks; t++) {
    for (const unit of swarm) unit.tick(50, state)
    resolveTroopCollisions(state, 50)
  }
}

describe('swarm melee slots are all within attack range', () => {
  it('every swarm attacker around a bomb tower building settles into ATTACKING', () => {
    const grid = new Grid()
    const state = createInitialGameState()
    const pos = { x: 9.5 * CELL_SIZE, y: 22.5 * CELL_SIZE }
    const building = new Building(Owner.BOT, buildingStats, pos, BOMB_TOWER_CARD_ID)
    state.entities.set(building.id, building)
    for (const cell of building.blockedCells) grid.blockCell(cell.x, cell.y)

    const swarm = spawnSwarm(state, grid, { x: pos.x, y: pos.y + 5 * CELL_SIZE }, 12)
    runSim(state, swarm, 600) // 30s of sim — ample time to path, wedge in, and settle

    const attacking = swarm.filter(u => u.state === TroopState.ATTACKING)
    expect(attacking.length).toBe(swarm.length)
  })

  it('every swarm attacker around a princess tower settles into ATTACKING', () => {
    const grid = new Grid()
    const state = createInitialGameState()
    const pos = { x: 14.5 * CELL_SIZE, y: 25.5 * CELL_SIZE }
    const tower = new Tower(Owner.BOT, PRINCESS_TOWER, pos)
    state.towers.set(tower.id, tower)
    for (const cell of tower.blockedCells) grid.blockCell(cell.x, cell.y)

    const swarm = spawnSwarm(state, grid, { x: pos.x, y: pos.y + 6 * CELL_SIZE }, 12)
    runSim(state, swarm, 600)

    const attacking = swarm.filter(u => u.state === TroopState.ATTACKING)
    expect(attacking.length).toBe(swarm.length)
  })
})

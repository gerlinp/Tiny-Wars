import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Tower } from '@core/entities/Tower'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { CELL_SIZE } from '@data/GameConstants'
import { PRINCESS_TOWER } from '@data/TowerData'

// Ranged troop with CR-style range 5.5 — below the princess tower's 7.5 range.
const archerStats: EntityStats = {
  maxHp: 200,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 5.5,
  unitType: UnitType.GROUND,
  attackType: AttackType.AIR_AND_GROUND,
}

const meleeStats: EntityStats = {
  ...archerStats,
  attackRange: 1.2,
  attackType: AttackType.GROUND_ONLY,
}

describe('Ranged troop vs tower range geometry', () => {
  const grid = new Grid()
  const towerPos = { x: 300, y: 300 }

  // Bot princess tower with a player troop directly below it, so center-to-center
  // distance equals the vertical gap (tower attack centre == tower position here).
  function setup(stats: EntityStats, centerCells: number, cardId = 'archer') {
    const tower = new Tower(Owner.BOT, PRINCESS_TOWER, towerPos)
    const troop = new Troop(
      Owner.PLAYER,
      stats,
      { x: towerPos.x, y: towerPos.y + centerCells * CELL_SIZE },
      grid,
      cardId,
    )
    const state = createInitialGameState()
    state.towers.set(tower.id, tower)
    state.entities.set(troop.id, troop)
    return { tower, troop, state }
  }

  it('does not attack a tower beyond its attackRange center-to-center', () => {
    // 6.5 cells center-to-center sits inside the OLD edge-to-edge reach
    // (5.5 + tower radius 1.5 + troop radius 0.35 = 7.35) but outside the troop's
    // true 5.5 range. With center-to-center measurement the tower out-ranges it.
    const { tower, troop, state } = setup(archerStats, 6.5)
    troop.tick(33, state)
    expect(tower.hp).toBe(PRINCESS_TOWER.maxHp)
    // It is engaged and closing the gap, just not yet in range.
    expect(troop.position.y).toBeLessThan(towerPos.y + 6.5 * CELL_SIZE)
  })

  it('attacks a tower once within attackRange center-to-center', () => {
    const { tower, troop, state } = setup(archerStats, 5.0)
    troop.tick(33, state)
    expect(tower.hp).toBeLessThan(PRINCESS_TOWER.maxHp)
  })

  it('closes to its true range and stands off there (no surface hugging)', () => {
    const { tower, troop, state } = setup(archerStats, 6.5)
    for (let i = 0; i < 60; i++) troop.tick(33, state)
    expect(tower.hp).toBeLessThan(PRINCESS_TOWER.maxHp)
    const centerDist = Math.abs(troop.position.y - towerPos.y) / CELL_SIZE
    // Fires from ~its 5.5 range, not pressed against the tower surface (~1.85 cells).
    expect(centerDist).toBeGreaterThan(4.5)
    expect(centerDist).toBeLessThanOrEqual(5.6)
  })

  it('melee troops still measure tower range edge-to-edge', () => {
    // 1.85 cells center-to-center = exactly the combined radii, i.e. edge distance 0.
    // A melee troop (range 1.2) attacks at the surface; center-to-center here is well
    // below its range, confirming melee still uses surface distance, not center.
    const { tower, troop, state } = setup(meleeStats, 2.5, 'warrior')
    for (let i = 0; i < 40; i++) troop.tick(33, state)
    expect(tower.hp).toBeLessThan(PRINCESS_TOWER.maxHp)
  })
})

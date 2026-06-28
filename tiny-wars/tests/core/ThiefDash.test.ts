import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import {
  CELL_SIZE,
  THIEF_DASH_RANGE_CELLS,
  THIEF_DASH_SPEED_MULT,
  THIEF_DASH_WINDUP_MS,
  TROOP_COLLISION_RADIUS_CELLS,
} from '@data/GameConstants'

const troopStats: EntityStats = {
  maxHp: 500,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

const tankStats: EntityStats = { ...troopStats, maxHp: 3000 }

/** Place two troops with a given edge-to-edge gap in grid cells. */
function enemyAtEdgeGap(thief: Troop, enemy: Troop, gapCells: number): void {
  const radiusPx = TROOP_COLLISION_RADIUS_CELLS * CELL_SIZE
  const centerGap = gapCells * CELL_SIZE + radiusPx * 2
  enemy.position = { x: thief.position.x, y: thief.position.y - centerGap }
}

describe('Thief opening dash (Bandit)', () => {
  const grid = new Grid()
  const thiefStats = CARD_DEFINITIONS.thief!.stats!

  it('declares Clash Royale dash constants on the thief card', () => {
    expect(thiefStats.dashRangeCells).toBe(THIEF_DASH_RANGE_CELLS)
    expect(thiefStats.dashSpeedMultiplier).toBe(THIEF_DASH_SPEED_MULT)
    expect(thiefStats.dashWindupMs).toBe(THIEF_DASH_WINDUP_MS)
    expect(thiefStats.firstHitDamageMultiplier).toBe(2)
  })

  it('holds idle during wind-up before leaping', () => {
    const thief = new Troop(Owner.PLAYER, thiefStats, { x: 200, y: 500 }, grid, 'thief')
    const enemy = new Troop(Owner.BOT, tankStats, { x: 200, y: 400 }, grid, 'warrior')
    enemyAtEdgeGap(thief, enemy, 3)
    const state = createInitialGameState()
    state.entities.set(thief.id, thief)
    state.entities.set(enemy.id, enemy)
    const startY = thief.position.y

    thief.tick(50, state)

    expect(thief.isDashActive()).toBe(true)
    expect(thief.getDashPhase()).toBe('windup')
    expect(thief.position.y).toBe(startY)
    expect(thief.getEffectiveSpeed()).toBeCloseTo(thiefStats.speed)
  })

  it('leaps at boosted speed after wind-up', () => {
    const thief = new Troop(Owner.PLAYER, thiefStats, { x: 200, y: 500 }, grid, 'thief')
    const enemy = new Troop(Owner.BOT, tankStats, { x: 200, y: 400 }, grid, 'warrior')
    enemyAtEdgeGap(thief, enemy, 3)
    const state = createInitialGameState()
    state.entities.set(thief.id, thief)
    state.entities.set(enemy.id, enemy)

    const windupTicks = Math.ceil(THIEF_DASH_WINDUP_MS / 50)
    for (let i = 0; i < windupTicks - 1; i++) {
      thief.tick(50, state)
    }
    expect(thief.getDashPhase()).toBe('windup')

    thief.tick(50, state)
    expect(thief.getDashPhase()).toBe('leap')
    expect(thief.getEffectiveSpeed()).toBeCloseTo(thiefStats.speed * THIEF_DASH_SPEED_MULT)
  })

  it('deals double damage on the opening dash hit', () => {
    const thief = new Troop(Owner.PLAYER, thiefStats, { x: 200, y: 500 }, grid, 'thief')
    const enemy = new Troop(Owner.BOT, tankStats, { x: 200, y: 400 }, grid, 'warrior')
    enemyAtEdgeGap(thief, enemy, 3)
    const state = createInitialGameState()
    state.entities.set(thief.id, thief)
    state.entities.set(enemy.id, enemy)

    for (let i = 0; i < 120 && enemy.hp === tankStats.maxHp; i++) {
      thief.tick(50, state)
    }

    expect(tankStats.maxHp - enemy.hp).toBe(thiefStats.damage * 2)
    expect(thief.isDashActive()).toBe(false)
  })

  it('deals normal damage on later hits', () => {
    const thief = new Troop(Owner.PLAYER, thiefStats, { x: 200, y: 500 }, grid, 'thief')
    const enemy = new Troop(Owner.BOT, tankStats, { x: 200, y: 400 }, grid, 'warrior')
    enemyAtEdgeGap(thief, enemy, 3)
    const state = createInitialGameState()
    state.entities.set(thief.id, thief)
    state.entities.set(enemy.id, enemy)

    for (let i = 0; i < 120 && enemy.hp === tankStats.maxHp; i++) {
      thief.tick(50, state)
    }
    expect(tankStats.maxHp - enemy.hp).toBe(thiefStats.damage * 2)

    const hpAfterFirst = enemy.hp
    for (let i = 0; i < 120 && enemy.hp === hpAfterFirst; i++) {
      thief.tick(50, state)
    }
    expect(hpAfterFirst - enemy.hp).toBe(thiefStats.damage)
  })
})

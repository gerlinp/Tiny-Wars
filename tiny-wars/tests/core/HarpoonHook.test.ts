import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { tickHooks } from '@core/HookSystem'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import {
  CELL_SIZE,
  HOOK_MAX_RANGE_CELLS,
  HOOK_MIN_RANGE_CELLS,
  HOOK_SLOW_DURATION_MS,
  HOOK_SLOW_SPEED_MULT,
  HOOK_WINDUP_MS,
  TROOP_COLLISION_RADIUS_CELLS,
} from '@data/GameConstants'

const tankStats: EntityStats = {
  maxHp: 3000,
  speed: 1.5,
  damage: 50,
  attackRate: 1,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

function enemyAtEdgeGap(shark: Troop, enemy: Troop, gapCells: number): void {
  const radiusPx = TROOP_COLLISION_RADIUS_CELLS * CELL_SIZE
  const centerGap = gapCells * CELL_SIZE + radiusPx * 2
  enemy.position = { x: shark.position.x, y: shark.position.y - centerGap }
}

describe('Harpoon Shark hook (Fisherman)', () => {
  const grid = new Grid()
  const sharkStats = CARD_DEFINITIONS.harpoon_shark!.stats!

  it('declares fisherman hook constants on the card', () => {
    expect(CARD_DEFINITIONS.harpoon_shark!.elixirCost).toBe(3)
    expect(sharkStats.hookMinRangeCells).toBe(HOOK_MIN_RANGE_CELLS)
    expect(sharkStats.hookMaxRangeCells).toBe(HOOK_MAX_RANGE_CELLS)
    expect(sharkStats.hookWindupMs).toBe(HOOK_WINDUP_MS)
    expect(sharkStats.hookSlowDurationMs).toBe(HOOK_SLOW_DURATION_MS)
    expect(sharkStats.hookSlowSpeedMultiplier).toBe(HOOK_SLOW_SPEED_MULT)
    expect(sharkStats.maxHp).toBe(1152)
    expect(sharkStats.damage).toBe(257)
  })

  it('holds idle during hook wind-up', () => {
    const shark = new Troop(Owner.PLAYER, sharkStats, { x: 200, y: 500 }, grid, 'harpoon_shark')
    const enemy = new Troop(Owner.BOT, tankStats, { x: 200, y: 400 }, grid, 'warrior')
    enemyAtEdgeGap(shark, enemy, 5)
    const state = createInitialGameState()
    state.entities.set(shark.id, shark)
    state.entities.set(enemy.id, enemy)
    const startY = shark.position.y

    shark.tick(50, state)

    expect(shark.isHookWindupActive()).toBe(true)
    expect(shark.getHookPhase()).toBe('windup')
    expect(shark.position.y).toBe(startY)
  })

  it('launches a hook and pulls a ground troop closer', () => {
    const shark = new Troop(Owner.PLAYER, sharkStats, { x: 200, y: 500 }, grid, 'harpoon_shark')
    const enemy = new Troop(Owner.BOT, tankStats, { x: 200, y: 400 }, grid, 'warrior')
    enemyAtEdgeGap(shark, enemy, 5)
    const state = createInitialGameState()
    state.entities.set(shark.id, shark)
    state.entities.set(enemy.id, enemy)
    const startEnemyY = enemy.position.y

    const windupTicks = Math.ceil(HOOK_WINDUP_MS / 50) + 2
    for (let i = 0; i < windupTicks; i++) {
      shark.tick(50, state)
      tickHooks(state, 50)
    }

    expect(state.hooks?.length).toBeGreaterThan(0)
    expect(state.events.some(e => e.type === 'HOOK')).toBe(true)

    for (let i = 0; i < 80; i++) {
      tickHooks(state, 50)
    }

    expect(enemy.position.y).toBeGreaterThan(startEnemyY)
    expect(enemy.getEffectiveSpeed()).toBeLessThan(tankStats.speed)
  })
})

import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Building } from '@core/entities/Building'
import { resolveDeaths } from '@core/CombatSystem'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { Grid } from '@core/Grid'
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

describe('Goblin Demolisher', () => {
  const grid = new Grid()
  const stats = CARD_DEFINITIONS.goblin_demolisher!.stats!

  it('detonates on its first attack and is removed', () => {
    const building = new Building(Owner.BOT, BOMB_TOWER_STATS, { x: 200, y: 500 }, 'wood_tower')
    const demolisher = new Troop(
      Owner.PLAYER,
      stats,
      { x: 200 + CELL_SIZE * 1.1, y: 500 },
      grid,
      'goblin_demolisher',
    )
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

  it('deploys as a pair', () => {
    expect(CARD_DEFINITIONS.goblin_demolisher!.deployCount).toBe(2)
    expect(stats.suicideOnAttack).toBe(true)
    expect(stats.targetsBuildingsOnly).toBe(true)
  })
})

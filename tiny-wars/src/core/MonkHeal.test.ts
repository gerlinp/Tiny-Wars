import { describe, it, expect } from 'vitest'
import { Troop } from './entities/Troop'
import { createInitialGameState } from './GameState'
import { Owner, UnitType, AttackType } from './types'
import type { EntityStats } from './types'
import { Grid } from './Grid'
import { crSpeedToCellsPerSec, CR_SPEED } from '@data/GameConstants'
import { CARD_DEFINITIONS } from '@data/CardData'

const monkStats = CARD_DEFINITIONS.monk!.stats!

const warriorStats: EntityStats = {
  maxHp: 2332,
  speed: crSpeedToCellsPerSec(CR_SPEED.medium),
  damage: 267,
  attackRate: 1 / 1.2,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('Monk heal', () => {
  it('heals damaged allies in radius on attack', () => {
    const grid = new Grid()
    const monk = new Troop(Owner.PLAYER, monkStats, { x: 200, y: 500 }, grid, 'monk')
    const ally = new Troop(Owner.PLAYER, warriorStats, { x: 220, y: 500 }, grid, 'warrior')
    const enemy = new Troop(Owner.BOT, warriorStats, { x: 215, y: 500 }, grid, 'warrior')
    ally.hp = 1500

    const state = createInitialGameState()
    state.entities.set(monk.id, monk)
    state.entities.set(ally.id, ally)
    state.entities.set(enemy.id, enemy)

    for (let i = 0; i < 40 && enemy.hp === warriorStats.maxHp; i++) {
      monk.tick(50, state)
    }

    expect(enemy.hp).toBeLessThan(warriorStats.maxHp)
    expect(ally.hp).toBeGreaterThan(1500)
    expect(state.events.some(e => e.type === 'HEAL' && e.targetId === ally.id)).toBe(true)
    expect(state.events.some(e => e.type === 'HEAL_AURA')).toBe(true)
  })

  it('heals nearby allies on deploy', () => {
    const grid = new Grid()
    const monk = new Troop(Owner.PLAYER, monkStats, { x: 200, y: 500 }, grid, 'monk')
    const ally = new Troop(Owner.PLAYER, warriorStats, { x: 215, y: 500 }, grid, 'warrior')
    ally.hp = 1800

    const state = createInitialGameState()
    state.entities.set(ally.id, ally)

    monk.applySpawnHeal(state)

    expect(ally.hp).toBeGreaterThan(1800)
    expect(state.events.some(e => e.type === 'HEAL' && e.targetId === ally.id)).toBe(true)
    expect(state.events.some(e => e.type === 'HEAL_AURA')).toBe(true)
  })

  it('does not overheal allies at full HP', () => {
    const grid = new Grid()
    const monk = new Troop(Owner.PLAYER, monkStats, { x: 200, y: 500 }, grid, 'monk')
    const ally = new Troop(Owner.PLAYER, warriorStats, { x: 215, y: 500 }, grid, 'warrior')

    const state = createInitialGameState()
    state.entities.set(ally.id, ally)

    monk.applySpawnHeal(state)

    expect(ally.hp).toBe(warriorStats.maxHp)
    expect(state.events.some(e => e.type === 'HEAL')).toBe(false)
  })
})

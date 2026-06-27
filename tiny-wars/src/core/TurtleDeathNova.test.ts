import { describe, it, expect } from 'vitest'
import { Troop } from './entities/Troop'
import { resolveDeaths } from './CombatSystem'
import { createInitialGameState } from './GameState'
import { Owner, UnitType, AttackType } from './types'
import type { EntityStats } from './types'
import { Grid } from './Grid'
import { crSpeedToCellsPerSec, CR_SPEED } from '@data/GameConstants'

const turtleStats: EntityStats = {
  maxHp: 1742,
  speed: crSpeedToCellsPerSec(CR_SPEED.verySlow),
  damage: 111,
  attackRate: 1 / 2.5,
  attackRange: 0.75,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
  targetsBuildingsOnly: true,
  deathSplashRadius: 2,
  deathSplashDamage: 111,
  deathSlowDurationMs: 2000,
  deathSlowSpeedMultiplier: 0.7,
}

const warriorStats: EntityStats = {
  maxHp: 2332,
  speed: crSpeedToCellsPerSec(CR_SPEED.medium),
  damage: 267,
  attackRate: 1 / 1.2,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('Turtle death nova', () => {
  it('damages and slows nearby enemies when destroyed', () => {
    const grid = new Grid()
    const turtle = new Troop(Owner.PLAYER, turtleStats, { x: 200, y: 500 }, grid, 'turtle')
    const nearby = new Troop(Owner.BOT, warriorStats, { x: 220, y: 500 }, grid, 'warrior')
    const far = new Troop(Owner.BOT, warriorStats, { x: 320, y: 500 }, grid, 'warrior')
    turtle.hp = 0

    const state = createInitialGameState()
    state.entities.set(turtle.id, turtle)
    state.entities.set(nearby.id, nearby)
    state.entities.set(far.id, far)

    resolveDeaths(state)

    expect(state.entities.has(turtle.id)).toBe(false)
    expect(nearby.hp).toBeLessThan(warriorStats.maxHp)
    expect(far.hp).toBe(warriorStats.maxHp)
    expect(nearby.getEffectiveSpeed()).toBeLessThan(warriorStats.speed)
  })
})

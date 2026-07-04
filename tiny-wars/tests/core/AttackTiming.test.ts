import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { AttackType, UnitType } from '@core/types'
import type { EntityStats } from '@core/types'
import { Owner } from '@core/types'
import { TROOP_SPAWN_DELAY_MS } from '@data/GameConstants'

const grid = new Grid()

const baseStats: EntityStats = {
  maxHp: 1000,
  speed: 1.5,
  damage: 100,
  attackRate: 1,
  attackRange: 2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

function spawnPair(attackerStats: EntityStats) {
  const attacker = new Troop(Owner.PLAYER, attackerStats, { x: 400, y: 800 }, grid, 'warrior')
  const victim = new Troop(Owner.BOT, baseStats, { x: 430, y: 800 }, grid, 'warrior')
  const state = createInitialGameState()
  state.entities.set(attacker.id, attacker)
  state.entities.set(victim.id, victim)
  // Clear CR spawn freeze so combat starts immediately.
  attacker.tick(TROOP_SPAWN_DELAY_MS + 1, state)
  return { attacker, victim, state }
}

describe('attack windup / recovery', () => {
  it('lands damage immediately when no windup is configured (legacy behavior)', () => {
    const { attacker, victim, state } = spawnPair(baseStats)
    attacker.tick(16, state)
    expect(victim.hp).toBe(baseStats.maxHp - baseStats.damage)
  })

  it('delays damage by attackWindupMs, then applies recovery stand-still', () => {
    const { attacker, victim, state } = spawnPair({ ...baseStats, attackWindupMs: 200, attackRecoveryMs: 150 })

    attacker.tick(16, state)   // starts the swing — no damage yet
    expect(victim.hp).toBe(baseStats.maxHp)

    attacker.tick(100, state)  // windup 116/200
    expect(victim.hp).toBe(baseStats.maxHp)

    attacker.tick(100, state)  // windup complete — damage lands
    expect(victim.hp).toBe(baseStats.maxHp - baseStats.damage)
  })

  it('only hits once per cooldown even with windup', () => {
    const { attacker, victim, state } = spawnPair({ ...baseStats, attackWindupMs: 100 })
    for (let i = 0; i < 20; i++) attacker.tick(33, state)  // ~660ms < 1000ms cooldown
    expect(victim.hp).toBe(baseStats.maxHp - baseStats.damage)
  })
})

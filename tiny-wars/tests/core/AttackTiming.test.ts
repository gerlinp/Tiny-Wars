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

describe('CR combat commitment', () => {
  it('keeps attacking the same troop even when a closer enemy appears mid-fight', () => {
    const { attacker, victim, state } = spawnPair(baseStats)
    attacker.tick(16, state)  // engages — commitment locked
    expect(victim.hp).toBeLessThan(baseStats.maxHp)

    // Drop a closer enemy right on top of the attacker.
    const closer = new Troop(Owner.BOT, baseStats, { x: 405, y: 800 }, grid, 'warrior')
    state.entities.set(closer.id, closer)

    for (let i = 0; i < 40; i++) attacker.tick(33, state)  // > one attack cooldown
    // Damage keeps landing on the ORIGINAL target, not the interloper.
    expect(victim.hp).toBeLessThan(baseStats.maxHp - baseStats.damage)
    expect(closer.hp).toBe(baseStats.maxHp)
  })

  it('keeps its target when the target is pushed out of attack range', () => {
    const { attacker, victim, state } = spawnPair(baseStats)
    attacker.tick(16, state)  // engaged
    // Knock the victim 3 cells away (well within the retention leash).
    victim.position.x += 150
    const bystander = new Troop(Owner.BOT, baseStats, { x: 415, y: 800 }, grid, 'warrior')
    state.entities.set(bystander.id, bystander)

    attacker.tick(16, state)
    // Still chasing the committed victim — the nearer bystander is ignored.
    const goal = attacker.getDevInfo(state).targetPos
    expect(goal).not.toBeNull()
    expect(goal!.x).toBeGreaterThan(450)  // toward the pushed victim, not the bystander
  })
})

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

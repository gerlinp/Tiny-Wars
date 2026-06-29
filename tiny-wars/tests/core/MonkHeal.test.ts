import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { Grid } from '@core/Grid'
import { crSpeedToCellsPerSec, CR_SPEED, HEAL_PULSE_INTERVAL_MS } from '@data/GameConstants'
import { MONK_SPAWN_HEAL_PER_PULSE } from '@data/CardAbilities'
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
  it('heals every damaged ally in radius on attack', () => {
    const grid = new Grid()
    const monk = new Troop(Owner.PLAYER, monkStats, { x: 200, y: 500 }, grid, 'monk')
    const allyNear = new Troop(Owner.PLAYER, warriorStats, { x: 215, y: 500 }, grid, 'warrior')
    const allyFar = new Troop(Owner.PLAYER, warriorStats, { x: 230, y: 500 }, grid, 'warrior')
    const enemy = new Troop(Owner.BOT, warriorStats, { x: 210, y: 500 }, grid, 'warrior')
    allyNear.hp = 1500
    allyFar.hp = 1600

    const state = createInitialGameState()
    state.entities.set(monk.id, monk)
    state.entities.set(allyNear.id, allyNear)
    state.entities.set(allyFar.id, allyFar)
    state.entities.set(enemy.id, enemy)

    for (let i = 0; i < 40 && enemy.hp === warriorStats.maxHp; i++) {
      monk.tick(50, state)
    }

    expect(enemy.hp).toBeLessThan(warriorStats.maxHp)
    expect(allyNear.hp).toBeGreaterThan(1500)
    expect(allyFar.hp).toBeGreaterThan(1600)
    expect(state.events.some(e => e.type === 'HEAL' && e.targetId === allyNear.id)).toBe(true)
    expect(state.events.some(e => e.type === 'HEAL' && e.targetId === allyFar.id)).toBe(true)
  })

  it('heals every damaged ally in radius on deploy', () => {
    const grid = new Grid()
    const monk = new Troop(Owner.PLAYER, monkStats, { x: 200, y: 500 }, grid, 'monk')
    const allyA = new Troop(Owner.PLAYER, warriorStats, { x: 210, y: 500 }, grid, 'warrior')
    const allyB = new Troop(Owner.PLAYER, warriorStats, { x: 220, y: 505 }, grid, 'warrior')
    allyA.hp = 1800
    allyB.hp = 1700

    const state = createInitialGameState()
    state.entities.set(allyA.id, allyA)
    state.entities.set(allyB.id, allyB)

    monk.applySpawnHeal(state)

    expect(allyA.hp).toBeGreaterThan(1800)
    expect(allyB.hp).toBeGreaterThan(1700)
    expect(state.events.some(e => e.type === 'HEAL' && e.targetId === allyA.id)).toBe(true)
    expect(state.events.some(e => e.type === 'HEAL' && e.targetId === allyB.id)).toBe(true)
  })

  it('delivers heal in pulses to all injured allies in range', () => {
    const grid = new Grid()
    const monk = new Troop(Owner.PLAYER, monkStats, { x: 200, y: 500 }, grid, 'monk')
    const ally = new Troop(Owner.PLAYER, warriorStats, { x: 215, y: 500 }, grid, 'warrior')
    ally.hp = 1500

    const state = createInitialGameState()
    state.entities.set(monk.id, monk)
    state.entities.set(ally.id, ally)

    monk.applySpawnHeal(state)
    const afterFirstPulse = ally.hp
    expect(afterFirstPulse).toBe(1500 + MONK_SPAWN_HEAL_PER_PULSE)

    monk.tick(HEAL_PULSE_INTERVAL_MS, state)
    expect(ally.hp).toBe(afterFirstPulse + MONK_SPAWN_HEAL_PER_PULSE)
  })

  it('does not overheal allies at full HP but still shows heal effect in range', () => {
    const grid = new Grid()
    const monk = new Troop(Owner.PLAYER, monkStats, { x: 200, y: 500 }, grid, 'monk')
    const ally = new Troop(Owner.PLAYER, warriorStats, { x: 215, y: 500 }, grid, 'warrior')

    const state = createInitialGameState()
    state.entities.set(ally.id, ally)

    monk.applySpawnHeal(state)

    expect(ally.hp).toBe(warriorStats.maxHp)
    expect(state.events.some(e => e.type === 'HEAL' && e.targetId === ally.id && e.amount === 0)).toBe(true)
  })

  it('does not heal allies outside radius', () => {
    const grid = new Grid()
    const monk = new Troop(Owner.PLAYER, monkStats, { x: 200, y: 500 }, grid, 'monk')
    const allyOut = new Troop(Owner.PLAYER, warriorStats, { x: 400, y: 500 }, grid, 'warrior')
    allyOut.hp = 1500

    const state = createInitialGameState()
    state.entities.set(allyOut.id, allyOut)

    monk.applySpawnHeal(state)

    expect(allyOut.hp).toBe(1500)
    expect(state.events.some(e => e.type === 'HEAL' && e.targetId === allyOut.id)).toBe(false)
  })

  it('emits HEAL_AURA on each pulse and continues while walking', () => {
    const grid = new Grid()
    const monk = new Troop(Owner.PLAYER, monkStats, { x: 200, y: 500 }, grid, 'monk')
    const ally = new Troop(Owner.PLAYER, warriorStats, { x: 215, y: 500 }, grid, 'warrior')
    ally.hp = 1500

    const state = createInitialGameState()
    state.entities.set(monk.id, monk)
    state.entities.set(ally.id, ally)

    monk.applySpawnHeal(state)
    expect(state.events.filter(e => e.type === 'HEAL_AURA' && e.healerId === monk.id)).toHaveLength(1)

    monk.tick(HEAL_PULSE_INTERVAL_MS, state)
    monk.position.x += 20
    monk.position.y += 10

    expect(state.events.filter(e => e.type === 'HEAL_AURA' && e.healerId === monk.id)).toHaveLength(2)
    expect(monk.isHealBurstActive()).toBe(true)
    expect(ally.hp).toBeGreaterThan(1500 + MONK_SPAWN_HEAL_PER_PULSE)
  })
})

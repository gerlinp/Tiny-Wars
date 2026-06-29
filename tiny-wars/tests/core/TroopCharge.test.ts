import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { LANCER_CHARGE_DAMAGE_MULT, LANCER_CHARGE_DISTANCE_CELLS, LANCER_CHARGE_SPEED_MULT } from '@data/CardAbilities'

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

describe('Lancer charge (Prince)', () => {
  const grid = new Grid()
  const lancerStats = CARD_DEFINITIONS.lancer!.stats!

  it('declares Clash Royale charge constants in CardAbilities', () => {
    expect(LANCER_CHARGE_DISTANCE_CELLS).toBe(3.5)
    expect(LANCER_CHARGE_SPEED_MULT).toBe(2)
    expect(LANCER_CHARGE_DAMAGE_MULT).toBe(2)
  })

  it('activates charge after walking 3.5 tiles', () => {
    const lancer = new Troop(Owner.PLAYER, lancerStats, { x: 200, y: 700 }, grid, 'lancer')
    const state = createInitialGameState()
    state.entities.set(lancer.id, lancer)

    expect(lancer.isChargeActive()).toBe(false)

    for (let i = 0; i < 120 && !lancer.isChargeActive(); i++) {
      lancer.tick(50, state)
    }

    expect(lancer.isChargeActive()).toBe(true)
    expect(lancer.getEffectiveSpeed()).toBeCloseTo(lancerStats.speed * LANCER_CHARGE_SPEED_MULT)
  })

  it('provides an aim point while charging for the lunge attack clip', () => {
    const lancer = new Troop(Owner.PLAYER, lancerStats, { x: 200, y: 700 }, grid, 'lancer')
    const state = createInitialGameState()
    state.entities.set(lancer.id, lancer)

    for (let i = 0; i < 120 && !lancer.isChargeActive(); i++) {
      lancer.tick(50, state)
    }

    const aim = lancer.getChargeAimPoint()
    expect(aim).not.toBeNull()
    expect(aim!.y).toBeLessThan(lancer.position.y)
  })

  it('deals double damage on the first hit while charging', () => {
    const lancer = new Troop(Owner.PLAYER, lancerStats, { x: 200, y: 700 }, grid, 'lancer')
    const enemy = new Troop(Owner.BOT, tankStats, { x: 200, y: 100 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(lancer.id, lancer)

    for (let i = 0; i < 120 && !lancer.isChargeActive(); i++) {
      lancer.tick(50, state)
    }
    expect(lancer.isChargeActive()).toBe(true)

    enemy.position = { x: lancer.position.x + 15, y: lancer.position.y - 15 }
    state.entities.set(enemy.id, enemy)

    for (let i = 0; i < 80 && enemy.hp === tankStats.maxHp; i++) {
      lancer.tick(50, state)
    }

    const dealt = tankStats.maxHp - enemy.hp
    expect(dealt).toBe(lancerStats.damage * LANCER_CHARGE_DAMAGE_MULT)
    expect(lancer.isChargeActive()).toBe(false)
  })

  it('deals normal damage when attacking before charge completes', () => {
    const lancer = new Troop(Owner.PLAYER, lancerStats, { x: 200, y: 500 }, grid, 'lancer')
    const enemy = new Troop(Owner.BOT, tankStats, { x: 215, y: 500 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(lancer.id, lancer)
    state.entities.set(enemy.id, enemy)

    for (let i = 0; i < 40 && enemy.hp === tankStats.maxHp; i++) {
      lancer.tick(50, state)
    }

    expect(lancer.isChargeActive()).toBe(false)
    expect(tankStats.maxHp - enemy.hp).toBe(lancerStats.damage)
  })
})

import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { Grid } from '@core/Grid'
import { launchBoomerang, tickBoomerangs } from '@core/BoomerangSystem'
import { CARD_DEFINITIONS } from '@data/CardData'
import { crSpeedToCellsPerSec, CR_SPEED } from '@data/GameConstants'

const gnollStats = CARD_DEFINITIONS.gnoll!.stats!

const warriorStats: EntityStats = {
  maxHp: 2332,
  speed: crSpeedToCellsPerSec(CR_SPEED.medium),
  damage: 267,
  attackRate: 1 / 1.2,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('Gnoll boomerang (Executioner)', () => {
  it('damages enemies on outbound and return passes', () => {
    const grid = new Grid()
    const gnoll = new Troop(Owner.PLAYER, gnollStats, { x: 100, y: 500 }, grid, 'gnoll')
    const enemy = new Troop(Owner.BOT, warriorStats, { x: 180, y: 500 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(gnoll.id, gnoll)
    state.entities.set(enemy.id, enemy)

    launchBoomerang(state, gnoll, enemy, gnollStats.boomerangTravelCells ?? 7.5, gnollStats.damage)

    for (let i = 0; i < 500 && state.boomerangs?.length; i++) {
      tickBoomerangs(state, 16)
    }

    expect(enemy.hp).toBe(warriorStats.maxHp - gnollStats.damage * 2)
  })

  it('can hit multiple enemies in the path once per pass', () => {
    const grid = new Grid()
    const gnoll = new Troop(Owner.PLAYER, gnollStats, { x: 100, y: 500 }, grid, 'gnoll')
    const front = new Troop(Owner.BOT, warriorStats, { x: 160, y: 500 }, grid, 'warrior')
    const back = new Troop(Owner.BOT, warriorStats, { x: 200, y: 500 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(gnoll.id, gnoll)
    state.entities.set(front.id, front)
    state.entities.set(back.id, back)

    launchBoomerang(state, gnoll, back, gnollStats.boomerangTravelCells ?? 7.5, gnollStats.damage)

    for (let i = 0; i < 500 && state.boomerangs?.length; i++) {
      tickBoomerangs(state, 16)
    }

    expect(front.hp).toBe(warriorStats.maxHp - gnollStats.damage * 2)
    expect(back.hp).toBe(warriorStats.maxHp - gnollStats.damage * 2)
  })

  it('launches boomerang from gnoll attack instead of instant damage', () => {
    const grid = new Grid()
    const gnoll = new Troop(Owner.PLAYER, gnollStats, { x: 100, y: 500 }, grid, 'gnoll')
    const enemy = new Troop(Owner.BOT, warriorStats, { x: 160, y: 500 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(gnoll.id, gnoll)
    state.entities.set(enemy.id, enemy)
    ;(gnoll as unknown as { attackCooldownMs: number }).attackCooldownMs = 0

    for (let i = 0; i < 20; i++) {
      gnoll.tick(50, state)
      if (state.boomerangs?.length) break
    }

    expect(state.boomerangs?.length).toBe(1)
    expect(state.events.some(e => e.type === 'BOOMERANG')).toBe(true)
  })
})

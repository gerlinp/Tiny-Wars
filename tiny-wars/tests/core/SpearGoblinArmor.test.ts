import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { Grid } from '@core/Grid'
import { Owner } from '@core/types'
import type { EntityStats } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'

describe('Spear Goblins armor (spear_goblin card)', () => {
  const grid = new Grid()
  const guardStats = CARD_DEFINITIONS.spear_goblin!.stats!

  it('declares armor stats on the card', () => {
    expect(guardStats.maxHp).toBe(108)
    expect(guardStats.armorHp).toBe(339)
    expect(guardStats.damage).toBe(155)
    expect(guardStats.attackRange).toBe(1.6)
  })

  it('absorbs damage with armor before body HP', () => {
    const guard = new Troop(Owner.PLAYER, guardStats, { x: 100, y: 100 }, grid, 'spear_goblin')
    expect(guard.getHpFraction()).toBe(1)

    guard.takeDamage(100)
    expect(guard.hp).toBe(108)
    expect(guard.getHpFraction()).toBeLessThan(1)

    guard.takeDamage(250)
    expect(guard.hp).toBeLessThan(108)
    expect(guard.hp).toBeGreaterThan(0)
  })

  it('reports reduced HP fraction when only armor is damaged', () => {
    const stats: EntityStats = { ...guardStats, maxHp: 108, armorHp: 339 }
    const guard = new Troop(Owner.PLAYER, stats, { x: 0, y: 0 }, grid, 'spear_goblin')
    guard.takeDamage(50)
    expect(guard.hp).toBe(108)
    expect(guard.getHpFraction()).toBeCloseTo((108 + 339 - 50) / (108 + 339))
  })
})

import { describe, it, expect } from 'vitest'
import { Troop } from '@core/entities/Troop'
import { createInitialGameState } from '@core/GameState'
import { Owner, UnitType, AttackType } from '@core/types'
import type { EntityStats } from '@core/types'
import { Grid } from '@core/Grid'
import { CARD_DEFINITIONS } from '@data/CardData'
import {
  crSpeedToCellsPerSec,
  CR_SPEED,
  WITCH_MINION_SPAWN_INITIAL_DELAY_MS,
  WITCH_MINION_SPAWN_INTERVAL_MS,
  WITCH_MINION_SPAWN_COUNT,
} from '@data/GameConstants'
import { getAllDeckCandidateIds } from '@data/PlayerDeck'

const spiderStats = CARD_DEFINITIONS.spider!.stats!
const spiderlingStats = CARD_DEFINITIONS.spiderling!.stats!

const warriorStats: EntityStats = {
  maxHp: 2332,
  speed: crSpeedToCellsPerSec(CR_SPEED.medium),
  damage: 267,
  attackRate: 1 / 1.2,
  attackRange: 1.2,
  unitType: UnitType.GROUND,
  attackType: AttackType.GROUND_ONLY,
}

describe('Spider (Witch)', () => {
  it('uses Witch L14 stats with splash and minion spawn config', () => {
    expect(CARD_DEFINITIONS.spider!.elixirCost).toBe(5)
    expect(spiderStats.maxHp).toBe(1111)
    expect(spiderStats.damage).toBe(179)
    expect(spiderStats.attackRate).toBeCloseTo(1 / 1.1, 5)
    expect(spiderStats.attackRange).toBe(5.5)
    expect(spiderStats.splashRadius).toBe(1.5)
    expect(spiderStats.spawnMinionCardId).toBe('spiderling')
    expect(spiderStats.spawnMinionCount).toBe(WITCH_MINION_SPAWN_COUNT)
    expect(spiderStats.spawnMinionIntervalMs).toBe(WITCH_MINION_SPAWN_INTERVAL_MS)
    expect(spiderStats.spawnMinionInitialDelayMs).toBe(WITCH_MINION_SPAWN_INITIAL_DELAY_MS)
  })

  it('spiderlings match skeleton stats and are hidden from the deck builder', () => {
    const skeletonStats = CARD_DEFINITIONS.skeleton!.stats!
    expect(spiderlingStats.maxHp).toBe(skeletonStats.maxHp)
    expect(spiderlingStats.damage).toBe(skeletonStats.damage)
    expect(spiderlingStats.attackRate).toBe(skeletonStats.attackRate)
    expect(spiderlingStats.attackRange).toBe(skeletonStats.attackRange)
    expect(getAllDeckCandidateIds()).toContain('spider')
    expect(getAllDeckCandidateIds()).not.toContain('spiderling')
  })

  it('spawns spiderlings after the initial delay', () => {
    const grid = new Grid()
    const spider = new Troop(Owner.PLAYER, spiderStats, { x: 200, y: 500 }, grid, 'spider')
    const state = createInitialGameState()
    state.entities.set(spider.id, spider)

    spider.tick(WITCH_MINION_SPAWN_INITIAL_DELAY_MS - 1, state)
    expect([...state.entities.values()].filter(e => e.cardId === 'spiderling')).toHaveLength(0)

    spider.tick(1, state)
    const minions = [...state.entities.values()].filter(e => e.cardId === 'spiderling')
    expect(minions).toHaveLength(WITCH_MINION_SPAWN_COUNT)
    expect(minions.every(m => m.owner === Owner.PLAYER)).toBe(true)
  })

  it('continues spawning spiderlings on interval while alive', () => {
    const grid = new Grid()
    const spider = new Troop(Owner.PLAYER, spiderStats, { x: 200, y: 500 }, grid, 'spider')
    const state = createInitialGameState()
    state.entities.set(spider.id, spider)

    spider.tick(WITCH_MINION_SPAWN_INITIAL_DELAY_MS, state)
    expect([...state.entities.values()].filter(e => e.cardId === 'spiderling')).toHaveLength(4)

    spider.tick(WITCH_MINION_SPAWN_INTERVAL_MS, state)
    expect([...state.entities.values()].filter(e => e.cardId === 'spiderling')).toHaveLength(8)
  })

  it('splashes damage on ranged attack', () => {
    const grid = new Grid()
    const spider = new Troop(Owner.PLAYER, spiderStats, { x: 200, y: 500 }, grid, 'spider')
    const primary = new Troop(Owner.BOT, warriorStats, { x: 260, y: 500 }, grid, 'warrior')
    const splash = new Troop(Owner.BOT, warriorStats, { x: 272, y: 508 }, grid, 'warrior')
    const state = createInitialGameState()
    state.entities.set(spider.id, spider)
    state.entities.set(primary.id, primary)
    state.entities.set(splash.id, splash)
    ;(spider as unknown as { attackCooldownMs: number }).attackCooldownMs = 0

    for (let i = 0; i < 40 && primary.hp === warriorStats.maxHp; i++) {
      spider.tick(50, state)
    }

    expect(primary.hp).toBeLessThan(warriorStats.maxHp)
    expect(splash.hp).toBeLessThan(warriorStats.maxHp)
    expect(state.events.some(e => e.type === 'DAMAGE' && e.targetId === splash.id && e.splash)).toBe(true)
  })
})

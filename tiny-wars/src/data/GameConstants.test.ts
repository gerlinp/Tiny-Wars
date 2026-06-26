import { describe, it, expect } from 'vitest'
import {
  CR_SPEED,
  crSpeedToCellsPerSec,
  LEFT_BRIDGE_COLS,
  RIGHT_BRIDGE_COLS,
  LEFT_LANE_COL,
  RIGHT_LANE_COL,
  PLAYER_TOWER_COLS,
  BALANCE_REFERENCE_LEVEL,
} from '@data/GameConstants'
import { CARD_DEFINITIONS } from '@data/CardData'
import { KING_TOWER, PRINCESS_TOWER } from '@data/TowerData'

describe('Arena 26 balance (level 14)', () => {
  it('uses level 14 as the stat reference', () => {
    expect(BALANCE_REFERENCE_LEVEL).toBe(14)
  })

  it('scales crown towers from L11 × ~1.321', () => {
    expect(KING_TOWER.maxHp).toBe(6373)
    expect(KING_TOWER.damage).toBe(144)
    expect(PRINCESS_TOWER.maxHp).toBe(4032)
    expect(PRINCESS_TOWER.damage).toBe(144)
  })

  it('scales key cards to level 14', () => {
    expect(CARD_DEFINITIONS.warrior!.stats.maxHp).toBe(2332)
    expect(CARD_DEFINITIONS.warrior!.stats.damage).toBe(267)
    expect(CARD_DEFINITIONS.lancer!.stats.maxHp).toBe(2542)
    expect(CARD_DEFINITIONS.lancer!.stats.damage).toBe(518)
    expect(CARD_DEFINITIONS.archer!.stats.maxHp).toBe(201)
    expect(CARD_DEFINITIONS.archer!.stats.damage).toBe(148)
    expect(CARD_DEFINITIONS.elite_archer!.stats.maxHp).toBe(955)
    expect(CARD_DEFINITIONS.skeleton!.elixirCost).toBe(1)
    expect(CARD_DEFINITIONS.skeleton!.deployCount).toBe(3)
    expect(CARD_DEFINITIONS.skeleton!.stats.maxHp).toBe(108)
    expect(CARD_DEFINITIONS.skeleton!.stats.damage).toBe(108)
    expect(CARD_DEFINITIONS.skeleton!.stats.attackRate).toBeCloseTo(1 / 1.1, 5)
    expect(CARD_DEFINITIONS.skeleton!.stats.attackRange).toBe(0.5)
    expect(CARD_DEFINITIONS.skeleton!.stats.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.fast))
    expect(CARD_DEFINITIONS.spear_goblin!.elixirCost).toBe(2)
    expect(CARD_DEFINITIONS.spear_goblin!.deployCount).toBe(3)
    expect(CARD_DEFINITIONS.spear_goblin!.stats.maxHp).toBe(176)
    expect(CARD_DEFINITIONS.spear_goblin!.stats.damage).toBe(108)
    expect(CARD_DEFINITIONS.spear_goblin!.stats.attackRate).toBeCloseTo(1 / 1.7, 5)
    expect(CARD_DEFINITIONS.spear_goblin!.stats.attackRange).toBe(5.0)
    expect(CARD_DEFINITIONS.spear_goblin!.stats.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.veryFast))
    expect(CARD_DEFINITIONS.troll!.elixirCost).toBe(5)
    expect(CARD_DEFINITIONS.troll!.stats.maxHp).toBe(5254)
    expect(CARD_DEFINITIONS.troll!.stats.damage).toBe(335)
    expect(CARD_DEFINITIONS.troll!.stats.attackRate).toBeCloseTo(1 / 1.5, 5)
    expect(CARD_DEFINITIONS.troll!.stats.attackRange).toBe(1.2)
    expect(CARD_DEFINITIONS.troll!.stats.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.slow))
    expect(CARD_DEFINITIONS.tnt!.spellStats!.damage).toBe(1960)
  })
})

describe('bridge placement', () => {
  it('aligns each bridge with its princess tower lane', () => {
    expect(LEFT_BRIDGE_COLS).toEqual([3, 4])
    expect(RIGHT_BRIDGE_COLS).toEqual([19, 20])
    expect(LEFT_LANE_COL).toBe(PLAYER_TOWER_COLS[0])
    expect(RIGHT_LANE_COL).toBe(PLAYER_TOWER_COLS[1])
  })
})

describe('crSpeedToCellsPerSec', () => {
  it('maps Medium (60) to 1.5 cells/sec', () => {
    expect(crSpeedToCellsPerSec(CR_SPEED.medium)).toBe(1.5)
  })

  it('maps Very Fast (120) to 3 cells/sec', () => {
    expect(crSpeedToCellsPerSec(CR_SPEED.veryFast)).toBe(3)
  })

  it('maps Fast (90) to 2.25 cells/sec', () => {
    expect(crSpeedToCellsPerSec(CR_SPEED.fast)).toBeCloseTo(2.25, 5)
  })
})

import { describe, it, expect } from 'vitest'
import {
  CR_SPEED,
  crSpeedToCellsPerSec,
  ELIXIR_START,
  ELIXIR_MAX,
  ELIXIR_TRIPLE_MS,
  TIE_BREAK_TOWER_DPS,
  OVERTIME_DURATION_MS,
  GAME_DURATION_MS,
  LEFT_BRIDGE_COLS,
  RIGHT_BRIDGE_COLS,
  LEFT_LANE_COL,
  RIGHT_LANE_COL,
  PLAYER_TOWER_COLS,
  BALANCE_REFERENCE_LEVEL,
} from '@data/GameConstants'
import { CARD_DEFINITIONS } from '@data/CardData'
import { AttackType } from '@core/types'
import { KING_TOWER, PRINCESS_TOWER } from '@data/TowerData'

describe('Arena 26 balance (level 14)', () => {
  it('uses level 14 as the stat reference', () => {
    expect(BALANCE_REFERENCE_LEVEL).toBe(14)
  })

  it('matches Clash Royale starting elixir', () => {
    expect(ELIXIR_START).toBe(5)
    expect(ELIXIR_MAX).toBe(10)
  })

  it('matches Clash Royale overtime rules', () => {
    expect(OVERTIME_DURATION_MS).toBe(120_000)
    expect(ELIXIR_TRIPLE_MS).toBe(900)
    expect(GAME_DURATION_MS).toBe(180_000)
    expect(TIE_BREAK_TOWER_DPS).toBe(60)
  })

  it('scales crown towers from L11 × ~1.321', () => {
    expect(KING_TOWER.maxHp).toBe(6373)
    expect(KING_TOWER.damage).toBe(144)
    expect(PRINCESS_TOWER.maxHp).toBe(4032)
    expect(PRINCESS_TOWER.damage).toBe(144)
  })

  it('scales key cards to level 14', () => {
    expect(CARD_DEFINITIONS.warrior!.stats!.maxHp).toBe(2332)
    expect(CARD_DEFINITIONS.warrior!.stats!.damage).toBe(267)
    expect(CARD_DEFINITIONS.lancer!.stats!.maxHp).toBe(2542)
    expect(CARD_DEFINITIONS.lancer!.stats!.damage).toBe(518)
    expect(CARD_DEFINITIONS.archer!.stats!.maxHp).toBe(201)
    expect(CARD_DEFINITIONS.archer!.stats!.damage).toBe(148)
    expect(CARD_DEFINITIONS.elite_archer!.stats!.maxHp).toBe(955)
    expect(CARD_DEFINITIONS.skeleton!.elixirCost).toBe(1)
    expect(CARD_DEFINITIONS.skeleton!.deployCount).toBe(3)
    expect(CARD_DEFINITIONS.skeleton!.stats!.maxHp).toBe(108)
    expect(CARD_DEFINITIONS.skeleton!.stats!.damage).toBe(108)
    expect(CARD_DEFINITIONS.skeleton!.stats!.attackRate).toBeCloseTo(1 / 1.1, 5)
    expect(CARD_DEFINITIONS.skeleton!.stats!.attackRange).toBe(0.5)
    expect(CARD_DEFINITIONS.skeleton!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.fast))
    expect(CARD_DEFINITIONS.skeleton_army!.elixirCost).toBe(3)
    expect(CARD_DEFINITIONS.skeleton_army!.deployCount).toBe(14)
    expect(CARD_DEFINITIONS.skeleton_army!.stats!.maxHp).toBe(108)
    expect(CARD_DEFINITIONS.skeleton_army!.stats!.damage).toBe(108)
    expect(CARD_DEFINITIONS.spear_goblin!.elixirCost).toBe(2)
    expect(CARD_DEFINITIONS.spear_goblin!.deployCount).toBe(3)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.maxHp).toBe(176)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.damage).toBe(108)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.attackRate).toBeCloseTo(1 / 1.7, 5)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.attackRange).toBe(5.0)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.veryFast))
    expect(CARD_DEFINITIONS.troll!.elixirCost).toBe(5)
    expect(CARD_DEFINITIONS.troll!.stats!.maxHp).toBe(5254)
    expect(CARD_DEFINITIONS.troll!.stats!.damage).toBe(335)
    expect(CARD_DEFINITIONS.troll!.stats!.attackRate).toBeCloseTo(1 / 1.5, 5)
    expect(CARD_DEFINITIONS.troll!.stats!.attackRange).toBe(1.2)
    expect(CARD_DEFINITIONS.troll!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.slow))
    expect(CARD_DEFINITIONS.troll!.stats!.targetsBuildingsOnly).toBe(true)
    expect(CARD_DEFINITIONS.pig_rider!.elixirCost).toBe(4)
    expect(CARD_DEFINITIONS.pig_rider!.stats!.maxHp).toBe(2247)
    expect(CARD_DEFINITIONS.pig_rider!.stats!.damage).toBe(420)
    expect(CARD_DEFINITIONS.pig_rider!.stats!.attackRate).toBeCloseTo(1 / 1.6, 5)
    expect(CARD_DEFINITIONS.pig_rider!.stats!.attackRange).toBe(0.8)
    expect(CARD_DEFINITIONS.pig_rider!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.veryFast))
    expect(CARD_DEFINITIONS.pig_rider!.stats!.targetsBuildingsOnly).toBe(true)
    expect(CARD_DEFINITIONS.bomb_fish!.elixirCost).toBe(2)
    expect(CARD_DEFINITIONS.bomb_fish!.stats!.maxHp).toBe(403)
    expect(CARD_DEFINITIONS.bomb_fish!.stats!.damage).toBe(298)
    expect(CARD_DEFINITIONS.bomb_fish!.stats!.attackRate).toBeCloseTo(1 / 1.8, 5)
    expect(CARD_DEFINITIONS.bomb_fish!.stats!.attackRange).toBe(4.5)
    expect(CARD_DEFINITIONS.bomb_fish!.stats!.splashRadius).toBe(1.5)
    expect(CARD_DEFINITIONS.bomb_fish!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.medium))
    expect(CARD_DEFINITIONS.minotaur!.elixirCost).toBe(7)
    expect(CARD_DEFINITIONS.minotaur!.stats!.maxHp).toBe(4979)
    expect(CARD_DEFINITIONS.minotaur!.stats!.damage).toBe(1081)
    expect(CARD_DEFINITIONS.minotaur!.stats!.attackRate).toBeCloseTo(1 / 1.8, 5)
    expect(CARD_DEFINITIONS.minotaur!.stats!.attackRange).toBe(1.2)
    expect(CARD_DEFINITIONS.minotaur!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.slow))
    expect(CARD_DEFINITIONS.thief!.elixirCost).toBe(3)
    expect(CARD_DEFINITIONS.thief!.stats!.maxHp).toBe(1200)
    expect(CARD_DEFINITIONS.thief!.stats!.damage).toBe(257)
    expect(CARD_DEFINITIONS.thief!.stats!.attackRate).toBeCloseTo(1 / 1.0, 5)
    expect(CARD_DEFINITIONS.thief!.stats!.attackRange).toBe(0.75)
    expect(CARD_DEFINITIONS.thief!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.fast))
    expect(CARD_DEFINITIONS.thief!.stats!.firstHitDamageMultiplier).toBe(2)
    expect(CARD_DEFINITIONS.turtle!.elixirCost).toBe(2)
    expect(CARD_DEFINITIONS.turtle!.stats!.maxHp).toBe(1742)
    expect(CARD_DEFINITIONS.turtle!.stats!.damage).toBe(111)
    expect(CARD_DEFINITIONS.turtle!.stats!.attackRate).toBeCloseTo(1 / 2.5, 5)
    expect(CARD_DEFINITIONS.turtle!.stats!.attackRange).toBe(0.75)
    expect(CARD_DEFINITIONS.turtle!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.verySlow))
    expect(CARD_DEFINITIONS.turtle!.stats!.targetsBuildingsOnly).toBe(true)
    expect(CARD_DEFINITIONS.turtle!.stats!.deathSplashRadius).toBe(2)
    expect(CARD_DEFINITIONS.turtle!.stats!.deathSplashDamage).toBe(111)
    expect(CARD_DEFINITIONS.turtle!.stats!.deathSlowDurationMs).toBe(2000)
    expect(CARD_DEFINITIONS.turtle!.stats!.deathSlowSpeedMultiplier).toBe(0.7)
    expect(CARD_DEFINITIONS.panda!.elixirCost).toBe(4)
    expect(CARD_DEFINITIONS.panda!.stats!.maxHp).toBe(2525)
    expect(CARD_DEFINITIONS.panda!.stats!.damage).toBe(352)
    expect(CARD_DEFINITIONS.panda!.stats!.attackRate).toBeCloseTo(1 / 1.5, 5)
    expect(CARD_DEFINITIONS.panda!.stats!.attackRange).toBe(1.2)
    expect(CARD_DEFINITIONS.panda!.stats!.splashRadius).toBe(2)
    expect(CARD_DEFINITIONS.panda!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.medium))
    expect(CARD_DEFINITIONS.monk!.elixirCost).toBe(4)
    expect(CARD_DEFINITIONS.monk!.stats!.maxHp).toBe(2274)
    expect(CARD_DEFINITIONS.monk!.stats!.damage).toBe(196)
    expect(CARD_DEFINITIONS.monk!.stats!.attackRate).toBeCloseTo(1 / 1.5, 5)
    expect(CARD_DEFINITIONS.monk!.stats!.attackRange).toBe(1.6)
    expect(CARD_DEFINITIONS.monk!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.medium))
    expect(CARD_DEFINITIONS.monk!.stats!.healPerPulse).toBe(34)
    expect(CARD_DEFINITIONS.monk!.stats!.healPulseCount).toBe(4)
    expect(CARD_DEFINITIONS.monk!.stats!.healRadius).toBe(4)
    expect(CARD_DEFINITIONS.monk!.stats!.spawnHealPerPulse).toBe(67)
    expect(CARD_DEFINITIONS.monk!.stats!.spawnHealPulseCount).toBe(4)
    expect(CARD_DEFINITIONS.monk!.stats!.spawnHealRadius).toBe(2.5)
    expect(CARD_DEFINITIONS.gnoll!.elixirCost).toBe(5)
    expect(CARD_DEFINITIONS.gnoll!.stats!.maxHp).toBe(1695)
    expect(CARD_DEFINITIONS.gnoll!.stats!.damage).toBe(223)
    expect(CARD_DEFINITIONS.gnoll!.stats!.attackRate).toBeCloseTo(1 / 2.4, 5)
    expect(CARD_DEFINITIONS.gnoll!.stats!.attackRange).toBe(4.5)
    expect(CARD_DEFINITIONS.gnoll!.stats!.splashRadius).toBe(1.5)
    expect(CARD_DEFINITIONS.gnoll!.stats!.boomerangAttack).toBe(true)
    expect(CARD_DEFINITIONS.gnoll!.stats!.boomerangTravelCells).toBe(7.5)
    expect(CARD_DEFINITIONS.wood_tower!.elixirCost).toBe(4)
    expect(CARD_DEFINITIONS.wood_tower!.stats!.attackType).toBe(AttackType.GROUND_ONLY)
    expect(CARD_DEFINITIONS.wood_tower!.stats!.splashRadius).toBe(1.5)
    expect(CARD_DEFINITIONS.wood_tower!.stats!.deathSplashRadius).toBe(3)
    expect(CARD_DEFINITIONS.tnt!.spellStats!.damage).toBe(1960)
  })
})

describe('bridge placement', () => {
  it('aligns each 3-wide bridge centred on its princess tower lane', () => {
    expect(LEFT_BRIDGE_COLS).toEqual([3, 4, 5])
    expect(RIGHT_BRIDGE_COLS).toEqual([18, 19, 20])
    expect(LEFT_LANE_COL).toBe(PLAYER_TOWER_COLS[0])
    expect(RIGHT_LANE_COL).toBe(PLAYER_TOWER_COLS[1])
    // Tower lane column sits at the centre of its bridge
    expect(LEFT_BRIDGE_COLS).toContain(PLAYER_TOWER_COLS[0])
    expect(RIGHT_BRIDGE_COLS).toContain(PLAYER_TOWER_COLS[1])
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

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
  BRIDGE_SPAN,
  GRID_COLS,
  BALANCE_REFERENCE_LEVEL,
} from '@data/GameConstants'
import {
  THIEF_DASH_RANGE_CELLS,
  MONK_HEAL_PER_PULSE, MONK_HEAL_PULSE_COUNT, MONK_HEAL_RADIUS,
  MONK_SPAWN_HEAL_PER_PULSE, MONK_SPAWN_HEAL_PULSE_COUNT, MONK_SPAWN_HEAL_RADIUS,
  GNOLL_BOOMERANG_TRAVEL_CELLS,
  SPIDER_MINION_CARD_ID,
} from '@data/CardAbilities'
import { CARD_DEFINITIONS } from '@data/CardData'
import { AttackType, UnitType } from '@core/types'
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
    expect(CARD_DEFINITIONS.spear_goblin!.elixirCost).toBe(3)
    expect(CARD_DEFINITIONS.spear_goblin!.deployCount).toBe(3)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.maxHp).toBe(280)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.armorHp).toBe(339)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.damage).toBe(127)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.attackRate).toBeCloseTo(1 / 1.1, 5)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.attackRange).toBe(1.6)
    expect(CARD_DEFINITIONS.spear_goblin!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.fast))
    expect(CARD_DEFINITIONS.villagers!.elixirCost).toBe(2)
    expect(CARD_DEFINITIONS.villagers!.deployCount).toBe(3)
    expect(CARD_DEFINITIONS.villagers!.stats!.maxHp).toBe(289)
    expect(CARD_DEFINITIONS.villagers!.stats!.damage).toBe(255)
    expect(CARD_DEFINITIONS.villagers!.stats!.attackRate).toBeCloseTo(1 / 1.1, 5)
    expect(CARD_DEFINITIONS.villagers!.stats!.attackRange).toBe(0.5)
    expect(CARD_DEFINITIONS.villagers!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.veryFast))
    expect(CARD_DEFINITIONS.troll!.elixirCost).toBe(5)
    expect(CARD_DEFINITIONS.troll!.stats!.maxHp).toBe(6392)
    expect(CARD_DEFINITIONS.troll!.stats!.damage).toBe(214)
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
    expect(CARD_DEFINITIONS.pig!.elixirCost).toBe(5)
    expect(CARD_DEFINITIONS.pig!.deployCount).toBe(4)
    expect(CARD_DEFINITIONS.pig!.stats!.maxHp).toBe(1108)
    expect(CARD_DEFINITIONS.pig!.stats!.damage).toBe(98)
    expect(CARD_DEFINITIONS.pig!.stats!.attackRate).toBeCloseTo(1 / 1.2, 5)
    expect(CARD_DEFINITIONS.pig!.stats!.attackRange).toBe(0.7)
    expect(CARD_DEFINITIONS.pig!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.veryFast))
    expect(CARD_DEFINITIONS.pig!.stats!.targetsBuildingsOnly).toBe(true)
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
    expect(THIEF_DASH_RANGE_CELLS).toBe(4)
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
    expect(MONK_HEAL_PER_PULSE).toBe(34)
    expect(MONK_HEAL_PULSE_COUNT).toBe(4)
    expect(MONK_HEAL_RADIUS).toBe(4)
    expect(MONK_SPAWN_HEAL_PER_PULSE).toBe(67)
    expect(MONK_SPAWN_HEAL_PULSE_COUNT).toBe(4)
    expect(MONK_SPAWN_HEAL_RADIUS).toBe(2.5)
    expect(CARD_DEFINITIONS.gnoll!.elixirCost).toBe(5)
    expect(CARD_DEFINITIONS.gnoll!.stats!.maxHp).toBe(1695)
    expect(CARD_DEFINITIONS.gnoll!.stats!.damage).toBe(223)
    expect(CARD_DEFINITIONS.gnoll!.stats!.attackRate).toBeCloseTo(1 / 2.4, 5)
    expect(CARD_DEFINITIONS.gnoll!.stats!.attackRange).toBe(4.5)
    expect(CARD_DEFINITIONS.gnoll!.stats!.splashRadius).toBe(1.5)
    expect(GNOLL_BOOMERANG_TRAVEL_CELLS).toBe(7.5)
    expect(CARD_DEFINITIONS.spider!.elixirCost).toBe(5)
    expect(CARD_DEFINITIONS.spider!.stats!.maxHp).toBe(1111)
    expect(CARD_DEFINITIONS.spider!.stats!.damage).toBe(179)
    expect(CARD_DEFINITIONS.spider!.stats!.attackRange).toBe(5.5)
    expect(CARD_DEFINITIONS.spider!.stats!.splashRadius).toBe(1.5)
    expect(SPIDER_MINION_CARD_ID).toBe('spiderling')
    expect(CARD_DEFINITIONS.bear!.elixirCost).toBe(7)
    expect(CARD_DEFINITIONS.bear!.displayName).toBe('Bear')
    expect(CARD_DEFINITIONS.bear!.stats!.maxHp).toBe(5288)
    expect(CARD_DEFINITIONS.bear!.stats!.damage).toBe(355)
    expect(CARD_DEFINITIONS.bear!.stats!.attackRate).toBeCloseTo(1 / 1.7, 5)
    expect(CARD_DEFINITIONS.bear!.stats!.attackRange).toBe(1.2)
    expect(CARD_DEFINITIONS.bear!.stats!.splashRadius).toBe(1.3)
    expect(CARD_DEFINITIONS.bear!.stats!.unitType).toBe(UnitType.GROUND)
    expect(CARD_DEFINITIONS.bear!.stats!.attackType).toBe(AttackType.GROUND_ONLY)
    expect(CARD_DEFINITIONS.bear!.stats!.speed).toBe(crSpeedToCellsPerSec(CR_SPEED.medium))
    expect(CARD_DEFINITIONS.wood_tower!.elixirCost).toBe(4)
    expect(CARD_DEFINITIONS.wood_tower!.stats!.attackType).toBe(AttackType.GROUND_ONLY)
    expect(CARD_DEFINITIONS.wood_tower!.stats!.splashRadius).toBe(1.5)
    expect(CARD_DEFINITIONS.wood_tower!.stats!.deathSplashRadius).toBe(3)
    expect(CARD_DEFINITIONS.tnt!.spellStats!.damage).toBe(1960)
  })
})

describe('bridge placement', () => {
  it('aligns each bridge centred on its princess tower lane', () => {
    expect(LEFT_BRIDGE_COLS).toEqual([2, 3, 4])
    expect(RIGHT_BRIDGE_COLS).toEqual([13, 14, 15])
    expect(LEFT_LANE_COL).toBe(PLAYER_TOWER_COLS[0])
    expect(RIGHT_LANE_COL).toBe(PLAYER_TOWER_COLS[1])
    // Tower lane column sits at the centre of its bridge
    expect(LEFT_BRIDGE_COLS).toContain(PLAYER_TOWER_COLS[0])
    expect(RIGHT_BRIDGE_COLS).toContain(PLAYER_TOWER_COLS[1])
  })

  it('mirrors each bridge column across the grid centre', () => {
    for (let i = 0; i < BRIDGE_SPAN; i++) {
      expect(RIGHT_BRIDGE_COLS[BRIDGE_SPAN - 1 - i]).toBe(GRID_COLS - 1 - LEFT_BRIDGE_COLS[i]!)
    }
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

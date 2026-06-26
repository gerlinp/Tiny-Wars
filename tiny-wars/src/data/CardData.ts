import { CardType, UnitType, AttackType } from '@core/types'
import type { CardDefinition, EntityStats, SpellStats } from '@core/types'
import { BOMB_TOWER_LIFETIME_MS, CR_SPEED, crSpeedToCellsPerSec } from '@data/GameConstants'

function troop(
  id: string,
  displayName: string,
  elixirCost: number,
  stats: EntityStats,
  textureKeyPlayer: string,
  textureKeyBot: string,
  deployCount = 1,
): CardDefinition {
  return {
    id,
    displayName,
    elixirCost,
    cardType: CardType.TROOP,
    stats,
    textureKeyPlayer,
    textureKeyBot,
    deployCount,
  }
}

function building(
  id: string,
  displayName: string,
  elixirCost: number,
  stats: EntityStats,
  textureKeyPlayer: string,
  textureKeyBot: string,
): CardDefinition {
  return { id, displayName, elixirCost, cardType: CardType.BUILDING, stats, textureKeyPlayer, textureKeyBot }
}

function spell(
  id: string,
  displayName: string,
  elixirCost: number,
  spellStats: SpellStats,
  textureKeyPlayer: string,
  textureKeyBot: string,
): CardDefinition {
  return {
    id,
    displayName,
    elixirCost,
    cardType: CardType.SPELL,
    spellStats,
    textureKeyPlayer,
    textureKeyBot,
  }
}

/** Stats tuned to Clash Royale equivalents at {@link BALANCE_REFERENCE_LEVEL} (level 14).
 *  HP and damage scaled from L11 baseline × 1.321 (~9.7%/level over 3 levels).
 *  Attack speed, range, and movement speed do not change with CR card level. */
export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  warrior: troop('warrior', 'Warrior', 3, {
    maxHp: 2332,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 267,
    attackRate: 1 / 1.2,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'warrior_blue_idle', 'warrior_red_idle'),

  archer: troop('archer', 'Archers', 3, {
    maxHp: 201,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 148,
    attackRate: 1 / 0.9,
    attackRange: 5.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
  }, 'archer_blue_idle', 'archer_red_idle', 2),

  pawn: troop('pawn', 'Pawn', 3, {
    maxHp: 1406,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 211,
    attackRate: 1 / 1.2,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'pawn_blue_idle', 'pawn_red_idle'),

  /** Clash Royale {@link https://liquipedia.net/clashroyale/Prince Prince} L14 — base melee (charge omitted). */
  lancer: troop('lancer', 'Lancer', 5, {
    maxHp: 2542,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 518,
    attackRate: 1 / 1.4,
    attackRange: 1.6,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'lancer_blue_idle', 'lancer_red_idle'),

  wizard: troop('wizard', 'Wizard', 5, {
    maxHp: 997,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 371,
    attackRate: 1 / 1.4,
    attackRange: 5.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
    splashRadius: 1.5,
  }, 'wizard_blue_idle', 'wizard_red_idle'),

  torch_goblin: troop('torch_goblin', 'Torch Goblin', 3, {
    maxHp: 345,
    speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
    damage: 199,
    attackRate: 1 / 0.8,
    attackRange: 6.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
  }, 'torch_goblin_blue_idle', 'torch_goblin_red_idle'),

  arrows: spell('arrows', 'Arrows', 3, {
    damage: 404, radius: 4, duration: 0, delivery: 'arrows',
  }, 'arrow_blue', 'arrow_red'),

  wood_tower: building('wood_tower', 'Bomb Tower', 4, {
    maxHp: 1791,
    speed: 0,
    damage: 293,
    attackRate: 1 / 1.8,
    attackRange: 6.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    splashRadius: 1.5,
    deathSplashRadius: 3,
    lifetimeMs: BOMB_TOWER_LIFETIME_MS,
  }, 'wood_tower_blue_sheet', 'wood_tower_red_sheet'),

  tnt: spell('tnt', 'Rocket', 6, {
    damage: 1960, radius: 2, duration: 0, groundOnly: true, delivery: 'rocket',
  }, 'bomb_idle', 'bomb_idle'),
}

/** Disabled from match decks — card/building code kept for when bugs are fixed. */
export const DECK_EXCLUDED_CARD_IDS = ['wood_tower'] as const

const ALL_DECK_CARD_IDS: string[] = [
  'warrior', 'archer', 'pawn', 'lancer', 'wizard', 'torch_goblin', 'arrows', 'wood_tower', 'tnt',
]

export const DEFAULT_DECK: string[] = ALL_DECK_CARD_IDS.filter(
  id => !(DECK_EXCLUDED_CARD_IDS as readonly string[]).includes(id),
)

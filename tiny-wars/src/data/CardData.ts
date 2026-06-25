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

/** Stats tuned to Clash Royale equivalents at {@link BALANCE_REFERENCE_LEVEL}. */
export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  warrior: troop('warrior', 'Warrior', 3, {
    maxHp: 1766,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 202,
    attackRate: 1 / 1.2,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'warrior_blue_idle', 'warrior_red_idle'),

  archer: troop('archer', 'Archers', 3, {
    maxHp: 152,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 112,
    attackRate: 1 / 0.9,
    attackRange: 5.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
  }, 'archer_blue_idle', 'archer_red_idle', 2),

  pawn: troop('pawn', 'Pawn', 3, {
    maxHp: 1064,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 160,
    attackRate: 1 / 1.2,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'pawn_blue_idle', 'pawn_red_idle'),

  wizard: troop('wizard', 'Wizard', 5, {
    maxHp: 755,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 281,
    attackRate: 1 / 1.4,
    attackRange: 5.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
    splashRadius: 1.5,
  }, 'wizard_blue_idle', 'wizard_red_idle'),

  torch_goblin: troop('torch_goblin', 'Torch Goblin', 3, {
    maxHp: 261,
    speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
    damage: 151,
    attackRate: 1 / 0.8,
    attackRange: 6.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
  }, 'torch_goblin_blue_idle', 'torch_goblin_red_idle'),

  arrows: spell('arrows', 'Arrows', 3, {
    damage: 306, radius: 4, duration: 0, delivery: 'arrows',
  }, 'arrow_blue', 'arrow_red'),

  wood_tower: building('wood_tower', 'Bomb Tower', 4, {
    maxHp: 1356,
    speed: 0,
    damage: 222,
    attackRate: 1 / 1.8,
    attackRange: 6.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    splashRadius: 1.5,
    deathSplashRadius: 3,
    lifetimeMs: BOMB_TOWER_LIFETIME_MS,
  }, 'wood_tower_blue_sheet', 'wood_tower_red_sheet'),

  tnt: spell('tnt', 'Rocket', 6, {
    damage: 1484, radius: 2, duration: 0, groundOnly: true, delivery: 'rocket',
  }, 'bomb_idle', 'bomb_idle'),
}

export const DEFAULT_DECK: string[] = [
  'warrior', 'archer', 'pawn', 'wizard', 'torch_goblin', 'arrows', 'wood_tower',
  'tnt',
]

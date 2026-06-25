import { CardType, UnitType, AttackType } from '@core/types'
import type { CardDefinition, EntityStats, SpellStats } from '@core/types'

function troop(
  id: string,
  displayName: string,
  elixirCost: number,
  stats: EntityStats,
  textureKeyPlayer: string,
  textureKeyBot: string,
): CardDefinition {
  return { id, displayName, elixirCost, cardType: CardType.TROOP, stats, textureKeyPlayer, textureKeyBot }
}

function spell(
  id: string,
  displayName: string,
  elixirCost: number,
  stats: SpellStats,
  textureKeyPlayer: string,
  textureKeyBot: string,
): CardDefinition {
  return { id, displayName, elixirCost, cardType: CardType.SPELL, stats, textureKeyPlayer, textureKeyBot }
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

export const CARD_DEFINITIONS: Record<string, CardDefinition> = {
  warrior: troop('warrior', 'Warrior', 4, {
    maxHp: 2000, speed: 1.5, damage: 126, attackRate: 1.0,
    attackRange: 1.2, unitType: UnitType.GROUND, attackType: AttackType.GROUND_ONLY,
  }, 'warrior_blue_idle', 'warrior_red_idle'),

  archer: troop('archer', 'Archer', 2, {
    maxHp: 125, speed: 2.0, damage: 33, attackRate: 1.0,
    attackRange: 5.0, unitType: UnitType.GROUND, attackType: AttackType.AIR_AND_GROUND,
  }, 'archer_blue_idle', 'archer_red_idle'),

  pawn: troop('pawn', 'Pawn', 3, {
    maxHp: 300, speed: 2.5, damage: 75, attackRate: 1.0,
    attackRange: 1.2, unitType: UnitType.GROUND, attackType: AttackType.GROUND_ONLY,
  }, 'pawn_blue_idle', 'pawn_red_idle'),

  torch_goblin: troop('torch_goblin', 'Torch Goblin', 4, {
    maxHp: 340, speed: 2.0, damage: 130, attackRate: 1.0,
    attackRange: 5.0, unitType: UnitType.GROUND, attackType: AttackType.AIR_AND_GROUND,
  }, 'torch_goblin_blue_sheet', 'torch_goblin_red_sheet'),

  tnt: spell('tnt', 'TNT', 3, {
    damage: 325, radius: 2.5, duration: 0,
  }, 'tnt_blue_sheet', 'tnt_red_sheet'),

  barrel: troop('barrel', 'Barrel', 5, {
    maxHp: 380, speed: 2.0, damage: 60, attackRate: 0.8,
    attackRange: 1.2, unitType: UnitType.GROUND, attackType: AttackType.GROUND_ONLY,
  }, 'barrel_blue_sheet', 'barrel_red_sheet'),

  wood_tower: building('wood_tower', 'Wood Tower', 2, {
    maxHp: 800, speed: 0, damage: 210, attackRate: 1.5,
    attackRange: 6.0, unitType: UnitType.GROUND, attackType: AttackType.AIR_AND_GROUND,
    lifetimeMs: 90_000,
  }, 'wood_tower_blue_sheet', 'wood_tower_red_sheet'),
}

export const DEFAULT_DECK: string[] = [
  'warrior', 'archer', 'pawn', 'torch_goblin', 'tnt', 'barrel', 'wood_tower', 'archer',
]

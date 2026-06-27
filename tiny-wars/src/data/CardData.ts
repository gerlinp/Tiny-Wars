import { CardType, UnitType, AttackType } from '@core/types'
import type { CardDefinition, EntityStats, SpellStats } from '@core/types'
import { BOMB_TOWER_LIFETIME_MS, CR_SPEED, crSpeedToCellsPerSec, LANCER_CHARGE_DAMAGE_MULT, LANCER_CHARGE_DISTANCE_CELLS, LANCER_CHARGE_SPEED_MULT } from '@data/GameConstants'

function troop(
  id: string,
  displayName: string,
  description: string,
  elixirCost: number,
  stats: EntityStats,
  textureKeyPlayer: string,
  textureKeyBot: string,
  deployCount = 1,
): CardDefinition {
  return {
    id,
    displayName,
    description,
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
  description: string,
  elixirCost: number,
  stats: EntityStats,
  textureKeyPlayer: string,
  textureKeyBot: string,
): CardDefinition {
  return { id, displayName, description, elixirCost, cardType: CardType.BUILDING, stats, textureKeyPlayer, textureKeyBot }
}

function spell(
  id: string,
  displayName: string,
  description: string,
  elixirCost: number,
  spellStats: SpellStats,
  textureKeyPlayer: string,
  textureKeyBot: string,
): CardDefinition {
  return {
    id,
    displayName,
    description,
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
  warrior: troop('warrior', 'Warrior',
    'A sturdy melee fighter with balanced stats. Reliable in any deck.',
    3, {
    maxHp: 2332,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 267,
    attackRate: 1 / 1.2,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'warrior_blue_idle', 'warrior_red_idle'),

  /** Clash Royale {@link https://liquipedia.net/clashroyale/Archers Archers} L14 — ×2 deploy, Knights faction art. */
  archer: troop('archer', 'Archers',
    'A pair of archers who attack from range. Can target both air and ground units.',
    3, {
    maxHp: 201,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 148,
    attackRate: 1 / 0.9,
    attackRange: 5.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
  }, 'knights_archer_blue_sheet', 'knights_archer_red_sheet', 2),

  /** Clash Royale {@link https://liquipedia.net/clashroyale/Musketeer Musketeer} L14 — single ranged troop. */
  elite_archer: troop('elite_archer', 'Elite Archer',
    'A skilled lone archer with high damage output and exceptional range.',
    4, {
    maxHp: 955,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 288,
    attackRate: 1 / 1.0,
    attackRange: 6.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
  }, 'archer_blue_idle', 'archer_red_idle'),

  pawn: troop('pawn', 'Pawn',
    'A basic melee soldier. Cheap and easy to deploy in large numbers.',
    3, {
    maxHp: 1406,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 211,
    attackRate: 1 / 1.2,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'pawn_blue_idle', 'pawn_red_idle'),

  /** Clash Royale {@link https://liquipedia.net/clashroyale/Skeletons Skeletons} L14 — ×3 deploy. */
  skeleton: troop('skeleton', 'Skeletons',
    'Three fragile but fast skeletons. Cheap distraction that overwhelms through numbers.',
    1, {
    maxHp: 108,
    speed: crSpeedToCellsPerSec(CR_SPEED.fast),
    damage: 108,
    attackRate: 1 / 1.1,
    attackRange: 0.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'skeleton_blue_idle', 'skeleton_red_idle', 3),

  /** Clash Royale {@link https://liquipedia.net/clashroyale/Spear_Goblins Spear Goblins} L14 — ×3 deploy. */
  spear_goblin: troop('spear_goblin', 'Spear Goblins',
    'Three very fast goblins hurling spears from range. Can hit air and ground.',
    2, {
    maxHp: 176,
    speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
    damage: 108,
    attackRate: 1 / 1.7,
    attackRange: 5.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
  }, 'spear_goblin_blue_idle', 'spear_goblin_red_idle', 3),

  /** Clash Royale {@link https://liquipedia.net/clashroyale/Giant Giant} L14 stats — Troll art. */
  troll: troop('troll', 'Troll',
    'A massive brute who targets only buildings and towers. Extremely high HP.',
    5, {
    maxHp: 5254,
    speed: crSpeedToCellsPerSec(CR_SPEED.slow),
    damage: 335,
    attackRate: 1 / 1.5,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    targetsBuildingsOnly: true,
  }, 'troll_blue_idle', 'troll_red_idle'),

  /** Clash Royale {@link https://liquipedia.net/clashroyale/Prince Prince} L14 — melee with charge. */
  lancer: troop('lancer', 'Lancer',
    'Builds up a devastating charge over distance, doubling speed and damage on impact.',
    5, {
    maxHp: 2542,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 518,
    attackRate: 1 / 1.4,
    attackRange: 1.6,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    chargeDistanceCells: LANCER_CHARGE_DISTANCE_CELLS,
    chargeSpeedMultiplier: LANCER_CHARGE_SPEED_MULT,
    chargeDamageMultiplier: LANCER_CHARGE_DAMAGE_MULT,
  }, 'lancer_blue_idle', 'lancer_red_idle'),

  wizard: troop('wizard', 'Wizard',
    'Launches splash fireballs that damage all nearby enemies. Hits air and ground.',
    5, {
    maxHp: 997,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 371,
    attackRate: 1 / 1.4,
    attackRange: 5.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
    splashRadius: 1.5,
  }, 'wizard_blue_idle', 'wizard_red_idle'),

  lizard: troop('lizard', 'Lizard',
    'A flying lizard that breathes fire with wide splash. Attacks air and ground.',
    4, {
    maxHp: 1064,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 133,
    attackRate: 1 / 1.8,
    attackRange: 3.5,
    unitType: UnitType.AIR,
    attackType: AttackType.AIR_AND_GROUND,
    splashRadius: 2.5,
  }, 'lizard_blue_idle', 'lizard_red_idle'),

  torch_goblin: troop('torch_goblin', 'Torch Goblin',
    'A very fast goblin lobbing fire at rapid pace. Effective at range against air and ground.',
    3, {
    maxHp: 466,
    speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
    damage: 199,
    attackRate: 1 / 0.7,
    attackRange: 7.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
  }, 'torch_goblin_blue_idle', 'torch_goblin_red_idle'),

  /** L14 stats — fast building-only melee. */
  pig_rider: troop('pig_rider', 'Pig Rider',
    'A fast rider on a pig who ignores enemy troops and charges straight for buildings.',
    4, {
    maxHp: 2247,
    speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
    damage: 420,
    attackRate: 1 / 1.6,
    attackRange: 0.8,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    targetsBuildingsOnly: true,
  }, 'pig_rider_blue_idle', 'pig_rider_red_idle'),

  /** L14 stats — ranged ground splash. */
  bomb_fish: troop('bomb_fish', 'Bomb Fish',
    'A lightly protected fish who lobs explosives with area damage at ground targets.',
    2, {
    maxHp: 403,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 298,
    attackRate: 1 / 1.8,
    attackRange: 4.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    splashRadius: 1.5,
  }, 'bomb_fish_blue_idle', 'bomb_fish_red_idle'),

  /** L14 stats — slow heavy melee. */
  minotaur: troop('minotaur', 'Minotaur',
    'A heavily armored brute with massive single-target damage. Slow but devastating.',
    7, {
    maxHp: 4979,
    speed: crSpeedToCellsPerSec(CR_SPEED.slow),
    damage: 1081,
    attackRate: 1 / 1.8,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'minotaur_blue_idle', 'minotaur_red_idle'),

  /** L14 stats — fast melee with a heavy opening strike. */
  rogue: troop('rogue', 'Rogue',
    'A quick knife fighter who lands an extra-powerful blow on the first hit.',
    3, {
    maxHp: 1200,
    speed: crSpeedToCellsPerSec(CR_SPEED.fast),
    damage: 257,
    attackRate: 1 / 1.0,
    attackRange: 0.75,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    firstHitDamageMultiplier: 2,
  }, 'rogue_blue_idle', 'rogue_red_idle'),

  /** L14 stats — cheap building tank with a slowing death burst. */
  turtle: troop('turtle', 'Turtle',
    'A slow, tough fighter who targets buildings and chills nearby enemies when destroyed.',
    2, {
    maxHp: 1742,
    speed: crSpeedToCellsPerSec(CR_SPEED.verySlow),
    damage: 111,
    attackRate: 1 / 2.5,
    attackRange: 0.75,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    targetsBuildingsOnly: true,
    deathSplashRadius: 2,
    deathSplashDamage: 111,
    deathSlowDurationMs: 2000,
    deathSlowSpeedMultiplier: 0.7,
  }, 'turtle_blue_idle', 'turtle_red_idle'),

  /** L14 stats — tough melee with wide spinning area damage. */
  panda: troop('panda', 'Panda',
    'A sturdy fighter who cleaves all nearby enemies with each sweeping strike.',
    4, {
    maxHp: 2525,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 352,
    attackRate: 1 / 1.5,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    splashRadius: 2,
  }, 'panda_blue_idle', 'panda_red_idle'),

  arrows: spell('arrows', 'Arrows',
    'A volley of arrows that rains down on an area. Cheap and effective at clearing swarms.',
    3, {
    damage: 404, radius: 4, duration: 0, delivery: 'arrows',
  }, 'arrow_blue', 'arrow_red'),

  wood_tower: building('wood_tower', 'Bomb Tower',
    'A stationary tower lobbing bombs with area damage. Explodes in a large blast on destruction.',
    4, {
    maxHp: 1791,
    speed: 0,
    damage: 293,
    attackRate: 1 / 1.8,
    attackRange: 7.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    splashRadius: 1.5,
    deathSplashRadius: 3,
    lifetimeMs: BOMB_TOWER_LIFETIME_MS,
  }, 'wood_tower_blue_sheet', 'wood_tower_red_sheet'),

  tnt: spell('tnt', 'Bomb',
    'A high-damage bomb hurled at ground targets. Devastating against single targets and buildings.',
    6, {
    damage: 1960, radius: 2, duration: 0, groundOnly: true, delivery: 'rocket',
  }, 'bomb_idle', 'bomb_idle'),
}

/** Disabled from match decks — card/building code kept for when bugs are fixed. */
export const DECK_EXCLUDED_CARD_IDS = ['wood_tower'] as const

const ALL_DECK_CARD_IDS: string[] = [
  'warrior', 'archer', 'skeleton', 'lancer', 'wizard', 'torch_goblin', 'arrows', 'wood_tower', 'tnt',
]

export const DEFAULT_DECK: string[] = ALL_DECK_CARD_IDS.filter(
  id => !(DECK_EXCLUDED_CARD_IDS as readonly string[]).includes(id),
)

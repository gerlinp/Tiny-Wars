import { CardType, UnitType, AttackType } from '@core/types'
import type { CardDefinition, EntityStats, SpellStats } from '@core/types'
import { BOMB_TOWER_LIFETIME_MS, CR_SPEED, crSpeedToCellsPerSec } from '@data/GameConstants'

function troop(
  id: string,
  displayName: string,
  description: string,
  elixirCost: number,
  stats: EntityStats,
  textureKeyPlayer: string,
  textureKeyBot: string,
  deployCount = 1,
): Omit<CardDefinition, 'addedAt'> {
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
): Omit<CardDefinition, 'addedAt'> {
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
): Omit<CardDefinition, 'addedAt'> {
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

/** Stats tuned at {@link BALANCE_REFERENCE_LEVEL}. HP and damage scaled from L11 baseline × 1.321. */

/** Parse a stable ISO timestamp for when a card id first entered the collection. */
const AT = (iso: string): number => Date.parse(iso)

/**
 * First-added timestamps keyed by card id — merged onto {@link CARD_DEFINITIONS} as `addedAt`.
 * Never change an existing entry when renaming a card; add a new id with a new date.
 */
export const CARD_ADDED_AT: Readonly<Record<string, number>> = {
  warrior:       AT('2024-06-01T12:00:00.000Z'),
  archer:        AT('2024-06-08T12:00:00.000Z'),
  skeleton:      AT('2024-06-15T12:00:00.000Z'),
  lancer:        AT('2024-06-22T12:00:00.000Z'),
  arrows:        AT('2024-07-08T12:00:00.000Z'),
  elite_archer:  AT('2024-07-15T12:00:00.000Z'),
  skeleton_army: AT('2026-05-15T12:00:00.000Z'),
  villagers:     AT('2026-06-24T12:00:00.000Z'),
  spear_goblin:  AT('2026-06-24T15:00:00.000Z'),
  troll:         AT('2024-09-15T12:00:00.000Z'),
  lizard:        AT('2024-10-01T12:00:00.000Z'),
  pig_rider:     AT('2024-11-01T12:00:00.000Z'),
  bomb_fish:     AT('2024-11-15T12:00:00.000Z'),
  goblin_demolisher: AT('2026-06-29T12:00:00.000Z'),
  minotaur:      AT('2025-01-01T12:00:00.000Z'),
  thief:         AT('2025-02-01T12:00:00.000Z'),
  turtle:        AT('2025-03-01T12:00:00.000Z'),
  panda:         AT('2025-04-01T12:00:00.000Z'),
  wood_tower:    AT('2025-05-01T12:00:00.000Z'),
  gnoll:         AT('2025-06-01T12:00:00.000Z'),
  monk:          AT('2026-01-01T12:00:00.000Z'),
  harpoon_shark: AT('2026-06-24T18:00:00.000Z'),
  air_boat:      AT('2026-06-29T18:00:00.000Z'),
  pig:           AT('2026-06-30T12:00:00.000Z'),
  bear:          AT('2025-07-01T12:00:00.000Z'),
  big_bomb:      AT('2026-06-01T12:00:00.000Z'),
  goblin_barrel: AT('2026-06-28T12:00:00.000Z'),
  spider:           AT('2026-06-28T18:00:00.000Z'),
  spiderling:       AT('2026-06-28T18:00:00.000Z'),
  pig_shaman:       AT('2026-06-30T12:00:00.000Z'),
  snake:            AT('2026-06-30T12:00:00.000Z'),
  miner:            AT('2026-07-07T12:00:00.000Z'),
  fire_goblin:      AT('2026-07-08T12:00:00.000Z'),
  tnt_barrel:       AT('2026-07-08T18:00:00.000Z'),
  torch:            AT('2026-07-09T12:00:00.000Z'),
  goblins:          AT('2026-07-09T14:00:00.000Z'),
}

function withAddedAtTimestamps(
  defs: Record<string, Omit<CardDefinition, 'addedAt'>>,
): Record<string, CardDefinition> {
  return Object.fromEntries(
    Object.entries(defs).map(([id, def]) => {
      const addedAt = CARD_ADDED_AT[id]
      if (!addedAt) throw new Error(`Missing CARD_ADDED_AT for "${id}"`)
      return [id, { ...def, addedAt }]
    }),
  ) as Record<string, CardDefinition>
}

const CARD_DEFINITIONS_BASE: Record<string, Omit<CardDefinition, 'addedAt'>> = {
  warrior: troop('warrior', 'Warrior',
    'A sturdy melee fighter with balanced stats. Reliable in any deck.',
    3, {
    maxHp: 2332,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 267,
    attackRate: 1 / 1.1,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'warrior_blue_idle', 'warrior_red_idle'),

  /** ×2 deploy — Knights faction archer art. */
  archer: troop('archer', 'Archer',
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

  /** Single ranged troop — Warrior faction archer art. */
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

/** ×3 deploy — Skull enemy art. */
  skeleton: troop('skeleton', 'Skeleton',
    'Three fragile but fast skeletons. Cheap distraction that overwhelms through numbers.',
    1, {
    maxHp: 108,
    speed: crSpeedToCellsPerSec(CR_SPEED.fast),
    damage: 108,
    attackRate: 1 / 1.1,
    collisionRadiusCells: 0.22,
    attackRange: 0.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'skeleton_blue_idle', 'skeleton_red_idle', 3),

  /** ×14 deploy — Skull enemy art. */
  skeleton_army: troop('skeleton_army', 'Skeleton Army',
    'A horde of fragile skeletons. Devastating against single-target troops but weak to splash.',
    3, {
    maxHp: 108,
    speed: crSpeedToCellsPerSec(CR_SPEED.fast),
    damage: 108,
    attackRate: 1 / 1.1,
    collisionRadiusCells: 0.22,
    attackRange: 0.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'skeleton_blue_idle', 'skeleton_red_idle', 14),

  /** ×3 deploy — Spear Goblin art, armor absorbs damage first. */
  spear_goblin: troop('spear_goblin', 'Spear Goblin',
    'Three spear-wielding brutes with armor. Armor absorbs damage before their health does.',
    3, {
    maxHp: 280,
    armorHp: 339,
    speed: crSpeedToCellsPerSec(CR_SPEED.fast),
    damage: 127,
    attackRate: 1 / 1.1,
    attackRange: 1.6,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'spear_goblin_blue_idle', 'spear_goblin_red_idle', 3),

  /** Goblin Barrel minion — hooded villager art, knife interact attack. Not offered in the deck builder. */
  villagers: troop('villagers', 'Villagers',
    'Three fast villagers that rush in with knives. Cheap swarm melee.',
    2, {
    maxHp: 289,
    speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
    damage: 255,
    attackRate: 1 / 1.1,
    attackRange: 0.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'villagers_blue_idle', 'villagers_red_idle', 3),

  /** ×3 deploy — same hooded villager art and knife attack as the villagers spawn minion. */
  goblins: troop('goblins', 'Goblins',
    'Three fast goblins that rush in with knives. Cheap swarm melee.',
    2, {
    maxHp: 289,
    speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
    damage: 255,
    attackRate: 1 / 1.1,
    attackRange: 0.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'villagers_blue_idle', 'villagers_red_idle', 3),

  /** P.E.K.K.A analog — Troll enemy art. */
  troll: troop('troll', 'Troll',
    'A slow colossus with devastating single-target damage. Nothing survives its club for long.',
    7, {
    maxHp: 4979,
    speed: crSpeedToCellsPerSec(CR_SPEED.slow),
    damage: 1081,
    attackRate: 1 / 1.8,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    pushWeight: 2.5,  // P.E.K.K.A-class: slow and massive, shoves lighter units
  }, 'troll_blue_idle', 'troll_red_idle'),

  /** Melee with distance charge — Lancer faction art. */
  lancer: troop('lancer', 'Lancer',
    'Builds up a devastating charge over distance, doubling speed and damage on impact.',
    5, {
    maxHp: 2542,
    speed: crSpeedToCellsPerSec(CR_SPEED.fast),
    damage: 518,
    attackRate: 1 / 1.4,
    attackRange: 1.6,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    pushWeight: 1.5,  // Prince-class: fast charger shoves lighter units
  }, 'lancer_blue_idle', 'lancer_red_idle'),

  pig_shaman: troop('pig_shaman', 'Pig Shaman',
    'Hurls a transformation hex that splashes and curses nearby enemies. Cursed troops that die become friendly Pigs. Hits air and ground.',
    5, {
    maxHp: 930,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 183,
    attackRate: 1 / 1.7,
    attackRange: 5.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
    splashRadius: 1.8,
  }, 'pig_shaman_blue_idle', 'pig_shaman_red_idle'),

  snake: troop('snake', 'Snake',
    'Spits venom that splashes to a second target and stuns on hit. Hits air and ground.',
    4, {
    maxHp: 895,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 300,
    attackRate: 1 / 1.9,
    attackRange: 5.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
    splashRadius: 1.5,
  }, 'snake_blue_idle', 'snake_red_idle'),

  lizard: troop('lizard', 'Lizard',
    'A flying lizard that breathes fire with wide splash. Attacks air and ground.',
    4, {
    maxHp: 1064,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 152,
    attackRate: 1 / 1.8,
    attackRange: 3.5,
    unitType: UnitType.AIR,
    attackType: AttackType.AIR_AND_GROUND,
    splashRadius: 2.5,
  }, 'lizard_blue_idle', 'lizard_red_idle'),

  air_boat: troop('air_boat', 'Air Boat',
    'A balloon boat crewed by a paddle shark. Targets buildings only, dropping bombs from above.',
    5, {
    maxHp: 3403,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 652,
    attackRate: 0.5,
    attackRange: 1.5,
    unitType: UnitType.AIR,
    attackType: AttackType.GROUND_ONLY,
    targetsBuildingsOnly: true,
    splashRadius: 1.5,
    deathSplashDamage: 272,
    deathSplashRadius: 3.0,
  }, 'air_boat_blue_idle', 'air_boat_red_idle'),

  /** Giant analog — building-only tank. */
  bear: troop('bear', 'Bear',
    'A slow walking fortress that ignores enemy troops and grinds down buildings and towers.',
    5, {
    maxHp: 5288,
    speed: crSpeedToCellsPerSec(CR_SPEED.slow),
    damage: 311,
    attackRate: 1 / 1.5,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    targetsBuildingsOnly: true,
    pushWeight: 3.0,  // Giant-class: bulldozes lighter allies out of the way
  }, 'bear_blue_idle', 'bear_red_idle'),

  /** Splash-damage caster — Torch Goblin art. */
  fire_goblin: troop('fire_goblin', 'Fire Goblin',
    'Launches fireballs that splash-damage all nearby enemies. Hits air and ground.',
    5, {
    maxHp: 997,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 371,
    attackRate: 1 / 1.4,
    attackRange: 5.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
    splashRadius: 1.5,
  }, 'fire_goblin_blue_idle', 'fire_goblin_red_idle'),

  /** Fast building-only melee — Pig Rider enemy art. */
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
    pushWeight: 1.5,  // Hog Rider-class: plows through lighter units
  }, 'pig_rider_blue_idle', 'pig_rider_red_idle'),

  /** ×4 deploy — Pig art. CR Royal Hogs (building-only rush). */
  pig: troop('pig', 'Pig',
    'Four fast hogs that ignore enemy troops and charge straight for buildings.',
    5, {
    maxHp: 1108,
    speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
    damage: 98,
    attackRate: 1 / 1.2,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    targetsBuildingsOnly: true,
  }, 'pig_blue_idle', 'pig_red_idle', 4),

  /** Ranged ground splash — Bomb Fish enemy art. */
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

  /** Building-only wall-breaker — Factions TNT goblin art. */
  goblin_demolisher: troop('goblin_demolisher', 'TNT Goblin',
    'Lobs dynamite at ground troops. At half health, charges the nearest building and explodes on death.',
    4, {
    maxHp: 1300,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 246,
    attackRate: 1 / 1.2,
    attackRange: 5.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    splashRadius: 1.5,
    deathSplashRadius: 2.5,
    deathSplashDamage: 614,
  }, 'goblin_demolisher_blue_sheet', 'goblin_demolisher_red_sheet'),

  /** ×2 deploy — rolling barrel bomb art. Always rushes buildings and detonates on first
   *  contact, never engaging troops or standing to fight. Reduced payload if killed en route. */
  tnt_barrel: troop('tnt_barrel', 'TNT Barrel',
    'Two fragile goblins that ignore enemy troops and rush the nearest building, detonating on contact.',
    2, {
    maxHp: 240,
    speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
    damage: 614,
    attackRate: 1,
    attackRange: 1.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    targetsBuildingsOnly: true,
    suicideOnAttack: true,
    deathSplashRadius: 2.5,
    deathSplashDamage: 614,
    deathSplashDamageOffTarget: 180,
  }, 'barrel_blue', 'barrel_red', 2),

  /** Mega Knight analog — spawn slam handled in GameSimulator.deployCard. */
  minotaur: troop('minotaur', 'Minotaur',
    'Slams the ground on arrival, damaging everything nearby, then cleaves enemies with sweeping blows.',
    7, {
    maxHp: 4359,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 293,
    attackRate: 1 / 1.7,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
    splashRadius: 1.3,
    pushWeight: 3.0,  // Mega Knight-class: heaviest melee, shoves everything aside
  }, 'minotaur_blue_idle', 'minotaur_red_idle'),

  /** CR Miner — deploys anywhere, burrows in (GameSimulator/Troop), reduced tower damage. */
  miner: troop('miner', 'Miner',
    'Burrows underground and pops up anywhere in the arena. Deals less damage to towers.',
    3, {
    maxHp: 1598,
    speed: crSpeedToCellsPerSec(CR_SPEED.fast),
    damage: 211,
    attackRate: 1 / 1.2,
    attackRange: 0.75,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'miner_blue_idle', 'miner_red_idle'),

  /** Fast melee — dashes in before each strike when target is just out of reach. */
  thief: troop('thief', 'Thief',
    'Dashes to close the gap before each strike when an enemy is just out of melee reach.',
    3, {
    maxHp: 1200,
    speed: crSpeedToCellsPerSec(CR_SPEED.fast),
    damage: 257,
    attackRate: 1 / 1.0,
    attackRange: 0.75,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'thief_blue_idle', 'thief_red_idle'),

  /** Cheap building tank — slowing death burst on destroy. */
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

  /** Wide spinning melee splash — Panda enemy art. */
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

  /** Boomerang bone splash — Gnoll enemy art. */
  gnoll: troop('gnoll', 'Gnoll',
    'Hurls a bone axe in a straight line. It pierces enemies on the way out and returns for a second hit.',
    5, {
    maxHp: 1695,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 223,
    attackRate: 1 / 2.4,
    attackRange: 4.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
    splashRadius: 1.5,
  }, 'gnoll_blue_idle', 'gnoll_red_idle'),

  monk: troop('monk', 'Monk',
    'A support fighter who restores hitpoints to nearby allies with each healing strike.',
    4, {
    maxHp: 2274,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 196,
    attackRate: 1 / 1.5,
    attackRange: 1.6,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'monk_blue_idle', 'monk_red_idle'),

  /** Fisherman-style hook thrower — pulls ground enemies close (see Troop.hasHookAttack). */
  harpoon_shark: troop('harpoon_shark', 'Harpoon Shark',
    'Hurls a harpoon on a rope. Pulls ground enemies close or yanks itself toward buildings.',
    3, {
    maxHp: 1152,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 257,
    attackRate: 1 / 1.3,
    attackRange: 1.2,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'harpoon_shark_blue_idle', 'harpoon_shark_red_idle'),

  /** Ranged dart-thrower — Factions Torch goblin art, harpoon_shark's former stats/role. */
  torch: troop('torch', 'Torch',
    'A goblin hurling flaming darts at rapid pace. Effective at range against air and ground.',
    3, {
    maxHp: 466,
    speed: crSpeedToCellsPerSec(CR_SPEED.veryFast),
    damage: 199,
    attackRate: 1 / 0.7,
    attackRange: 5.0,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
  }, 'torch_blue_sheet', 'torch_red_sheet'),

  /** Witch-style spawner — Caveborn Spider art, green splash bolts + tiny spiderlings. */
  spider: troop('spider', 'Spider',
    'Spits green fire with splash damage and periodically summons tiny spiderlings.',
    5, {
    maxHp: 1111,
    speed: crSpeedToCellsPerSec(CR_SPEED.medium),
    damage: 179,
    attackRate: 1 / 1.1,
    attackRange: 5.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.AIR_AND_GROUND,
    splashRadius: 1.5,
  }, 'spider_blue_idle', 'spider_red_idle'),

  /** Witch minion — skeleton-equivalent stats, not offered in the deck builder. */
  spiderling: troop('spiderling', 'Spiderling',
    'A tiny spider spawned by the Spider. Fast and fragile.',
    1, {
    maxHp: 108,
    speed: crSpeedToCellsPerSec(CR_SPEED.fast),
    damage: 108,
    attackRate: 1 / 1.1,
    collisionRadiusCells: 0.22,
    attackRange: 0.5,
    unitType: UnitType.GROUND,
    attackType: AttackType.GROUND_ONLY,
  }, 'spider_blue_idle', 'spider_red_idle'),

  arrows: spell('arrows', 'Arrows',
    'A volley of arrows that rains down on an area. Cheap and effective at clearing swarms.',
    3, {
    damage: 404, radius: 3, duration: 0, delivery: 'arrows',
  }, 'arrow_blue', 'arrow_red'),

  wood_tower: building('wood_tower', 'Wood Tower',
    'A stationary tower lobbing bombs at ground troops with area damage. Explodes on destruction.',
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

  /** King-launched ground spell — Bomb enemy art. */
  big_bomb: spell('big_bomb', 'Big Bomb',
    'A slow arcing bomb from your king tower. Huge damage on ground targets in a small radius.',
    6, {
    damage: 1960, radius: 2, duration: 0, groundOnly: true, delivery: 'rocket',
  }, 'bomb_idle', 'bomb_idle'),

  /** King-launched spawn spell — barrel flies in and cracks open, releasing 3 villagers. */
  goblin_barrel: spell('goblin_barrel', 'Goblin Barrel',
    'Flings a barrel from your king tower that cracks open on impact, releasing 3 villagers.',
    3, {
    damage: 0, radius: 1.5, duration: 0, delivery: 'rocket',
    spawnCardId: 'villagers', spawnCount: 3,
  }, 'barrel_yellow', 'barrel_yellow'),
}

export const CARD_DEFINITIONS: Record<string, CardDefinition> =
  withAddedAtTimestamps(CARD_DEFINITIONS_BASE)

export function getCardAddedAtMs(cardId: string): number {
  return CARD_DEFINITIONS[cardId]?.addedAt ?? 0
}

/** Disabled from match decks — card/building code kept for when bugs are fixed. */
export const DECK_EXCLUDED_CARD_IDS = ['wood_tower'] as const

/** Spawn-only or internal troops — hidden from the deck builder collection. */
export const COLLECTION_HIDDEN_CARD_IDS = ['spiderling', 'villagers'] as const

const ALL_DECK_CARD_IDS: string[] = [
  'warrior', 'archer', 'skeleton', 'lancer', 'fire_goblin', 'harpoon_shark', 'arrows', 'wood_tower', 'big_bomb',
]

export const DEFAULT_DECK: string[] = ALL_DECK_CARD_IDS.filter(
  id => !(DECK_EXCLUDED_CARD_IDS as readonly string[]).includes(id),
)

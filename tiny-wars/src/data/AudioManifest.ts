import { CardType, EntityKind } from '@core/types'
import { CARD_DEFINITIONS } from './CardData'

export interface SfxDef {
  key: string
  path: string
}

/** Sword / knife / lance strikes (attackRange ≤ 2 cells). */
export const BLADE_HIT_SFX: SfxDef = {
  key: 'sfx_blade_hit',
  path: 'assets/Audio/SFX/Combat/blade_hit.mp3',
}

/** Fists, tusks, bites, and other non-blade melee (attackRange ≤ 2 cells). */
export const BLUNT_HIT_SFX: SfxDef = {
  key: 'sfx_blunt_hit',
  path: 'assets/Audio/SFX/Combat/blunt_hit.mp3',
}

/** Arrow / bow projectile impact. */
export const ARROW_HIT_SFX: SfxDef = {
  key: 'sfx_arrow_hit',
  path: 'assets/Audio/SFX/Combat/arrow_hit.wav',
}

/** Cannon balls, air-boat bombs, and lobbed dynamite impacts. */
export const CANNON_HIT_SFX: SfxDef = {
  key: 'sfx_cannon_hit',
  path: 'assets/Audio/SFX/Combat/cannon_hit.wav',
}

/** Match-intro fanfare played on the "Battle Start!" flip. */
export const WAR_HORN_SFX: SfxDef = {
  key: 'sfx_war_horn',
  path: 'assets/Audio/SFX/Combat/war-horn.mp3',
}

/** Troops/buildings that use {@link CANNON_HIT_SFX} on impact. */
export const CANNON_HIT_CARD_IDS = new Set<string>([
  'air_boat',
  'goblin_demolisher',
  'wood_tower',
  'tnt_barrel',
])

export function usesCannonHit(
  cardId: string,
  attackerKind?: EntityKind,
  isKingTower = false,
): boolean {
  if (cardId && CANNON_HIT_CARD_IDS.has(cardId)) return true
  if (attackerKind === EntityKind.TOWER && isKingTower) return true
  return false
}

/** Troop cards whose ranged attacks use the arrow projectile (Arrow.png). */
export const ARROW_PROJECTILE_CARD_IDS = new Set<string>([
  'archer',
  'elite_archer',
])

/** Princess towers and arrow troops — not cannon, fireball, or dynamite projectiles. */
export function usesArrowProjectile(
  cardId: string,
  attackerKind?: EntityKind,
  isKingTower = false,
): boolean {
  if (cardId && ARROW_PROJECTILE_CARD_IDS.has(cardId)) return true
  if (attackerKind === EntityKind.TOWER && !isKingTower) return true
  return false
}

/** Matches {@link isMeleeAttacker} — troops with attackRange ≤ 2 cells. */
export const MELEE_ATTACK_RANGE_MAX_CELLS = 2

/** Troops that use {@link BLADE_HIT_SFX}. All other melee troops use {@link BLUNT_HIT_SFX}. */
export const BLADE_MELEE_CARD_IDS = new Set<string>([
  'warrior',
  'villagers',
  'thief',
  'lancer',
])

export function isMeleeTroopCard(cardId: string): boolean {
  const def = CARD_DEFINITIONS[cardId]
  if (!def?.stats || def.cardType !== CardType.TROOP) return false
  return def.stats.attackRange <= MELEE_ATTACK_RANGE_MAX_CELLS
}

export function isBladeMeleeCard(cardId: string): boolean {
  return BLADE_MELEE_CARD_IDS.has(cardId)
}

/** Non-blade melee troops (pigs, troll, skeletons, panda, etc.). */
export function isBluntMeleeCard(cardId: string): boolean {
  return isMeleeTroopCard(cardId) && !isBladeMeleeCard(cardId)
}

export function hitSfxForMeleeCard(cardId: string): SfxDef {
  return isBladeMeleeCard(cardId) ? BLADE_HIT_SFX : BLUNT_HIT_SFX
}

export function getCombatSfx(): readonly SfxDef[] {
  return [BLADE_HIT_SFX, BLUNT_HIT_SFX, ARROW_HIT_SFX, CANNON_HIT_SFX, WAR_HORN_SFX]
}

/** Every melee troop card id grouped by strike sfx (for tests / tooling). */
export function meleeTroopCardIdsByStrikeSfx(): { blade: string[]; blunt: string[] } {
  const blade: string[] = []
  const blunt: string[] = []
  for (const [id, def] of Object.entries(CARD_DEFINITIONS)) {
    if (!def.stats || def.cardType !== CardType.TROOP) continue
    if (def.stats.attackRange > MELEE_ATTACK_RANGE_MAX_CELLS) continue
    if (isBladeMeleeCard(id)) blade.push(id)
    else blunt.push(id)
  }
  blade.sort()
  blunt.sort()
  return { blade, blunt }
}

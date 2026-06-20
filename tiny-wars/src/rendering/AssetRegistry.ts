import { Owner } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'

/** Returns the Phaser texture key for a given card + owner */
export function cardTextureKey(cardId: string, owner: Owner): string {
  const def = CARD_DEFINITIONS[cardId]
  if (!def) return owner === Owner.PLAYER ? 'placeholder_player' : 'placeholder_bot'
  return owner === Owner.PLAYER ? def.textureKeyPlayer : def.textureKeyBot
}

/** Returns the texture key for a tower (King or Princess) */
export function towerTextureKey(isKing: boolean, owner: Owner, destroyed = false): string {
  if (destroyed) return isKing ? 'castle_destroyed' : 'tower_destroyed'
  if (isKing)    return owner === Owner.PLAYER ? 'castle_blue' : 'castle_red'
  return owner === Owner.PLAYER ? 'tower_blue' : 'tower_red'
}

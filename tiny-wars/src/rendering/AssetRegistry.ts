import { Owner } from '@core/types'
import { idleSheetKey, cardAvatarKey } from '@data/AssetManifest'

/** Returns the idle spritesheet key for in-map entity sprites */
export function cardTextureKey(cardId: string, owner: Owner): string {
  return idleSheetKey(cardId, owner)
}

/** Static portrait for the card hand UI */
export function cardIconKey(cardId: string): string {
  return cardAvatarKey(cardId)
}

/** Returns the texture key for a tower (King or Princess) */
export function towerTextureKey(isKing: boolean, owner: Owner, destroyed = false): string {
  if (destroyed) return isKing ? 'castle_destroyed' : 'tower_destroyed'
  if (isKing)    return owner === Owner.PLAYER ? 'castle_blue' : 'castle_red'
  return owner === Owner.PLAYER ? 'tower_blue' : 'tower_red'
}

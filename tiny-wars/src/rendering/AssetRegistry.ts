import { Owner } from '@core/types'
import { idleSheetKey } from '@data/AssetManifest'

/** Returns the idle spritesheet key for a card icon or fallback */
export function cardTextureKey(cardId: string, owner: Owner): string {
  return idleSheetKey(cardId, owner)
}

/** First frame of the idle sheet — used for card hand icons and placement ghost */
export function cardIconKey(cardId: string, owner: Owner): string {
  return idleSheetKey(cardId, owner)
}

/** Returns the texture key for a tower (King or Princess) */
export function towerTextureKey(isKing: boolean, owner: Owner, destroyed = false): string {
  if (destroyed) return isKing ? 'castle_destroyed' : 'tower_destroyed'
  if (isKing)    return owner === Owner.PLAYER ? 'castle_blue' : 'castle_red'
  return owner === Owner.PLAYER ? 'tower_blue' : 'tower_red'
}

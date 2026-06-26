import { Owner, CardType } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { CARD_ASSET_BUNDLES, FRAME_H, FRAME_W, getSideAssets } from '@data/AssetManifest'

/** On-screen walker height — several times larger than in-battle units. */
export const LOADING_WALKER_HEIGHT = 200

export function loadingWalkerCandidates(): string[] {
  return CARD_ASSET_BUNDLES
    .filter(b => b.animated !== false)
    .filter(b => {
      const card = CARD_DEFINITIONS[b.cardId]
      return card?.cardType === CardType.TROOP
    })
    .map(b => b.cardId)
}

export function pickRandomLoadingUnitId(): string {
  const candidates = loadingWalkerCandidates()
  if (candidates.length === 0) {
    throw new Error('No troop cards available for the loading screen walker')
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function loadingWalkerRunSheet(cardId: string): { key: string; path: string; frameWidth: number; frameHeight: number } {
  const side = getSideAssets(cardId, Owner.PLAYER)
  if (!side) throw new Error(`No player assets for loading walker "${cardId}"`)
  const sheet = side.run.sheet
  return {
    key: sheet.key,
    path: sheet.path,
    frameWidth: sheet.frameWidth ?? FRAME_W,
    frameHeight: sheet.frameHeight ?? FRAME_H,
  }
}

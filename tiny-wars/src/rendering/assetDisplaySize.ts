import { CardType } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { CARD_ASSET_BUNDLES } from '@data/AssetManifest'
import {
  MAP_HEIGHT_MULTIPLIER,
  MAP_TOWER_CONTENT_FILL,
  MAP_UNIT_TARGET_HEIGHT,
  TROOP_COLLISION_HEIGHT_RATIO,
  TROOP_COLLISION_WIDTH_RATIO,
  towerFootprintHalfExtents,
} from '@data/GameConstants'

const DEFAULT_CONTENT_FILL = 0.55

export type MapEntityTier = keyof typeof MAP_HEIGHT_MULTIPLIER

export interface DisplaySize {
  width: number
  height: number
}

export function targetHeightForTier(tier: MapEntityTier): number {
  return MAP_UNIT_TARGET_HEIGHT * MAP_HEIGHT_MULTIPLIER[tier]
}

export function tierForCard(cardId: string): MapEntityTier {
  const card = CARD_DEFINITIONS[cardId]
  if (!card) return 'troop'
  return card.cardType === CardType.BUILDING ? 'building' : 'troop'
}

export function targetHeightForCard(cardId: string): number {
  const tier = tierForCard(cardId)
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  const assetScale = bundle?.mapHeightScale ?? 1
  const contentFill = bundle?.contentFill ?? DEFAULT_CONTENT_FILL
  return (targetHeightForTier(tier) * assetScale) / contentFill
}

export function targetHeightForTower(isKing: boolean): number {
  const tier: MapEntityTier = isKing ? 'tower_king' : 'tower_princess'
  const contentFill = MAP_TOWER_CONTENT_FILL[tier]
  return targetHeightForTier(tier) / contentFill
}

/** Collision half-extents matching on-map sprite size (logic-only, no Phaser). */
export function collisionHalfExtentsForCard(cardId: string): { halfW: number; halfH: number } {
  const targetH = targetHeightForCard(cardId)
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  const tier = tierForCard(cardId)
  const widthRatio = bundle?.footprintWidthRatio
    ?? (tier === 'troop' ? TROOP_COLLISION_WIDTH_RATIO : 1)
  const heightRatio = bundle?.footprintHeightRatio
    ?? (tier === 'troop' ? TROOP_COLLISION_HEIGHT_RATIO : 1)
  const halfH = (targetH / 2) * heightRatio
  const halfW = (targetH / 2) * widthRatio
  return { halfW, halfH }
}

export function collisionHalfExtentsForTower(isKing: boolean): { halfW: number; halfH: number } {
  return towerFootprintHalfExtents(isKing)
}

export function displaySizeForTexture(
  scene: Phaser.Scene,
  textureKey: string,
  frame: string | number = 0,
  targetHeight: number = MAP_UNIT_TARGET_HEIGHT,
): DisplaySize {
  if (!scene.textures.exists(textureKey)) {
    return { width: targetHeight, height: targetHeight }
  }

  const frameData = scene.textures.getFrame(textureKey, frame)
  const nativeW = frameData.width
  const nativeH = frameData.height
  if (nativeW <= 0 || nativeH <= 0) {
    return { width: targetHeight, height: targetHeight }
  }

  const scale = targetHeight / nativeH
  return {
    width: Math.round(nativeW * scale),
    height: Math.round(targetHeight),
  }
}

export function displaySizeForCard(
  scene: Phaser.Scene,
  cardId: string,
  textureKey: string,
  frame: string | number = 0,
): DisplaySize {
  return displaySizeForTexture(scene, textureKey, frame, targetHeightForCard(cardId))
}

export function displaySizeForTower(scene: Phaser.Scene, isKing: boolean, textureKey: string): DisplaySize {
  return displaySizeForTexture(scene, textureKey, 0, targetHeightForTower(isKing))
}

export function applyTextureDisplaySize(
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  scene: Phaser.Scene,
  textureKey: string,
  frame: string | number = 0,
  targetHeight: number = MAP_UNIT_TARGET_HEIGHT,
): DisplaySize {
  const size = displaySizeForTexture(scene, textureKey, frame, targetHeight)
  obj.setDisplaySize(size.width, size.height)
  return size
}

export function applyCardDisplaySize(
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  scene: Phaser.Scene,
  cardId: string,
  textureKey: string,
  frame: string | number = 0,
): DisplaySize {
  const size = displaySizeForCard(scene, cardId, textureKey, frame)
  obj.setDisplaySize(size.width, size.height)
  return size
}

export function applyTowerDisplaySize(
  obj: Phaser.GameObjects.Image,
  scene: Phaser.Scene,
  isKing: boolean,
  textureKey: string,
): DisplaySize {
  const size = displaySizeForTower(scene, isKing, textureKey)
  obj.setDisplaySize(size.width, size.height)
  return size
}

import { CardType } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { CARD_ASSET_BUNDLES } from '@data/AssetManifest'
import {
  MAP_HEIGHT_MULTIPLIER,
  MAP_TOWER_CONTENT_FILL,
  MAP_UNIT_TARGET_HEIGHT,
  SPRITE_VISUAL_SCALE,
  TROOP_COLLISION_HEIGHT_RATIO,
  TROOP_COLLISION_WIDTH_RATIO,
  TOWER_FOOTPRINT_CELLS,
  CELL_SIZE,
  BOMB_TOWER_CARD_ID,
  BUILDING_COMBAT_RADIUS_CELLS,
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
  const contentFill = bundle?.contentFill ?? DEFAULT_CONTENT_FILL
  return targetHeightForTier(tier) / contentFill
}

export function targetHeightForTower(isKing: boolean): number {
  const tier: MapEntityTier = isKing ? 'tower_king' : 'tower_princess'
  const contentFill = MAP_TOWER_CONTENT_FILL[tier]
  return targetHeightForTier(tier) / contentFill
}

/** Native tower art dimensions (matches Knights building PNGs). */
const TOWER_NATIVE_SIZE = {
  princess: { w: 128, h: 256 },
  king:     { w: 320, h: 256 },
} as const

/** Display size from native art — mirrors displaySizeForTower() without Phaser. */
export function towerDisplaySizeForNative(isKing: boolean): DisplaySize {
  const native = isKing ? TOWER_NATIVE_SIZE.king : TOWER_NATIVE_SIZE.princess
  const visualScale = isKing ? SPRITE_VISUAL_SCALE : 1
  const targetH = targetHeightForTower(isKing) * visualScale
  const scale = targetH / native.h
  return { width: native.w * scale, height: targetH }
}

/** Circular combat hull — king castles match rendered sprite width; princess towers use footprint. */
export function towerCombatRadius(isKing: boolean): number {
  if (isKing) return towerDisplaySizeForNative(true).width / 2
  return (TOWER_FOOTPRINT_CELLS.princess.w / 2) * CELL_SIZE
}

/** Deploy preview ring — matches in-game combat hull, not sprite bounds. */
export function buildingPlacementCombatRadiusPx(cardId: string): number {
  if (cardId === BOMB_TOWER_CARD_ID) return towerCombatRadius(false)
  return BUILDING_COMBAT_RADIUS_CELLS * CELL_SIZE
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
  const r = towerCombatRadius(isKing)
  return { halfW: r, halfH: r }
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

const UNSCALED_CARD_IDS = new Set(['skeleton', 'skeleton_army', 'archer', 'villagers', 'spiderling'])

/** Per-card display height multiplier — synced to map-editor via mapEditorCatalog. */
export const CARD_DISPLAY_VISUAL_SCALE: Readonly<Partial<Record<string, number>>> = {
  [BOMB_TOWER_CARD_ID]: 1,
  // Giant-class tank — reads too small next to regular troops at the default scale.
  troll: 1.45,
}

export function visualScaleForCard(cardId: string): number {
  if (cardId in CARD_DISPLAY_VISUAL_SCALE) return CARD_DISPLAY_VISUAL_SCALE[cardId]!
  if (UNSCALED_CARD_IDS.has(cardId)) return 1
  return SPRITE_VISUAL_SCALE
}

/** Logic-only display height in game pixels (no Phaser). */
export function logicDisplayHeightForCard(cardId: string): number {
  return targetHeightForCard(cardId) * visualScaleForCard(cardId)
}

export function displaySizeForCard(
  scene: Phaser.Scene,
  cardId: string,
  textureKey: string,
  frame: string | number = 0,
): DisplaySize {
  return displaySizeForTexture(
    scene,
    textureKey,
    frame,
    logicDisplayHeightForCard(cardId),
  )
}

/** On-map size for a 192px-native troop sheet at standard Enemy Pack content fill. */
export function displaySizeForTroopSheet(
  scene: Phaser.Scene,
  textureKey: string,
  frame: string | number = 0,
  contentFill = 0.55,
): DisplaySize {
  const targetH = (MAP_UNIT_TARGET_HEIGHT / contentFill) * SPRITE_VISUAL_SCALE
  return displaySizeForTexture(scene, textureKey, frame, targetH)
}

export function displaySizeForTower(scene: Phaser.Scene, isKing: boolean, textureKey: string): DisplaySize {
  const scale = isKing ? SPRITE_VISUAL_SCALE : 1
  return displaySizeForTexture(scene, textureKey, 0, targetHeightForTower(isKing) * scale)
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

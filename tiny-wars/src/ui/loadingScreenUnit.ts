import Phaser from 'phaser'
import { Owner } from '@core/types'
import { clipAnimKey, getSideAssets } from '@data/AssetManifest'
import { registerCardRunAnim } from '@rendering/AnimationRegistry'
import { displaySizeForCard } from '@rendering/assetDisplaySize'
import { LOADING_WALKER_HEIGHT } from './loadingScreenUnitPick'

/** Spawn a large run-in-place sprite once its sheet has loaded. */
export function createLoadingWalker(
  scene: Phaser.Scene,
  cardId: string,
  x: number,
  y: number,
): Phaser.GameObjects.Sprite | null {
  const side = getSideAssets(cardId, Owner.PLAYER)
  if (!side) return null

  const sheetKey = side.run.sheet.key
  if (!scene.textures.exists(sheetKey)) return null

  registerCardRunAnim(scene, cardId, Owner.PLAYER)
  const animKey = clipAnimKey(cardId, Owner.PLAYER, 'run')
  if (!scene.anims.exists(animKey)) return null

  const sprite = scene.add.sprite(x, y, sheetKey, side.run.start)
  const size = displaySizeForCard(scene, cardId, sheetKey, side.run.start)
  const scaleUp = LOADING_WALKER_HEIGHT / size.height
  sprite.setDisplaySize(size.width * scaleUp, size.height * scaleUp)
  sprite.play(animKey)
  return sprite
}

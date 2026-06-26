import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { cardAvatarKey, getCardAvatarBackdrop } from '@data/AssetManifest'
import { applyCardAvatarTexture } from '@rendering/cardAvatarTexture'
import { applyArrowSprite, ARROW_DISPLAY_W } from '@rendering/arrowTexture'
import { applyBackdropDisplaySize, applyCardAvatarIconSize } from './cardHandLayout'

/**
 * Create the backdrop + portrait images for a card, centred at (x, y) and sized
 * to fill w×h. Returns every created image so callers can destroy them when the
 * displayed card changes.
 */
export function createCardPortrait(
  scene: Phaser.Scene,
  card: CardDefinition,
  x: number,
  y: number,
  w: number,
  h: number,
): Phaser.GameObjects.Image[] {
  const images: Phaser.GameObjects.Image[] = []

  const backdropDef = getCardAvatarBackdrop(card.id)
  const backdrop = backdropDef ? scene.add.image(x, y, backdropDef.key) : null
  if (backdrop) {
    applyBackdropDisplaySize(backdrop, w, h)
    images.push(backdrop)
  }

  const icon = scene.add.image(x, y, cardAvatarKey(card.id))
  applyCardAvatarTexture(icon, scene, card.id)
  if (card.id === 'arrows') {
    applyArrowSprite(icon)
    icon.setScale((w / ARROW_DISPLAY_W) * 1.35).setRotation(-2.35)
  } else {
    applyCardAvatarIconSize(icon, card.id, w, h, backdrop !== null)
  }
  images.push(icon)

  return images
}

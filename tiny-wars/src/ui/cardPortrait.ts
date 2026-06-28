import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { Owner } from '@core/types'
import {
  cardAvatarKey,
  getCardAvatarBackdrop,
  getCardAvatarSwarmSource,
  idleSheetKey,
} from '@data/AssetManifest'
import { applyCardAvatarTexture, applyArrowSprite, ARROW_DISPLAY_W } from '@rendering/renderingUtils'
import { troopSwarmPortraitLayout } from '@core/DeploySystem'
import { TROOP_DEPLOY_SPREAD_CELLS } from '@data/GameConstants'
import { targetHeightForCard } from '@rendering/assetDisplaySize'
import { applyBackdropDisplaySize, applyCardAvatarIconSize } from './cardHandLayout'

export type CardPortraitNode = Phaser.GameObjects.Image | Phaser.GameObjects.Container

export function destroyCardPortrait(nodes: CardPortraitNode[]): void {
  for (const node of nodes) node.destroy()
}

function createSwarmPortrait(
  scene: Phaser.Scene,
  card: CardDefinition,
  x: number,
  y: number,
  w: number,
  h: number,
): CardPortraitNode[] {
  const nodes: CardPortraitNode[] = []
  const sourceCardId = getCardAvatarSwarmSource(card.id)!
  const count = card.deployCount ?? 1
  const sheetKey = idleSheetKey(sourceCardId, Owner.PLAYER)

  const backdropDef = getCardAvatarBackdrop(card.id)
  if (backdropDef) {
    const backdrop = scene.add.image(x, y, backdropDef.key)
    applyBackdropDisplaySize(backdrop, w, h)
    nodes.push(backdrop)
  }

  const frame = scene.textures.getFrame(sheetKey, 0)
  const frameH = frame.height
  const unitH = targetHeightForCard(sourceCardId)
  const unitW = (frame.width / frame.height) * unitH
  const { offsets, fitScale } = troopSwarmPortraitLayout(
    count,
    TROOP_DEPLOY_SPREAD_CELLS,
    w,
    h,
    unitW,
    unitH,
  )
  const unitScale = (unitH * fitScale) / frameH

  const swarm = scene.add.container(x, y)
  for (const offset of offsets) {
    const unit = scene.add.image(offset.x, offset.y, sheetKey, 0)
    unit.setScale(unitScale)
    swarm.add(unit)
  }
  nodes.push(swarm)

  return nodes
}

/**
 * Create the backdrop + portrait for a card, centred at (x, y) and sized
 * to fill w×h. Returns every created node so callers can destroy them when the
 * displayed card changes.
 */
export function createCardPortrait(
  scene: Phaser.Scene,
  card: CardDefinition,
  x: number,
  y: number,
  w: number,
  h: number,
): CardPortraitNode[] {
  if (getCardAvatarSwarmSource(card.id)) {
    return createSwarmPortrait(scene, card, x, y, w, h)
  }

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

/** Apply alpha to every portrait node (containers affect all children). */
export function setCardPortraitAlpha(nodes: CardPortraitNode[], alpha: number): void {
  for (const node of nodes) node.setAlpha(alpha)
}

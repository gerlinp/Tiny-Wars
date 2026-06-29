import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { Owner } from '@core/types'
import {
  cardAvatarKey,
  getCardAvatarBackdrop,
  getCardAvatarFocusY,
  getCardAvatarHandScale,
  getCardAvatarSwarmSource,
  idleSheetKey,
  PADDLE_SHARK_IDLE_SHEET,
} from '@data/AssetManifest'
import { applyCardAvatarTexture, applyArrowSprite, ARROW_DISPLAY_W } from '@rendering/renderingUtils'
import { troopSwarmPortraitLayout } from '@core/DeploySystem'
import { TROOP_DEPLOY_SPREAD_CELLS } from '@data/GameConstants'
import { targetHeightForCard, displaySizeForCard, displaySizeForTroopSheet } from '@rendering/assetDisplaySize'
import { applyBackdropDisplaySize, applyCardAvatarIconSize, applyHandScale } from './cardHandLayout'
import {
  AIR_BOAT_AVATAR_CROP_RATIO,
  layoutAirBoatPortrait,
} from './airBoatPortraitLayout'

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
 * Air boat portrait — boat hull (focused crop) with the paddle-shark crew seated inside,
 * matching the on-map composite (the boat alone reads as empty otherwise).
 */
function createAirBoatPortrait(
  scene: Phaser.Scene,
  card: CardDefinition,
  x: number,
  y: number,
  w: number,
  h: number,
): CardPortraitNode[] {
  const nodes: CardPortraitNode[] = []

  const backdropDef = getCardAvatarBackdrop(card.id)
  const backdrop = backdropDef ? scene.add.image(x, y, backdropDef.key) : null
  if (backdrop) {
    applyBackdropDisplaySize(backdrop, w, h)
    nodes.push(backdrop)
  }

  const focusY = getCardAvatarFocusY(card.id)
  const composite = scene.add.container(x, y)

  const boat = scene.add.image(0, 0, cardAvatarKey(card.id))
  applyCardAvatarTexture(boat, scene, card.id)

  const fw = boat.frame.width
  const fh = boat.frame.height
  const boatOnMap = displaySizeForCard(scene, card.id, cardAvatarKey(card.id), 0)
  const sharkOnMap = displaySizeForTroopSheet(scene, PADDLE_SHARK_IDLE_SHEET.key, 0)
  const sharkToBoat = sharkOnMap.height / boatOnMap.height

  const layout = layoutAirBoatPortrait(fw, fh, w, h, AIR_BOAT_AVATAR_CROP_RATIO, focusY, sharkToBoat)
  boat.setCrop(layout.cropX, layout.cropY, layout.cropW, layout.cropH)
  boat.setPosition(0, layout.boatY)
  boat.setScale(layout.scale)
  applyHandScale(boat, getCardAvatarHandScale(card.id))

  const handScale = getCardAvatarHandScale(card.id)
  const shark = scene.add.image(
    layout.shark.x * handScale,
    layout.shark.y * handScale,
    PADDLE_SHARK_IDLE_SHEET.key,
    0,
  )
  shark.setDisplaySize(layout.shark.width * handScale, layout.shark.height * handScale)

  composite.add([boat, shark])
  nodes.push(composite)

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

  if (card.id === 'air_boat') {
    return createAirBoatPortrait(scene, card, x, y, w, h)
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

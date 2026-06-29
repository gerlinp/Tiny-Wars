import Phaser from 'phaser'
import { Owner } from '@core/types'
import { clipAnimKey, getSideAssets } from '@data/AssetManifest'
import { registerCardRunAnim, registerAirBoatCrewFx } from '@rendering/AnimationRegistry'
import { displaySizeForCard } from '@rendering/assetDisplaySize'
import { AirBoatCrew, AIR_BOAT_SPRITE_ORIGIN_Y } from '@rendering/AirBoatCrew'
import { PADDLE_SHARK_IDLE_SHEET, PADDLE_SHARK_ROW_SHEET } from '@data/AssetManifest'
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

  // Air boat needs its crew sheets to render as the composite unit — wait for them (the caller
  // retries as assets stream in) rather than show an empty boat.
  if (
    cardId === 'air_boat' &&
    (!scene.textures.exists(PADDLE_SHARK_IDLE_SHEET.key) ||
      !scene.textures.exists(PADDLE_SHARK_ROW_SHEET.key))
  ) {
    return null
  }

  registerCardRunAnim(scene, cardId, Owner.PLAYER)
  const animKey = clipAnimKey(cardId, Owner.PLAYER, 'run')
  if (!scene.anims.exists(animKey)) return null

  const sprite = scene.add.sprite(x, y, sheetKey, side.run.start)
  const size = displaySizeForCard(scene, cardId, sheetKey, side.run.start)
  const scaleUp = LOADING_WALKER_HEIGHT / size.height
  const displayW = size.width * scaleUp
  const displayH = size.height * scaleUp
  sprite.setDisplaySize(displayW, displayH)
  sprite.play(animKey)

  // Air boat is a composite — add the rowing paddle-shark crew + ropes in the boat so the loading
  // screen matches the in-game unit (the boat alone reads as empty). No ground shadow here, to
  // stay consistent with the other (shadowless) loading walkers.
  if (cardId === 'air_boat') {
    // Boat sprite uses the combat-anchor origin in battle; reposition so the full frame centres
    // on the walker point, then drive the shared crew layout off that anchor.
    sprite.setOrigin(0.5, AIR_BOAT_SPRITE_ORIGIN_Y)
    const anchorY = y + (AIR_BOAT_SPRITE_ORIGIN_Y - 0.5) * displayH
    sprite.setPosition(x, anchorY)

    registerAirBoatCrewFx(scene)
    const crew = new AirBoatCrew(scene, Owner.PLAYER)
    crew.layout(x, anchorY, displayW, displayH, false, false)
    crew.syncMovement(true)
  }

  return sprite
}

import Phaser from 'phaser'
import { Owner } from '@core/types'
import { BOT_SIDE_TINT, PADDLE_SHARK_IDLE_SHEET, PADDLE_SHARK_ROW_SHEET } from '@data/AssetManifest'
import { displaySizeForTroopSheet } from './assetDisplaySize'

const CREW_DEPTH = 5.5
const SHADOW_DEPTH = 4.5
const ROPE_COLOR = 0x8B6914
const SHADOW_COLOR = 0x000000
const SHADOW_ALPHA = 0.3
/** Ground ellipse at the combat anchor — marks where the unit sits on the map. */
const SHADOW_WIDTH_RATIO = 0.42
const SHADOW_HEIGHT_RATIO = 0.14

/** Combat anchor — below the hull so in-range stops line the boat up with tower/castle tops. */
export const AIR_BOAT_SPRITE_ORIGIN_Y = 1.28

/** Fixed Y positions on the 256×256 AirBoat frame (ratio from top). */
const FRAME_BALLOON_CENTER_Y = 0.25
const FRAME_BALLOON_BASE_Y = 0.45
const FRAME_BOAT_TOP_Y = 0.58
/** Vertical seat of the paddle-shark crew on the AirBoat frame (ratio from top). */
export const FRAME_SHARK_Y = 0.65
/** Hull centre — where incoming attacks should visually connect. */
export const AIR_BOAT_AIM_FRAME_Y = 0.77
/** Horizontal offset of the crew from boat centre (ratio of display width). */
export const SHARK_STERN_X_RATIO = 0.13

const yFromAnchor = (frameY: number): number => frameY - AIR_BOAT_SPRITE_ORIGIN_Y

/** Health bar sits on the balloon, above the combat anchor. */
export const AIR_BOAT_HEALTH_BAR_Y_FROM_BOAT = yFromAnchor(FRAME_BALLOON_CENTER_Y)

/** World Y offset from combat anchor to hull aim point (negative = above anchor). */
export const airBoatAimYOffset = (displayHeight: number): number =>
  displayHeight * yFromAnchor(AIR_BOAT_AIM_FRAME_Y)

/** Paddle-shark crew for the Air Boat troop.
 *
 *  Crew renders at standard troop on-map size. The hull sheet scales via {@link air_boat} contentFill.
 */
export class AirBoatCrew {
  private readonly paddleShark: Phaser.GameObjects.Sprite
  private readonly ropeGfx: Phaser.GameObjects.Graphics
  private readonly shadowGfx: Phaser.GameObjects.Graphics
  private wasMoving = false

  constructor(
    private readonly scene: Phaser.Scene,
    owner: Owner,
  ) {
    const tint = owner === Owner.BOT ? BOT_SIDE_TINT : undefined

    this.paddleShark = scene.add.sprite(0, 0, PADDLE_SHARK_IDLE_SHEET.key, 0)
      .setDepth(CREW_DEPTH)
    if (tint) this.paddleShark.setTint(tint)
    this.playPaddleSharkIdle()

    this.ropeGfx = scene.add.graphics().setDepth(CREW_DEPTH - 0.1)
    this.shadowGfx = scene.add.graphics().setDepth(SHADOW_DEPTH)
  }

  layout(cx: number, cy: number, displayW: number, displayH: number, flipX: boolean, drawShadow = true): void {
    this.shadowGfx.clear()
    if (drawShadow) {
      const shadowW = displayW * SHADOW_WIDTH_RATIO
      const shadowH = Math.max(10, displayW * SHADOW_HEIGHT_RATIO)
      this.shadowGfx.fillStyle(SHADOW_COLOR, SHADOW_ALPHA)
      this.shadowGfx.fillEllipse(cx, cy, shadowW, shadowH)
    }

    const sharkSize = displaySizeForTroopSheet(this.scene, PADDLE_SHARK_IDLE_SHEET.key, 0)
    this.paddleShark.setDisplaySize(sharkSize.width, sharkSize.height)

    const sternX = flipX ? displayW * SHARK_STERN_X_RATIO : -displayW * SHARK_STERN_X_RATIO
    const sharkY = cy + displayH * yFromAnchor(FRAME_SHARK_Y)
    this.paddleShark.setPosition(cx + sternX, sharkY)
    this.paddleShark.setFlipX(flipX)

    const balloonBaseY = cy + displayH * yFromAnchor(FRAME_BALLOON_BASE_Y)
    const boatTopY     = cy + displayH * yFromAnchor(FRAME_BOAT_TOP_Y)
    const leftX        = cx - displayW * 0.10
    const rightX       = cx + displayW * 0.10
    const ropeW = Math.max(4, displayH * 0.015)
    this.ropeGfx.clear()
    this.ropeGfx.lineStyle(ropeW, ROPE_COLOR, 1)
    this.ropeGfx.lineBetween(leftX, balloonBaseY, leftX, boatTopY)
    this.ropeGfx.lineBetween(rightX, balloonBaseY, rightX, boatTopY)
  }

  syncMovement(moving: boolean): void {
    if (moving === this.wasMoving) return
    this.wasMoving = moving
    if (moving) this.playPaddleSharkRow()
    else this.playPaddleSharkIdle()
  }

  destroy(): void {
    this.paddleShark.destroy()
    this.ropeGfx.destroy()
    this.shadowGfx.destroy()
  }

  private playPaddleSharkIdle(): void {
    if (this.scene.anims.exists(PADDLE_SHARK_IDLE_SHEET.animKey)) {
      this.paddleShark.anims.play(PADDLE_SHARK_IDLE_SHEET.animKey, true)
    }
  }

  private playPaddleSharkRow(): void {
    if (this.scene.anims.exists(PADDLE_SHARK_ROW_SHEET.animKey)) {
      this.paddleShark.anims.play(PADDLE_SHARK_ROW_SHEET.animKey, true)
    }
  }
}

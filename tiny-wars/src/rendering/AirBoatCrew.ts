import Phaser from 'phaser'
import { Owner } from '@core/types'
import { PADDLE_SHARK_IDLE_SHEET, PADDLE_SHARK_ROW_SHEET } from '@data/AssetManifest'
import { displaySizeForTroopSheet } from './assetDisplaySize'

const CREW_DEPTH = 5.5
const SHADOW_DEPTH = 4.5
const ROPE_COLOR = 0x8B6914
const SHADOW_COLOR = 0x000000
const SHADOW_ALPHA = 0.3
/** Ground ellipse at the combat anchor — marks where the unit sits on the map. */
const SHADOW_WIDTH_RATIO = 0.42
const SHADOW_HEIGHT_RATIO = 0.14

/**
 * Player-side: anchor is below the hull so the sprite (balloon + hull) floats above.
 * When approaching upward (toward bot tower), the balloon naturally reaches the tower first.
 */
export const AIR_BOAT_SPRITE_ORIGIN_Y = 1.28

/**
 * Bot-side: anchor is at the balloon top so the hull hangs below toward the player tower.
 * When stopping at attack range north of the player tower, the hull visually reaches the tower.
 */
const AIR_BOAT_SPRITE_ORIGIN_Y_BOT = 0

export function airBoatOriginY(owner: Owner): number {
  return owner === Owner.PLAYER ? AIR_BOAT_SPRITE_ORIGIN_Y : AIR_BOAT_SPRITE_ORIGIN_Y_BOT
}

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

/** Health-bar Y offset as a ratio of displayHeight from the sprite anchor. */
export function airBoatHealthBarYRatio(owner: Owner): number {
  return FRAME_BALLOON_CENTER_Y - airBoatOriginY(owner)
}

/** World Y offset from the sprite anchor to the hull aim point. */
export function airBoatAimYOffset(displayHeight: number, owner: Owner): number {
  return displayHeight * (AIR_BOAT_AIM_FRAME_Y - airBoatOriginY(owner))
}

/** @deprecated Use {@link airBoatHealthBarYRatio} with an owner argument. */
export const AIR_BOAT_HEALTH_BAR_Y_FROM_BOAT = FRAME_BALLOON_CENTER_Y - AIR_BOAT_SPRITE_ORIGIN_Y

/** Paddle-shark crew for the Air Boat troop.
 *
 *  Crew renders at standard troop on-map size. The hull sheet scales via {@link air_boat} contentFill.
 */
export class AirBoatCrew {
  private readonly paddleShark: Phaser.GameObjects.Sprite
  private readonly ropeGfx: Phaser.GameObjects.Graphics
  private readonly shadowGfx: Phaser.GameObjects.Graphics
  private readonly originY: number
  private wasMoving = false

  constructor(
    private readonly scene: Phaser.Scene,
    owner: Owner,
  ) {
    this.originY = airBoatOriginY(owner)

    this.paddleShark = scene.add.sprite(0, 0, PADDLE_SHARK_IDLE_SHEET.key, 0)
      .setDepth(CREW_DEPTH)
    this.playPaddleSharkIdle()

    this.ropeGfx = scene.add.graphics().setDepth(CREW_DEPTH - 0.1)
    this.shadowGfx = scene.add.graphics().setDepth(SHADOW_DEPTH)
  }

  /** Convert a frame-relative Y (0=top, 1=bottom) to a world offset from the sprite anchor. */
  private yOff(frameY: number): number {
    return frameY - this.originY
  }

  layout(cx: number, cy: number, displayW: number, displayH: number, flipX: boolean, drawShadow = true): void {
    this.shadowGfx.clear()
    if (drawShadow) {
      const shadowW = displayW * SHADOW_WIDTH_RATIO
      const shadowH = Math.max(10, displayW * SHADOW_HEIGHT_RATIO)
      this.shadowGfx.fillStyle(SHADOW_COLOR, SHADOW_ALPHA)
      // Player: anchor is below hull → shadow at anchor (ground level).
      // Bot: anchor is at balloon top → shadow at hull aim point (below the balloon).
      const shadowFrameY = this.originY === 0 ? AIR_BOAT_AIM_FRAME_Y : AIR_BOAT_SPRITE_ORIGIN_Y
      const shadowY = cy + displayH * this.yOff(shadowFrameY)
      this.shadowGfx.fillEllipse(cx, shadowY, shadowW, shadowH)
    }

    const sharkSize = displaySizeForTroopSheet(this.scene, PADDLE_SHARK_IDLE_SHEET.key, 0)
    this.paddleShark.setDisplaySize(sharkSize.width, sharkSize.height)

    const sternX = flipX ? displayW * SHARK_STERN_X_RATIO : -displayW * SHARK_STERN_X_RATIO
    const sharkY = cy + displayH * this.yOff(FRAME_SHARK_Y)
    this.paddleShark.setPosition(cx + sternX, sharkY)
    this.paddleShark.setFlipX(flipX)

    const balloonBaseY = cy + displayH * this.yOff(FRAME_BALLOON_BASE_Y)
    const boatTopY     = cy + displayH * this.yOff(FRAME_BOAT_TOP_Y)
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

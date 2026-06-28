import Phaser from 'phaser'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { clipAnimKey, BOT_SIDE_TINT } from '@data/AssetManifest'
import { CELL_SIZE } from '@data/GameConstants'
import type { AttackSync } from './EntitySprite'

const CREW_CARD_ID = 'bomb_fish'
const CREW_DEPTH = 5.6
const CREW_HEIGHT = CELL_SIZE * 1.55
/** Seat the bomber near the top of the wood platform. */
const CREW_Y_FRAC = 0.82

export class BombTowerCrew {
  private readonly sprite: Phaser.GameObjects.Sprite
  private attacking = false
  private centerX = 0
  private centerY = 0

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Owner,
  ) {
    const idleKey = clipAnimKey(CREW_CARD_ID, owner, 'idle')
    const idleSheet = `${CREW_CARD_ID}_${owner === Owner.PLAYER ? 'blue' : 'red'}_idle`
    this.sprite = scene.add.sprite(0, 0, idleSheet, 0)
      .setDepth(CREW_DEPTH)
      .setDisplaySize(CREW_HEIGHT, CREW_HEIGHT)

    if (owner === Owner.BOT) {
      this.sprite.setTint(BOT_SIDE_TINT)
    }

    if (scene.anims.exists(idleKey)) {
      this.sprite.anims.play(idleKey, true)
    }
  }

  layout(centerX: number, baseY: number, buildingHeight: number): void {
    this.centerX = centerX
    this.centerY = baseY - buildingHeight * CREW_Y_FRAC
    this.sprite.setPosition(this.centerX, this.centerY)
  }

  getWorldPosition(): Vec2 {
    return { x: this.centerX, y: this.centerY }
  }

  syncAttack(attackSync?: AttackSync): void {
    if (!attackSync || attackSync.windupMs <= 0 || this.attacking) return
    if (attackSync.cooldownMs > 0 && attackSync.cooldownMs <= attackSync.windupMs) {
      this.beginAttack(attackSync.aimPoint)
    }
  }

  /** Fallback when sim damage lands before windup started the clip. */
  onAttackImpact(aimPoint?: Vec2): void {
    if (!this.attacking) this.beginAttack(aimPoint)
  }

  destroy(): void {
    this.sprite.destroy()
  }

  private beginAttack(aimPoint?: Vec2): void {
    const attackKey = clipAnimKey(CREW_CARD_ID, this.owner, 'attack')
    if (!this.scene.anims.exists(attackKey)) return

    if (aimPoint) {
      this.sprite.setFlipX(aimPoint.x < this.centerX)
    }

    this.attacking = true
    this.sprite.anims.play({ key: attackKey, repeat: 0 }, true)
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.attacking = false
      this.playIdle()
    })
  }

  private playIdle(): void {
    const idleKey = clipAnimKey(CREW_CARD_ID, this.owner, 'idle')
    if (!this.scene.anims.exists(idleKey)) return
    this.sprite.anims.play(idleKey, true)
  }
}

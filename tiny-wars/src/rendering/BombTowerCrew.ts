import Phaser from 'phaser'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { clipAnimKey, getAttackWindupMs } from '@data/AssetManifest'
import { COMPOSITE_LAYER_OFFSETS } from '@data/CompositeLayerOffsets'
import { BOMB_TOWER_CREW_CARD_ID, BOMB_TOWER_DECK_Y_FRAC, BOMB_TOWER_BOMBER_FEET_Y } from '@rendering/towerGarrison'
import { displaySizeForCard } from '@rendering/assetDisplaySize'
import type { AttackSync } from './EntitySprite'

const CREW_DEPTH = 5.6
/** Mouth height during the lob frame (fraction of display height above feet). */
const BOMB_LAUNCH_LIFT_FRAC = 0.38

export class BombTowerCrew {
  private readonly sprite: Phaser.GameObjects.Sprite
  private readonly crewSize: { width: number; height: number }
  private attacking = false
  private centerX = 0
  private centerY = 0
  private lastSyncedCooldownMs = 0

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly owner: Owner,
  ) {
    const idleKey = clipAnimKey(BOMB_TOWER_CREW_CARD_ID, owner, 'idle')
    const idleSheet = `${BOMB_TOWER_CREW_CARD_ID}_${owner === Owner.PLAYER ? 'blue' : 'red'}_idle`
    this.crewSize = displaySizeForCard(scene, BOMB_TOWER_CREW_CARD_ID, idleSheet, 0)

    this.sprite = scene.add.sprite(0, 0, idleSheet, 0)
      .setDepth(CREW_DEPTH)
      .setDisplaySize(this.crewSize.width, this.crewSize.height)

    this.applyIdleFacing()

    if (scene.anims.exists(idleKey)) {
      this.sprite.anims.play(idleKey, true)
    }
  }

  layout(centerX: number, baseY: number, buildingHeight: number): void {
    const bomberOff = COMPOSITE_LAYER_OFFSETS.wood_tower!.bomber
    const feetLift = this.crewSize.height * (0.5 - BOMB_TOWER_BOMBER_FEET_Y)
    this.centerX = centerX + bomberOff.x
    this.centerY = baseY - buildingHeight * BOMB_TOWER_DECK_Y_FRAC - feetLift + bomberOff.y
    this.sprite.setPosition(this.centerX, this.centerY)
    if (!this.attacking) this.applyIdleFacing()
  }

  getWorldPosition(): Vec2 {
    return { x: this.centerX, y: this.centerY }
  }

  /** Bomb release point at the bomber's mouth during the lob frame. */
  getLaunchPoint(): Vec2 {
    const lift = this.crewSize.height * BOMB_LAUNCH_LIFT_FRAC
    return { x: this.sprite.x, y: this.sprite.y - lift }
  }

  syncAttack(attackSync?: AttackSync): void {
    if (!attackSync || attackSync.windupMs <= 0 || this.attacking) return

    const cooldownMs = attackSync.cooldownMs
    const jumped = cooldownMs - this.lastSyncedCooldownMs > attackSync.windupMs * 0.5
    this.lastSyncedCooldownMs = cooldownMs

    // Cooldown reset after a shot — start the lob clip at the beginning of the cycle.
    if (jumped) {
      this.beginAttack(attackSync.aimPoint)
      return
    }

    // Fallback: wind-up window before the next sim tick lands (troop-style tail window).
    if (cooldownMs > 0 && cooldownMs <= attackSync.windupMs) {
      this.beginAttack(attackSync.aimPoint)
    }
  }

  /** Fallback when sim damage lands before render sync started the clip. */
  onAttackImpact(aimPoint?: Vec2): void {
    if (!this.attacking) this.beginAttack(aimPoint)
  }

  /** Ms from lob clip start until the bomb leaves the mouth — matches sim windup. */
  lobReleaseDelayMs(): number {
    return getAttackWindupMs(BOMB_TOWER_CREW_CARD_ID, this.owner)
  }

  destroy(): void {
    this.sprite.destroy()
  }

  /** Idle faces the opponent half of the arena (up for player, mirrored for bot). */
  private applyIdleFacing(): void {
    this.sprite.setFlipX(this.owner === Owner.BOT)
  }

  private beginAttack(aimPoint?: Vec2): void {
    const attackKey = clipAnimKey(BOMB_TOWER_CREW_CARD_ID, this.owner, 'attack')
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
    const idleKey = clipAnimKey(BOMB_TOWER_CREW_CARD_ID, this.owner, 'idle')
    if (!this.scene.anims.exists(idleKey)) return
    this.applyIdleFacing()
    this.sprite.anims.play(idleKey, true)
  }
}

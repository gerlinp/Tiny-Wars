import Phaser from 'phaser'
import { HealthBar } from './HealthBar'
import { resolveTexture } from './renderingUtils'
import { clipAnimKey, idleSheetKey, getSideAssets, isAnimatedCard, usesTintedBotSide, BOT_SIDE_TINT, resolveAttackAnimKey, type AnimClip } from '@data/AssetManifest'
import { Owner, CardType } from '@core/types'
import type { Vec2 } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { CELL_SIZE } from '@data/GameConstants'
import { displaySizeForCard } from './assetDisplaySize'
import { DamageFireOverlay } from './DamageFireOverlay'
import { BombTowerCrew } from './BombTowerCrew'

type DisplayObject = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image

export interface AttackSync {
  cooldownMs: number
  windupMs: number
  aimPoint?: Vec2
}

export interface DashSync {
  phase: 'windup' | 'leap'
  aimPoint?: Vec2
  leapPose?: { sheetKey: string; frame: number }
}

export class EntitySprite {
  readonly sprite: DisplayObject
  private healthBar: HealthBar
  private lastX: number
  private flashTween: Phaser.Tweens.Tween | null = null
  private currentAnim: AnimClip = 'idle'
  private attackSwingPlaying = false
  private readonly cardId: string
  private readonly owner: Owner
  private readonly animated: boolean
  private readonly isBuilding: boolean
  private damageFire: DamageFireOverlay | null = null
  private bombCrew: BombTowerCrew | null = null
  private buildingSize = { width: 0, height: 0 }
  private attackAimPoint: Vec2 | undefined
  private frozenPoseActive = false
  private frozenPoseKey: string | null = null
  private frozenPoseFrame = -1

  constructor(
    private scene: Phaser.Scene,
    x: number, y: number,
    cardId: string,
    owner: Owner,
  ) {
    this.cardId = cardId
    this.owner  = owner
    this.animated = isAnimatedCard(cardId)
    this.isBuilding = CARD_DEFINITIONS[cardId]?.cardType === CardType.BUILDING

    const sheetKey = idleSheetKey(cardId, owner)
    const fallback = owner === Owner.PLAYER ? 'placeholder_player' : 'placeholder_bot'
    const key = resolveTexture(scene, sheetKey, fallback)
    const size = displaySizeForCard(scene, cardId, key, 0)

    if (this.animated) {
      const spr = scene.add.sprite(x, y, key, 0).setDepth(5)
      spr.setDisplaySize(size.width, size.height)
      if (this.isBuilding) spr.setOrigin(0.5, 1)
      this.sprite = spr
      this.playLocomotion('idle', 1)
    } else {
      const img = scene.add.image(x, y, key, 0).setDepth(5)
      img.setDisplaySize(size.width, size.height)
      if (this.isBuilding) img.setOrigin(0.5, 1)
      this.sprite = img
    }

    this.healthBar = this.isBuilding
      ? HealthBar.forBuilding(scene, x, y, size.height)
      : HealthBar.forTroop(scene, x, y, size.height)
    if (this.isBuilding) {
      this.buildingSize = size
      this.damageFire = new DamageFireOverlay(scene)
      if (cardId === 'wood_tower') {
        this.bombCrew = new BombTowerCrew(scene, owner)
      }
    }
    this.applyTeamTint()
    this.lastX = x
  }

  private applyTeamTint(): void {
    if (usesTintedBotSide(this.cardId) && this.owner === Owner.BOT) {
      this.sprite.setTint(BOT_SIDE_TINT)
    } else {
      this.sprite.clearTint()
    }
  }

  update(
    x: number, y: number,
    hpFraction: number,
    anim: AnimClip = 'idle',
    moveSpeed = 1.5,
    showHealthBar = false,
    attackSync?: AttackSync,
    dashSync?: DashSync,
  ): void {
    if (this.animated) {
      this.attackAimPoint = attackSync?.aimPoint ?? dashSync?.aimPoint

      const aimForFacing = dashSync?.aimPoint ?? attackSync?.aimPoint
      const dx = x - this.lastX
      if (!this.attackSwingPlaying) {
        if (aimForFacing) {
          this.sprite.setFlipX(aimForFacing.x < x)
        } else if (dx < -0.3) {
          this.sprite.setFlipX(true)
        } else if (dx > 0.3) {
          this.sprite.setFlipX(false)
        }
      }

      if (attackSync && attackSync.windupMs > 0 && !this.attackSwingPlaying && !this.bombCrew) {
        if (attackSync.cooldownMs > 0 && attackSync.cooldownMs <= attackSync.windupMs) {
          this.beginAttackSwing()
        }
      }

      if (!this.attackSwingPlaying) {
        if (dashSync?.phase === 'windup') {
          this.clearFrozenPose()
          this.playLocomotion('idle', 1)
        } else if (dashSync?.phase === 'leap' && dashSync.leapPose) {
          this.showFrozenPose(dashSync.leapPose.sheetKey, dashSync.leapPose.frame, this.sprite.flipX, 'run')
        } else {
          this.clearFrozenPose()
          this.playLocomotion(anim, moveSpeed)
        }
      }
    }

    this.lastX = x
    this.sprite.setPosition(x, y)
    this.healthBar.update(x, y, hpFraction, showHealthBar)

    if (this.isBuilding) {
      const key = this.sprite.texture.key
      this.buildingSize = displaySizeForCard(this.scene, this.cardId, key, 0)

      this.damageFire?.sync(
        {
          centerX: x,
          anchorY: y,
          width: this.buildingSize.width,
          height: this.buildingSize.height,
          origin: 'bottom',
        },
        hpFraction,
        hpFraction > 0,
      )

      this.bombCrew?.layout(x, y, this.buildingSize.height)
      this.bombCrew?.syncAttack(attackSync)
    }
  }

  /** Bomb Fish crew perch — for tower lobs and VFX origin. */
  getBombCrewOrigin(): Vec2 | null {
    return this.bombCrew?.getWorldPosition() ?? null
  }

  /** Fallback when windup did not start before the first strike in a engagement. */
  onAttackImpact(aimPoint?: Vec2): void {
    if (this.bombCrew) {
      this.bombCrew.onAttackImpact(aimPoint)
      return
    }
    if (!this.attackSwingPlaying) this.beginAttackSwing()
  }

  private beginAttackSwing(): void {
    if (!this.animated || !(this.sprite instanceof Phaser.GameObjects.Sprite)) return
    if (this.attackSwingPlaying) return

    this.clearFrozenPose()

    const aim = this.attackAimPoint
    const { key, flipX } = aim
      ? resolveAttackAnimKey(this.cardId, this.owner, this.sprite.x, this.sprite.y, aim.x, aim.y)
      : { key: clipAnimKey(this.cardId, this.owner, 'attack'), flipX: this.sprite.flipX }

    if (!this.scene.anims.exists(key)) return

    this.attackSwingPlaying = true
    this.currentAnim = 'attack'
    this.sprite.setFlipX(flipX)
    this.sprite.anims.timeScale = 1
    this.sprite.anims.play({ key, repeat: 0 }, true)

    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.attackSwingPlaying = false
      if (this.currentAnim === 'attack') this.currentAnim = 'idle'
    })
  }

  private clearFrozenPose(): void {
    this.frozenPoseActive = false
    this.frozenPoseKey = null
    this.frozenPoseFrame = -1
  }

  private showFrozenPose(
    sheetKey: string,
    frame: number,
    flipX: boolean,
    currentAnim: AnimClip,
  ): void {
    if (!(this.sprite instanceof Phaser.GameObjects.Sprite)) return

    this.sprite.setFlipX(flipX)
    if (
      this.frozenPoseActive &&
      this.frozenPoseKey === sheetKey &&
      this.frozenPoseFrame === frame
    ) {
      return
    }

    this.sprite.anims.stop()
    this.sprite.setTexture(sheetKey, frame)
    this.frozenPoseActive = true
    this.frozenPoseKey = sheetKey
    this.frozenPoseFrame = frame
    this.currentAnim = currentAnim
  }

  private playLocomotion(anim: AnimClip, moveSpeed: number): void {
    if (!this.animated || !(this.sprite instanceof Phaser.GameObjects.Sprite)) return

    const key = clipAnimKey(this.cardId, this.owner, anim)
    if (!this.scene.anims.exists(key)) return

    const side = getSideAssets(this.cardId, this.owner)
    const clipDef = side?.[anim]
    const baseRate = clipDef?.frameRate ?? 10

    const cellCrossMs = (CELL_SIZE / Math.max(moveSpeed, 0.5)) * (1000 / CELL_SIZE)
    const frameCount = clipDef ? clipDef.end - clipDef.start + 1 : 6
    const timeScale = anim === 'run'
      ? Math.max(0.6, Math.min(2.5, (frameCount / baseRate) / (cellCrossMs / 1000)))
      : 1

    if (this.currentAnim === anim && this.sprite.anims.currentAnim?.key === key) {
      this.sprite.anims.timeScale = timeScale
      return
    }

    this.currentAnim = anim
    this.sprite.anims.timeScale = timeScale
    this.sprite.anims.play(key, true)
  }

  flashDamage(): void {
    this.healthBar.setVisible(true)
    if (this.flashTween) return
    this.sprite.setTint(0xff4444)
    this.flashTween = this.scene.tweens.add({
      targets: this.sprite,
      duration: 120,
      onComplete: () => {
        this.applyTeamTint()
        this.flashTween = null
      },
    })
  }

  getFlipX(): boolean {
    return this.sprite.flipX
  }

  destroy(): void {
    this.damageFire?.destroy()
    this.bombCrew?.destroy()
    this.sprite.destroy()
    this.healthBar.destroy()
    this.flashTween?.stop()
  }
}

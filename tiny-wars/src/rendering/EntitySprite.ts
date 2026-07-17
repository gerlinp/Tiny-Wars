import Phaser from 'phaser'
import { HealthBar } from './HealthBar'
import { resolveTexture } from './renderingUtils'
import { clipAnimKey, idleSheetKey, getSideAssets, isAnimatedCard, resolveAttackAnimKey, TNT_BARREL_LOWHP_FX, type AnimClip } from '@data/AssetManifest'
import { Owner, CardType } from '@core/types'
import type { Vec2 } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { CELL_SIZE } from '@data/GameConstants'
import { COMPOSITE_LAYER_OFFSETS } from '@data/CompositeLayerOffsets'
import { displaySizeForCard } from './assetDisplaySize'
import { DamageFireOverlay } from './DamageFireOverlay'
import { BombTowerCrew } from './BombTowerCrew'
import { AirBoatCrew, airBoatOriginY, airBoatHealthBarYRatio, airBoatAimYOffset } from './AirBoatCrew'

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

/** Monk-style heal burst — loop the heal clip while pulses are active (even while walking). */
export interface HealSync {
  aimPoint?: Vec2
}

/** Pig Shaman hex — purple wash on cursed units so the transform threat reads at a glance. */
const CURSE_TINT = 0xcc66ff

export class EntitySprite {
  readonly sprite: DisplayObject
  private healthBar: HealthBar
  private lastX: number
  private flashTween: Phaser.Tweens.Tween | null = null
  private currentAnim: AnimClip = 'idle'
  /** Pig Shaman hex active on this unit — tinted purple until it expires. */
  private cursed = false
  private attackSwingPlaying = false
  private readonly cardId: string
  private readonly owner: Owner
  private readonly animated: boolean
  private readonly isBuilding: boolean
  private damageFire: DamageFireOverlay | null = null
  private bombCrew: BombTowerCrew | null = null
  private airBoatCrew: AirBoatCrew | null = null
  private buildingSize = { width: 0, height: 0 }
  private attackAimPoint: Vec2 | undefined
  private frozenPoseActive = false
  private frozenPoseKey: string | null = null
  private frozenPoseFrame = -1
  private healLoopActive = false
  private tntBarrelSparkActive = false

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

    // air_boat — health bar on the balloon; combat anchor sits below the hull.
    const hbarHeight = cardId === 'air_boat' ? size.height * 0.5 : size.height
    const hbarY = cardId === 'air_boat'
      ? y + size.height * airBoatHealthBarYRatio(owner)
      : y
    this.healthBar = this.isBuilding
      ? HealthBar.forBuilding(scene, x, y, size.height, owner)
      : HealthBar.forTroop(scene, x, hbarY, hbarHeight, owner)
    if (this.isBuilding) {
      this.buildingSize = size
      this.damageFire = new DamageFireOverlay(scene)
      if (cardId === 'wood_tower') {
        this.bombCrew = new BombTowerCrew(scene, owner)
      }
    } else if (cardId === 'air_boat') {
      // Combat anchor sits below the hull; boat + balloon render above tower-top height.
      this.sprite.setOrigin(0.5, airBoatOriginY(owner))
      this.airBoatCrew = new AirBoatCrew(scene, owner)
    }
    this.applyTeamTint()
    this.lastX = x
  }

  private applyTeamTint(): void {
    if (this.cursed) {
      this.sprite.setTint(CURSE_TINT)
    } else {
      this.sprite.clearTint()
    }
  }

  /** Pig Shaman hex — purple tint while the transformation curse is active. */
  setCursed(cursed: boolean): void {
    if (this.cursed === cursed) return
    this.cursed = cursed
    // A damage flash in progress re-applies the (curse-aware) tint when it ends
    if (!this.flashTween) this.applyTeamTint()
  }

  /** Hide the body while keeping the sprite alive (e.g. Miner underground). */
  setHidden(hidden: boolean): void {
    this.sprite.setVisible(!hidden)
    if (hidden) this.healthBar.update(this.sprite.x, this.sprite.y, 1, false)
  }

  update(
    x: number, y: number,
    hpFraction: number,
    anim: AnimClip = 'idle',
    moveSpeed = 1.5,
    showHealthBar = false,
    attackSync?: AttackSync,
    dashSync?: DashSync,
    healSync?: HealSync,
  ): void {
    if (this.animated) {
      this.attackAimPoint = attackSync?.aimPoint ?? healSync?.aimPoint ?? dashSync?.aimPoint

      const aimForFacing = dashSync?.aimPoint ?? attackSync?.aimPoint ?? healSync?.aimPoint
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
        } else if (healSync) {
          this.clearFrozenPose()
          this.playHealLoop(healSync.aimPoint)
        } else if (
          this.cardId === 'tnt_barrel'
          && hpFraction > 0
          && hpFraction <= TNT_BARREL_LOWHP_FX.hpFraction
        ) {
          this.clearFrozenPose()
          this.playTntBarrelSpark()
        } else {
          this.clearFrozenPose()
          this.playLocomotion(anim, moveSpeed)
        }
      }
    }

    this.lastX = x
    if (this.cardId === 'wood_tower') {
      const platOff = COMPOSITE_LAYER_OFFSETS.wood_tower!.platform
      this.sprite.setPosition(x + platOff.x, y + platOff.y)
    } else {
      this.sprite.setPosition(x, y)
    }
    if (this.airBoatCrew) {
      this.airBoatCrew.layout(x, y, this.sprite.displayWidth, this.sprite.displayHeight, this.sprite.flipX)
      this.airBoatCrew.syncMovement(anim === 'run')
    }
    this.healthBar.update(
      x,
      this.airBoatCrew ? y + this.sprite.displayHeight * airBoatHealthBarYRatio(this.owner) : y,
      hpFraction,
      showHealthBar,
    )

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

  /** Bomb-tower deck bomber — feet anchor on the platform. */
  getBombCrewOrigin(): Vec2 | null {
    return this.bombCrew?.getWorldPosition() ?? null
  }

  /** Bomb-tower lob release — mouth height during Bomb Fish_Shoot frame 4. */
  getBombLaunchPoint(): Vec2 | null {
    return this.bombCrew?.getLaunchPoint() ?? this.getBombCrewOrigin()
  }

  /** Ms from lob clip start until the visible bomb should leave the bomber. */
  getBombTowerLobDelayMs(): number {
    return this.bombCrew?.lobReleaseDelayMs() ?? 0
  }

  /** World point attackers should face / strike — hull centre for air boat, feet otherwise. */
  getAimPoint(): Vec2 {
    if (this.cardId === 'air_boat') {
      return {
        x: this.sprite.x,
        y: this.sprite.y + airBoatAimYOffset(this.sprite.displayHeight, this.owner),
      }
    }
    return { x: this.sprite.x, y: this.sprite.y }
  }

  /** Troop ranged projectile launch point — above feet toward the upper body. */
  getProjectileOrigin(): Vec2 {
    if (this.cardId === 'air_boat') return this.getAimPoint()
    const lift = this.sprite.displayHeight * 0.22
    return { x: this.sprite.x, y: this.sprite.y - lift }
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

    this.healLoopActive = false
    this.tntBarrelSparkActive = false
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

  private playHealLoop(aim?: Vec2): void {
    if (!this.animated || !(this.sprite instanceof Phaser.GameObjects.Sprite)) return

    const { key, flipX } = aim
      ? resolveAttackAnimKey(this.cardId, this.owner, this.sprite.x, this.sprite.y, aim.x, aim.y)
      : { key: clipAnimKey(this.cardId, this.owner, 'attack'), flipX: this.sprite.flipX }

    if (!this.scene.anims.exists(key)) return

    this.sprite.setFlipX(flipX)
    if (this.healLoopActive && this.sprite.anims.currentAnim?.key === key) return

    this.healLoopActive = true
    this.tntBarrelSparkActive = false
    this.currentAnim = 'attack'
    this.sprite.anims.timeScale = 1
    this.sprite.anims.play({ key, repeat: -1 }, true)
  }

  /** TNT Barrel below its low-HP threshold — spark loop, either side, until it detonates. */
  private playTntBarrelSpark(): void {
    if (!this.animated || !(this.sprite instanceof Phaser.GameObjects.Sprite)) return

    const key = TNT_BARREL_LOWHP_FX.animKey
    if (!this.scene.anims.exists(key)) return
    if (this.tntBarrelSparkActive && this.sprite.anims.currentAnim?.key === key) return

    this.healLoopActive = false
    this.tntBarrelSparkActive = true
    this.currentAnim = 'idle'
    this.sprite.anims.timeScale = 1
    this.sprite.anims.play({ key, repeat: -1 }, true)
  }

  private playLocomotion(anim: AnimClip, moveSpeed: number): void {
    if (!this.animated || !(this.sprite instanceof Phaser.GameObjects.Sprite)) return

    this.healLoopActive = false
    this.tntBarrelSparkActive = false

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
    this.airBoatCrew?.destroy()
    this.sprite.destroy()
    this.healthBar.destroy()
    this.flashTween?.stop()
  }
}

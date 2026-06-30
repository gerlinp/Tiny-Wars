import Phaser from 'phaser'
import type { Tower } from '@core/entities/Tower'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { towerTextureKey } from './renderingUtils'
import { applyTowerDisplaySize, displaySizeForCard, displaySizeForTower, type DisplaySize } from './assetDisplaySize'
import { towerRenderX, towerRenderY, towerHealthBarX, towerHealthBarY } from './towerRenderPosition'
import {
  GARRISON_ARCHER_FEET_Y,
  GARRISON_CANNON_FEET_Y,
  GARRISON_CANNON_MUZZLE_LIFT,
  GARRISON_CANNON_RECOIL_HOLD_MS,
  GARRISON_CANNON_SIZE_MULT,
  MERLON_OVERLAY,
  GARRISON_ARCHER_CARD_ID,
  garrisonArcherIdleAnimKey,
  garrisonArcherSheetKey,
  garrisonArcherShootAnimKey,
  garrisonCannonIdleKey,
  garrisonSlotUnit,
  isKingCannonSlot,
  kingCannonDeckWorldY,
  garrisonSlots,
  pickGarrisonShooterIndex,
  GARRISON_CANNON_ROCKET_BURST_SCALE,
  GARRISON_CANNON_ROCKET_KICK_PX,
} from './towerGarrison'
import { HealthBar } from './HealthBar'
import { DamageFireOverlay } from './DamageFireOverlay'

const GARRISON_DEPTH = 4.5
const MERLON_DEPTH = 5.5
const TOWER_TEXTURE_HEIGHT = 256
/** Bow/chest height above feet when spawning tower arrows. */
const GARRISON_ARROW_LIFT = 0.45

export interface TowerAttackSync {
  cooldownMs: number
  windupMs: number
  aimPoint: Vec2 | null
}

export class TowerSprite {
  readonly image: Phaser.GameObjects.Image
  private readonly merlonOverlay: Phaser.GameObjects.Image
  private healthBar: HealthBar | null
  private flashTween: Phaser.Tweens.Tween | null = null
  private defeated = false
  private readonly garrison: Phaser.GameObjects.Sprite[] = []
  private readonly isKing: boolean
  private readonly owner: Owner
  private garrisonShooting = false
  private lastArrowOrigin: Vec2 | null = null
  private cannonShotTimer: Phaser.Time.TimerEvent | null = null
  private cannonRecoilActive = false
  private cannonRecoilIndex = -1
  private towerCx = 0
  private towerRy = 0
  private towerSize: DisplaySize = { width: 0, height: 0 }
  private readonly archerSize: DisplaySize
  private readonly cannonSize: DisplaySize
  private readonly damageFire: DamageFireOverlay

  constructor(
    private scene: Phaser.Scene,
    tower: Tower,
  ) {
    this.damageFire = new DamageFireOverlay(this.scene)
    this.isKing = tower.isKing
    this.owner = tower.owner
    const key = towerTextureKey(tower.isKing, tower.owner)
    const size = displaySizeForTower(scene, tower.isKing, key)
    const rx = towerRenderX(tower.position.x, tower.owner, tower.isKing)
    const ry = towerRenderY(tower.position.y, tower.owner, tower.isKing, tower.position.x)

    this.image = scene.add.image(rx, ry, key).setDepth(4)
    applyTowerDisplaySize(this.image, scene, tower.isKing, key)
    this.merlonOverlay = scene.add.image(rx, ry, key).setDepth(MERLON_DEPTH)
    this.layoutMerlonOverlay(key)
    const barX = towerHealthBarX(tower.position.x, tower.owner, tower.isKing)
    const barY = towerHealthBarY(tower.position.y, tower.owner, tower.isKing, size.height, tower.position.x)
    this.healthBar = HealthBar.forTower(
      scene,
      barX,
      barY,
      size.width,
      tower.isKing,
      tower.owner,
    )
    this.towerCx = tower.position.x
    this.towerRy = ry
    this.towerSize = size
    const archerKey = garrisonArcherSheetKey(this.owner)
    this.archerSize = displaySizeForCard(this.scene, GARRISON_ARCHER_CARD_ID, archerKey, 0)
    this.cannonSize = {
      width: this.archerSize.width * GARRISON_CANNON_SIZE_MULT,
      height: this.archerSize.height * GARRISON_CANNON_SIZE_MULT,
    }
    this.spawnGarrison()
    this.playGarrisonIdle()
  }

  update(
    x: number,
    logicY: number,
    hpFraction: number,
    showHealthBar: boolean,
    attackSync?: TowerAttackSync,
  ): void {
    if (this.defeated) return

    const rx = towerRenderX(x, this.owner, this.isKing)
    const ry = towerRenderY(logicY, this.owner, this.isKing, x)
    this.image.setPosition(rx, ry)
    this.layoutMerlonOverlay(this.image.texture.key)
    this.towerCx = x
    this.towerRy = ry
    this.towerSize = displaySizeForTower(this.scene, this.isKing, this.image.texture.key)
    const barX = towerHealthBarX(x, this.owner, this.isKing)
    const barY = towerHealthBarY(logicY, this.owner, this.isKing, this.towerSize.height, x)
    this.healthBar?.update(barX, barY, hpFraction, showHealthBar)
    this.layoutGarrison()

    if (attackSync?.aimPoint && attackSync.windupMs > 0 && !this.garrisonShooting) {
      if (attackSync.cooldownMs > 0 && attackSync.cooldownMs <= attackSync.windupMs) {
        this.beginGarrisonShot(attackSync.aimPoint)
      }
    } else if (!this.garrisonShooting && !this.cannonRecoilActive) {
      this.ensureGarrisonIdle()
    }

    this.damageFire.sync(
      {
        centerX: x,
        anchorY: ry,
        width: this.towerSize.width,
        height: this.towerSize.height,
        origin: 'center',
      },
      hpFraction,
      hpFraction > 0,
    )
  }

  /** Princess-tower archer volley on combat impact. King uses fireCannonAt() instead. */
  onAttackImpact(aimPoint: Vec2): void {
    if (this.defeated) return
    if (this.isKing) {
      this.fireCannonAt(aimPoint)
      return
    }
    if (this.garrisonShooting) return
    this.beginGarrisonShot(aimPoint)
  }

  /** World position of the archer/cannon that fired the current/last volley. */
  getArrowOrigin(): Vec2 | null {
    return this.lastArrowOrigin
  }

  /** Muzzle of the king-tower centre cannon (for rocket spells). */
  getCannonMuzzle(): Vec2 | null {
    if (!this.isKing || this.defeated) return null
    const index = this.findCannonIndex()
    if (index < 0) return null
    return this.garrisonProjectileOrigin(index)
  }

  /** Aim and recoil the garrison cannon; returns muzzle for projectile spawn. */
  fireCannonAt(aimPoint: Vec2): Vec2 | null {
    if (!this.isKing || this.defeated) return null
    const index = this.findCannonIndex()
    if (index < 0) return null
    const cannon = this.garrison[index]
    if (!cannon) return null

    const origin = this.garrisonProjectileOrigin(index)
    this.cannonShotTimer?.remove()
    this.cannonShotTimer = null
    this.stopCannonRecoil()
    this.garrisonShooting = true
    this.lastArrowOrigin = origin
    this.playCannonFire(cannon, index, aimPoint)
    return origin
  }

  setDestroyed(owner: Owner): void {
    this.defeated = true
    this.flashTween?.stop()
    this.flashTween = null
    this.cannonShotTimer?.remove()
    this.cannonShotTimer = null
    this.stopCannonRecoil()

    const key = towerTextureKey(this.isKing, owner, true)
    this.image.setTexture(key)
    applyTowerDisplaySize(this.image, this.scene, this.isKing, key)
    this.layoutMerlonOverlay(key)
    this.image.setTint(0x666666)
    this.merlonOverlay.setVisible(false)
    this.damageFire.hide()

    this.healthBar?.destroy()
    this.healthBar = null

    for (const unit of this.garrison) {
      unit.anims.stop()
      unit.setVisible(false)
    }
  }

  flashDamage(): void {
    if (this.defeated) return
    this.healthBar?.setVisible(true)
    if (this.flashTween) return
    this.image.setTint(0xff4444)
    this.merlonOverlay.setTint(0xff4444)
    for (const unit of this.garrison) unit.setTint(0xff4444)
    this.flashTween = this.scene.tweens.add({
      targets: this.image,
      duration: 120,
      onComplete: () => {
        this.image.clearTint()
        this.merlonOverlay.clearTint()
        for (const unit of this.garrison) unit.clearTint()
        this.flashTween = null
      },
    })
  }

  destroy(): void {
    this.cannonShotTimer?.remove()
    this.cannonShotTimer = null
    this.stopCannonRecoil()
    this.damageFire.destroy()
    this.image.destroy()
    this.merlonOverlay.destroy()
    this.healthBar?.destroy()
    this.flashTween?.stop()
    for (const unit of this.garrison) unit.destroy()
  }

  private spawnGarrison(): void {
    const archerKey = garrisonArcherSheetKey(this.owner)
    const archerReady = this.scene.textures.exists(archerKey)
    const cannonIdleKey = garrisonCannonIdleKey(this.owner)
    const cannonReady = this.scene.textures.exists(cannonIdleKey)
    const slots = garrisonSlots(this.isKing, this.owner)

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex]
      const unit = garrisonSlotUnit(slot)
      if (unit === 'cannon') {
        if (!cannonReady) continue
        const cannon = this.scene.add.sprite(this.towerCx, this.towerRy, cannonIdleKey, 0)
          .setDepth(GARRISON_DEPTH)
          .setOrigin(0.5, GARRISON_CANNON_FEET_Y)
          .setData('garrisonSlot', slotIndex)
        this.garrison.push(cannon)
        continue
      }
      if (!archerReady) continue
      const archer = this.scene.add.sprite(this.towerCx, this.towerRy, archerKey, 0)
        .setDepth(GARRISON_DEPTH)
        .setOrigin(0.5, GARRISON_ARCHER_FEET_Y)
        .setData('garrisonSlot', slotIndex)
      if (slot.flipX) archer.setFlipX(true)
      this.garrison.push(archer)
    }

    this.layoutGarrison()
  }

  private layoutMerlonOverlay(textureKey: string): void {
    const crop = MERLON_OVERLAY[this.isKing ? 'king' : 'princess']
    const frame = this.scene.textures.getFrame(textureKey, 0)
    const scale = this.towerSize.height / TOWER_TEXTURE_HEIGHT
    const overlayH = crop.height * scale
    const offsetY = (TOWER_TEXTURE_HEIGHT / 2 - (crop.y + crop.height / 2)) * scale

    this.merlonOverlay
      .setTexture(textureKey)
      .setCrop(0, crop.y, frame.width, crop.height)
      .setDisplaySize(this.towerSize.width, overlayH)
      .setPosition(this.image.x, this.towerRy - offsetY)
  }

  private garrisonSlotIndex(garrisonIndex: number): number {
    return (this.garrison[garrisonIndex]?.getData('garrisonSlot') as number | undefined) ?? garrisonIndex
  }

  private findCannonIndex(): number {
    for (let i = 0; i < this.garrison.length; i++) {
      if (this.garrisonUnitType(i) === 'cannon') return i
    }
    return -1
  }

  private garrisonUnitType(index: number) {
    const slots = garrisonSlots(this.isKing, this.owner)
    const slot = slots[this.garrisonSlotIndex(index)]
    return garrisonSlotUnit(slot ?? { relX: 0, deckRelY: 0 })
  }

  private garrisonProjectileOrigin(index: number): Vec2 {
    const unit = this.garrison[index]
    if (!unit) return { x: this.towerCx, y: this.towerRy }

    if (this.garrisonUnitType(index) === 'cannon') {
      return {
        x: unit.x,
        y: unit.y - this.cannonSize.height * GARRISON_CANNON_MUZZLE_LIFT,
      }
    }
    return {
      x: unit.x,
      y: unit.y - this.archerSize.height * GARRISON_ARROW_LIFT,
    }
  }

  private garrisonPositions(): Vec2[] {
    return this.garrison.map((_, i) => this.garrisonProjectileOrigin(i))
  }

  private garrisonDeckPosition(slot: { relX: number; deckRelY: number }): Vec2 {
    if (isKingCannonSlot(this.isKing, slot)) {
      const useSpriteRelative = slot.relX !== 0 || slot.deckRelY !== 0
      if (useSpriteRelative) {
        return {
          x: this.towerCx + slot.relX * this.towerSize.width,
          y: this.towerRy + slot.deckRelY * this.towerSize.height,
        }
      }
      return {
        x: this.towerCx + slot.relX * this.towerSize.width,
        y: kingCannonDeckWorldY(this.owner),
      }
    }
    return {
      x: this.towerCx + slot.relX * this.towerSize.width,
      y: this.towerRy + slot.deckRelY * this.towerSize.height,
    }
  }

  private beginGarrisonShot(aimPoint: Vec2): void {
    if (this.garrison.length === 0) return

    const index = this.pickShooterIndex(aimPoint)
    const shooter = this.garrison[index]
    if (!shooter) return

    this.garrisonShooting = true
    this.lastArrowOrigin = this.garrisonProjectileOrigin(index)

    for (let i = 0; i < this.garrison.length; i++) {
      if (i !== index) this.playGarrisonUnitIdle(i)
    }

    if (this.garrisonUnitType(index) === 'cannon') {
      this.playCannonFire(shooter, index, aimPoint)
      return
    }

    const shootKey = garrisonArcherShootAnimKey(this.owner)
    if (!this.scene.anims.exists(shootKey)) {
      this.garrisonShooting = false
      return
    }

    shooter.anims.timeScale = 1
    shooter.anims.play({ key: shootKey, repeat: 0 }, true)

    shooter.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.garrisonShooting = false
      this.playGarrisonUnitIdle(index)
    })
  }

  private playCannonFire(cannon: Phaser.GameObjects.Sprite, index: number, aimPoint: Vec2): void {
    const home = this.cannonRecoilHome(index)
    const baseW = this.cannonSize.width
    const baseH = this.cannonSize.height
    const burstW = baseW * GARRISON_CANNON_ROCKET_BURST_SCALE
    const burstH = baseH * GARRISON_CANNON_ROCKET_BURST_SCALE

    const dx = aimPoint.x - home.x
    const dy = aimPoint.y - home.y
    const len = Math.hypot(dx, dy) || 1
    const kickX = home.x - (dx / len) * GARRISON_CANNON_ROCKET_KICK_PX
    const kickY = home.y - (dy / len) * GARRISON_CANNON_ROCKET_KICK_PX

    cannon.anims.stop()

    this.cannonShotTimer?.remove()
    this.stopCannonRecoil()
    this.cannonRecoilActive = true
    this.cannonRecoilIndex = index
    this.scene.tweens.killTweensOf(cannon)

    cannon.setDisplaySize(burstW, burstH)
    cannon.setPosition(kickX, kickY)

    this.cannonShotTimer = this.scene.time.delayedCall(GARRISON_CANNON_RECOIL_HOLD_MS, () => {
      this.cannonShotTimer = null
      cannon.setDisplaySize(baseW, baseH)
      cannon.setPosition(home.x, home.y)
      this.cannonRecoilActive = false
      this.cannonRecoilIndex = -1
      this.garrisonShooting = false
      this.playGarrisonUnitIdle(index)
    })
  }

  private cannonRecoilHome(index: number): Vec2 {
    const slots = garrisonSlots(this.isKing, this.owner)
    const slot = slots[this.garrisonSlotIndex(index)]
    return slot ? this.garrisonDeckPosition(slot) : { x: this.garrison[index]!.x, y: this.garrison[index]!.y }
  }

  private stopCannonRecoil(): void {
    if (this.cannonRecoilIndex >= 0) {
      const cannon = this.garrison[this.cannonRecoilIndex]
      if (cannon) this.scene.tweens.killTweensOf(cannon)
    }
    this.cannonRecoilActive = false
    this.cannonRecoilIndex = -1
  }

  private pickShooterIndex(_aimPoint: Vec2): number {
    if (this.isKing) {
      const cannon = this.findCannonIndex()
      return cannon >= 0 ? cannon : 0
    }
    return pickGarrisonShooterIndex(this.garrisonPositions(), _aimPoint)
  }

  private playGarrisonIdle(): void {
    for (let i = 0; i < this.garrison.length; i++) {
      this.playGarrisonUnitIdle(i)
    }
  }

  /** Keep archer idle loops and cannon resting frame when not firing. */
  private ensureGarrisonIdle(): void {
    for (let i = 0; i < this.garrison.length; i++) {
      if (this.cannonRecoilActive && i === this.cannonRecoilIndex) continue
      const unit = this.garrison[i]
      if (!unit) continue

      if (this.garrisonUnitType(i) === 'cannon') {
        const idleTex = garrisonCannonIdleKey(this.owner)
        if (unit.texture.key !== idleTex) this.playGarrisonUnitIdle(i)
        continue
      }

      const idleKey = garrisonArcherIdleAnimKey(this.owner)
      if (!this.scene.anims.exists(idleKey)) continue
      if (!unit.anims.isPlaying || unit.anims.currentAnim?.key !== idleKey) {
        this.playGarrisonUnitIdle(i)
      }
    }
  }

  private playGarrisonUnitIdle(index: number): void {
    const unit = this.garrison[index]
    if (!unit) return

    if (this.garrisonUnitType(index) === 'cannon') {
      unit.anims.stop()
      unit.setTexture(garrisonCannonIdleKey(this.owner), 0)
      unit.setFlipX(false)
      return
    }

    const idleKey = garrisonArcherIdleAnimKey(this.owner)
    if (!this.scene.anims.exists(idleKey)) return
    unit.anims.timeScale = 1
    unit.anims.play(idleKey, true)
  }

  private layoutGarrison(): void {
    const slots = garrisonSlots(this.isKing, this.owner)
    for (let i = 0; i < this.garrison.length; i++) {
      const unit = this.garrison[i]
      const slot = slots[this.garrisonSlotIndex(i)]
      if (!slot) continue
      if (this.cannonRecoilActive && i === this.cannonRecoilIndex) continue

      const isCannon = garrisonSlotUnit(slot) === 'cannon'
      const size = isCannon ? this.cannonSize : this.archerSize
      unit.setDisplaySize(size.width, size.height)
      unit.setOrigin(0.5, isCannon ? GARRISON_CANNON_FEET_Y : GARRISON_ARCHER_FEET_Y)
      const deck = this.garrisonDeckPosition(slot)
      unit.setPosition(deck.x, deck.y)
    }

    if (this.lastArrowOrigin && this.garrison.length > 0) {
      const positions = this.garrisonPositions()
      const idx = pickGarrisonShooterIndex(positions, this.lastArrowOrigin)
      const pos = positions[idx]
      if (pos) this.lastArrowOrigin = { x: pos.x, y: pos.y }
    }
  }
}

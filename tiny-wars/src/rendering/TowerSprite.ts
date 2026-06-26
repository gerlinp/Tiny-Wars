import Phaser from 'phaser'
import type { Tower } from '@core/entities/Tower'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { towerTextureKey } from './AssetRegistry'
import { applyTowerDisplaySize, displaySizeForCard, displaySizeForTower, type DisplaySize } from './assetDisplaySize'
import { towerRenderY, towerHealthBarX, towerHealthBarY } from './towerRenderPosition'
import {
  GARRISON_ARCHER_FEET_Y,
  MERLON_OVERLAY,
  garrisonIdleAnimKey,
  garrisonSheetKey,
  garrisonShootAnimKey,
  garrisonSlots,
  pickGarrisonArcherIndex,
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
  private nextGarrisonShooter = 0
  private lastArrowOrigin: Vec2 | null = null
  private towerCx = 0
  private towerRy = 0
  private towerSize: DisplaySize = { width: 0, height: 0 }
  private readonly archerSize: DisplaySize
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
    const ry = towerRenderY(tower.position.y, tower.owner, tower.isKing)

    this.image = scene.add.image(tower.position.x, ry, key).setDepth(4)
    applyTowerDisplaySize(this.image, scene, tower.isKing, key)
    this.merlonOverlay = scene.add.image(tower.position.x, ry, key).setDepth(MERLON_DEPTH)
    this.layoutMerlonOverlay(key)
    const barX = towerHealthBarX(tower.position.x, tower.owner, tower.isKing)
    const barY = towerHealthBarY(tower.position.y, tower.owner, tower.isKing, size.height, tower.position.x)
    this.healthBar = HealthBar.forTower(
      scene,
      barX,
      barY,
      size.width,
      tower.isKing,
    )
    this.towerCx = tower.position.x
    this.towerRy = ry
    this.towerSize = size
    const archerKey = garrisonSheetKey(this.owner)
    this.archerSize = displaySizeForCard(this.scene, 'archer', archerKey, 0)
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

    const ry = towerRenderY(logicY, this.owner, this.isKing)
    this.image.setPosition(x, ry)
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

  /** Fallback when windup did not start before the first tower shot. */
  onAttackImpact(aimPoint: Vec2): void {
    if (this.defeated || this.garrisonShooting) return
    this.beginGarrisonShot(aimPoint)
  }

  /** World position of the archer that fired the current/last volley. */
  getArrowOrigin(): Vec2 | null {
    return this.lastArrowOrigin
  }

  setDestroyed(owner: Owner): void {
    this.defeated = true
    this.flashTween?.stop()
    this.flashTween = null

    const key = towerTextureKey(this.isKing, owner, true)
    this.image.setTexture(key)
    applyTowerDisplaySize(this.image, this.scene, this.isKing, key)
    this.layoutMerlonOverlay(key)
    this.image.setTint(0x666666)
    this.merlonOverlay.setVisible(false)
    this.damageFire.hide()

    this.healthBar?.destroy()
    this.healthBar = null

    for (const archer of this.garrison) {
      archer.anims.stop()
      archer.setVisible(false)
    }
  }

  flashDamage(): void {
    if (this.defeated) return
    this.healthBar?.setVisible(true)
    if (this.flashTween) return
    this.image.setTint(0xff4444)
    this.merlonOverlay.setTint(0xff4444)
    for (const archer of this.garrison) archer.setTint(0xff4444)
    this.flashTween = this.scene.tweens.add({
      targets: this.image,
      duration: 120,
      onComplete: () => {
        this.image.clearTint()
        this.merlonOverlay.clearTint()
        for (const archer of this.garrison) archer.clearTint()
        this.flashTween = null
      },
    })
  }

  destroy(): void {
    this.damageFire.destroy()
    this.image.destroy()
    this.merlonOverlay.destroy()
    this.healthBar?.destroy()
    this.flashTween?.stop()
    for (const archer of this.garrison) archer.destroy()
  }

  private spawnGarrison(): void {
    const sheetKey = garrisonSheetKey(this.owner)
    if (!this.scene.textures.exists(sheetKey)) return

    for (const slot of garrisonSlots(this.isKing)) {
      const archer = this.scene.add.sprite(this.towerCx, this.towerRy, sheetKey, 0)
        .setDepth(GARRISON_DEPTH)
        .setOrigin(0.5, GARRISON_ARCHER_FEET_Y)
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
      .setPosition(this.towerCx, this.towerRy - offsetY)
  }

  private garrisonPositions(): Vec2[] {
    return this.garrison.map(archer => this.garrisonBowOrigin(archer))
  }

  private garrisonDeckPosition(slot: { relX: number; deckRelY: number }): Vec2 {
    return {
      x: this.towerCx + slot.relX * this.towerSize.width,
      y: this.towerRy + slot.deckRelY * this.towerSize.height,
    }
  }

  private garrisonBowOrigin(archer: Phaser.GameObjects.Sprite): Vec2 {
    return {
      x: archer.x,
      y: archer.y - this.archerSize.height * GARRISON_ARROW_LIFT,
    }
  }

  private beginGarrisonShot(aimPoint: Vec2): void {
    if (this.garrison.length === 0) return

    const shootKey = garrisonShootAnimKey(this.owner)
    if (!this.scene.anims.exists(shootKey)) return

    const index = this.pickShooterIndex(aimPoint)
    const archer = this.garrison[index]
    if (!archer) return

    this.garrisonShooting = true
    this.lastArrowOrigin = this.garrisonBowOrigin(archer)

    for (let i = 0; i < this.garrison.length; i++) {
      if (i !== index) this.playArcherIdle(this.garrison[i])
    }

    archer.anims.timeScale = 1
    archer.anims.play({ key: shootKey, repeat: 0 }, true)

    archer.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.garrisonShooting = false
      this.playArcherIdle(archer)
    })
  }

  private pickShooterIndex(aimPoint: Vec2): number {
    if (this.isKing) {
      const index = this.nextGarrisonShooter % this.garrison.length
      this.nextGarrisonShooter = (this.nextGarrisonShooter + 1) % this.garrison.length
      return index
    }
    return pickGarrisonArcherIndex(this.garrisonPositions(), aimPoint)
  }

  private playGarrisonIdle(): void {
    for (const archer of this.garrison) this.playArcherIdle(archer)
  }

  private playArcherIdle(archer: Phaser.GameObjects.Sprite): void {
    const idleKey = garrisonIdleAnimKey(this.owner)
    if (!this.scene.anims.exists(idleKey)) return
    archer.anims.timeScale = 1
    archer.anims.play(idleKey, true)
  }

  private layoutGarrison(): void {
    const slots = garrisonSlots(this.isKing)
    for (let i = 0; i < this.garrison.length; i++) {
      const archer = this.garrison[i]
      const slot = slots[i]
      if (!slot) continue

      archer.setDisplaySize(this.archerSize.width, this.archerSize.height)
      const deck = this.garrisonDeckPosition(slot)
      archer.setPosition(deck.x, deck.y)
    }

    if (this.lastArrowOrigin && this.garrison.length > 0) {
      const positions = this.garrisonPositions()
      const idx = pickGarrisonArcherIndex(positions, this.lastArrowOrigin)
      const pos = positions[idx]
      if (pos) this.lastArrowOrigin = { x: pos.x, y: pos.y }
    }
  }
}

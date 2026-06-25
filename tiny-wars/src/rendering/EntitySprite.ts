import Phaser from 'phaser'
import { HealthBar } from './HealthBar'
import { resolveTexture } from './PlaceholderFactory'
import { clipAnimKey, idleSheetKey, getSideAssets, isAnimatedCard, type AnimClip } from '@data/AssetManifest'
import { Owner, CardType } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { CELL_SIZE } from '@data/GameConstants'
import { displaySizeForCard } from './assetDisplaySize'

type DisplayObject = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image

export class EntitySprite {
  readonly sprite: DisplayObject
  private healthBar: HealthBar
  private lastX: number
  private flashTween: Phaser.Tweens.Tween | null = null
  private currentAnim: AnimClip = 'idle'
  private readonly cardId: string
  private readonly owner: Owner
  private readonly animated: boolean
  private readonly isBuilding: boolean

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
      this.sprite = spr
      this.playAnim('idle', 1)
    } else {
      const img = scene.add.image(x, y, key, 0).setDepth(5)
      img.setDisplaySize(size.width, size.height)
      this.sprite = img
    }

    this.healthBar = this.isBuilding
      ? HealthBar.forBuilding(scene, x, y, size.height)
      : HealthBar.forTroop(scene, x, y, size.height)
    this.lastX = x
  }

  update(x: number, y: number, hpFraction: number, anim: AnimClip = 'idle', moveSpeed = 1.5, showHealthBar = false): void {
    if (this.animated) {
      const dx = x - this.lastX
      if (dx < -0.3) this.sprite.setFlipX(true)
      else if (dx > 0.3) this.sprite.setFlipX(false)
      this.playAnim(anim, moveSpeed)
    }

    this.lastX = x
    this.sprite.setPosition(x, y)
    this.healthBar.update(x, y, hpFraction, showHealthBar)
  }

  private playAnim(anim: AnimClip, moveSpeed: number): void {
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
        this.sprite.clearTint()
        this.flashTween = null
      },
    })
  }

  destroy(): void {
    this.sprite.destroy()
    this.healthBar.destroy()
    this.flashTween?.stop()
  }
}

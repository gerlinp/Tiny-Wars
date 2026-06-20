import Phaser from 'phaser'
import { HealthBar } from './HealthBar'
import { resolveTexture } from './PlaceholderFactory'
import { Owner } from '@core/types'
import { CELL_SIZE } from '@data/GameConstants'

export class EntitySprite {
  readonly sprite: Phaser.GameObjects.Image
  private healthBar: HealthBar
  private lastX: number
  private flashTween: Phaser.Tweens.Tween | null = null

  constructor(
    private scene: Phaser.Scene,
    x: number, y: number,
    textureKey: string,
    owner: Owner,
  ) {
    const fallback = owner === Owner.PLAYER ? 'placeholder_player' : 'placeholder_bot'
    const key = resolveTexture(scene, textureKey, fallback)
    this.sprite = scene.add.image(x, y, key).setDepth(5)
    this.sprite.setDisplaySize(CELL_SIZE * 1.8, CELL_SIZE * 1.8)
    this.healthBar = new HealthBar(scene, x, y)
    this.lastX = x
  }

  update(x: number, y: number, hpFraction: number): void {
    // Flip sprite to face movement direction
    if (x < this.lastX - 0.5) this.sprite.setFlipX(true)
    else if (x > this.lastX + 0.5) this.sprite.setFlipX(false)
    this.lastX = x

    this.sprite.setPosition(x, y)
    this.healthBar.update(x, y, hpFraction)
  }

  flashDamage(): void {
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

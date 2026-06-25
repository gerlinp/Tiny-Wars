import Phaser from 'phaser'
import type { Tower } from '@core/entities/Tower'
import { Owner } from '@core/types'
import { towerTextureKey } from './AssetRegistry'
import { applyTowerDisplaySize, displaySizeForTower } from './assetDisplaySize'
import { HealthBar } from './HealthBar'

export class TowerSprite {
  readonly image: Phaser.GameObjects.Image
  private healthBar: HealthBar
  private flashTween: Phaser.Tweens.Tween | null = null
  private readonly isKing: boolean

  constructor(
    private scene: Phaser.Scene,
    tower: Tower,
  ) {
    this.isKing = tower.isKing
    const key = towerTextureKey(tower.isKing, tower.owner)
    const size = displaySizeForTower(scene, tower.isKing, key)

    this.image = scene.add.image(tower.position.x, tower.position.y, key).setDepth(4)
    applyTowerDisplaySize(this.image, scene, tower.isKing, key)
    this.healthBar = HealthBar.forTower(scene, tower.position.x, tower.position.y, size.height, tower.isKing)
  }

  update(x: number, y: number, hpFraction: number, showHealthBar: boolean): void {
    this.image.setPosition(x, y)
    this.healthBar.update(x, y, hpFraction, showHealthBar)
  }

  setDestroyed(owner: Owner): void {
    const key = towerTextureKey(this.isKing, owner, true)
    this.image.setTexture(key)
    applyTowerDisplaySize(this.image, this.scene, this.isKing, key)
    this.image.setTint(0x666666)
    this.healthBar.setVisible(false)
  }

  flashDamage(): void {
    this.healthBar.setVisible(true)
    if (this.flashTween) return
    this.image.setTint(0xff4444)
    this.flashTween = this.scene.tweens.add({
      targets: this.image,
      duration: 120,
      onComplete: () => {
        this.image.clearTint()
        this.flashTween = null
      },
    })
  }

  destroy(): void {
    this.image.destroy()
    this.healthBar.destroy()
    this.flashTween?.stop()
  }
}

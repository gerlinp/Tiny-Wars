import Phaser from 'phaser'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { arrowFlightMs } from '@data/ProjectileConstants'
import { applyArrowSprite, arrowTextureKey } from './arrowTexture'

const POOL_SIZE = 24

export class ArrowPool {
  private pool: Phaser.GameObjects.Image[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const img = scene.add.image(0, 0, arrowTextureKey(Owner.PLAYER))
        .setDepth(22)
        .setAlpha(0)
      applyArrowSprite(img)
      this.pool.push(img)
    }
  }

  spawn(from: Vec2, to: Vec2, owner: Owner, attackRate: number, onHit?: () => void): void {
    const img = this.pool.find(a => !a.getData('flying'))
    if (!img) {
      onHit?.()
      return
    }

    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1) {
      onHit?.()
      return
    }

    const angle = Math.atan2(dy, dx)
    const duration = arrowFlightMs(dist, attackRate)

    img.setData('flying', true)
    img.setTexture(arrowTextureKey(owner))
    applyArrowSprite(img)
    img.setPosition(from.x, from.y)
    img.setRotation(angle)
    img.clearTint()
    img.setAlpha(1)
    img.setScale(1)

    this.scene.tweens.add({
      targets: img,
      x: to.x,
      y: to.y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        img.setAlpha(0)
        img.setData('flying', false)
        onHit?.()
      },
    })
  }
}

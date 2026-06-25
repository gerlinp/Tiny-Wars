import Phaser from 'phaser'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { arrowFlightMs } from '@data/ProjectileConstants'
import { ensureArrowTexture } from './arrowTexture'

const POOL_SIZE = 24
const ARROW_LENGTH = 44
const ARROW_THICKNESS = 18

export class ArrowPool {
  private pool: Phaser.GameObjects.Image[] = []

  constructor(private scene: Phaser.Scene) {
    ensureArrowTexture(scene)
    for (let i = 0; i < POOL_SIZE; i++) {
      const img = scene.add.image(0, 0, 'arrow_proj')
        .setDepth(22)
        .setAlpha(0)
        .setOrigin(0.35, 0.5)
        .setDisplaySize(ARROW_LENGTH, ARROW_THICKNESS)
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
    const tint = owner === Owner.PLAYER ? 0xbbddff : 0xffbbbb

    img.setData('flying', true)
    img.setPosition(from.x, from.y)
    img.setRotation(angle)
    img.setTint(tint)
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
        img.clearTint()
        img.setData('flying', false)
        onHit?.()
      },
    })
  }
}

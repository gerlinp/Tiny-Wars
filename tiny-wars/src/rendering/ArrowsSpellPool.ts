import Phaser from 'phaser'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { applyArrowSprite, arrowTextureKey } from './arrowTexture'

const POOL_SIZE = 20
const ARROW_COUNT = 14
const STAGGER_MS = 32

export class ArrowsSpellPool {
  private pool: Phaser.GameObjects.Image[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const img = this.scene.add.image(0, 0, arrowTextureKey(Owner.PLAYER))
        .setDepth(22)
        .setAlpha(0)
      applyArrowSprite(img)
      img.setData('flying', false)
      this.pool.push(img)
    }
  }

  spawn(target: Vec2, owner: Owner, radiusPx: number, flightMs: number): void {
    const approach = radiusPx * 2.6
    const spread = radiusPx * 1.7

    for (let i = 0; i < ARROW_COUNT; i++) {
      this.scene.time.delayedCall(i * STAGGER_MS, () => {
        const img = this.pool.find(a => !a.getData('flying'))
        if (!img) return

        const landingX = target.x + (Math.random() - 0.5) * spread
        const landingY = target.y + (Math.random() - 0.5) * spread

        const fromCasterSide = owner === Owner.PLAYER ? -1 : 1
        const fromX = landingX + fromCasterSide * approach * (0.75 + Math.random() * 0.35)
        const fromY = landingY + (owner === Owner.PLAYER ? -1 : 1) * approach * (0.75 + Math.random() * 0.35)

        const dx = landingX - fromX
        const dy = landingY - fromY
        const angle = Math.atan2(dy, dx)
        const duration = Math.round(flightMs * (0.75 + Math.random() * 0.35))

        img.setData('flying', true)
        img.setTexture(arrowTextureKey(owner))
        applyArrowSprite(img)
        img.setPosition(fromX, fromY)
        img.setRotation(angle)
        img.clearTint()
        img.setAlpha(0.95)
        img.setScale(1)

        this.scene.tweens.add({
          targets: img,
          x: landingX,
          y: landingY,
          duration,
          ease: 'Linear',
          onComplete: () => {
            img.setAlpha(0)
            img.setData('flying', false)
          },
        })
      })
    }
  }
}

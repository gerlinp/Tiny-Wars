import Phaser from 'phaser'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { arrowFlightMs } from '@data/ProjectileConstants'

const POOL_SIZE = 16
const PROJECTILE_KEY = 'hex_shaman_projectile'
const EXPLOSION_SHEET = 'hex_shaman_explosion'
const EXPLOSION_ANIM = 'hex_shaman_explosion_anim'
const PROJECTILE_DISPLAY = 28
const EXPLOSION_DISPLAY = 72

export class HexFireballPool {
  private projectiles: Phaser.GameObjects.Sprite[] = []
  private explosions: Phaser.GameObjects.Sprite[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.projectiles.push(this.createProjectile())
      this.explosions.push(this.createExplosion())
    }
  }

  private createProjectile(): Phaser.GameObjects.Sprite {
    const spr = this.scene.add.sprite(0, 0, PROJECTILE_KEY, 0)
      .setDepth(22)
      .setOrigin(0.5, 0.5)
      .setVisible(false)
    spr.setData('flying', false)
    return spr
  }

  private createExplosion(): Phaser.GameObjects.Sprite {
    const spr = this.scene.add.sprite(0, 0, EXPLOSION_SHEET, 0)
      .setDepth(23)
      .setOrigin(0.5, 0.5)
      .setVisible(false)
    spr.setData('playing', false)
    return spr
  }

  spawn(from: Vec2, to: Vec2, _owner: Owner, attackRate: number, onHit?: () => void): void {
    const bolt = this.projectiles.find(p => !p.getData('flying'))
    if (!bolt) {
      onHit?.()
      return
    }

    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1) {
      this.playExplosion(to.x, to.y)
      onHit?.()
      return
    }

    const angle = Math.atan2(dy, dx)
    const duration = arrowFlightMs(dist, attackRate)

    bolt.setData('flying', true)
    bolt.setTexture(PROJECTILE_KEY, 0)
    bolt.setDisplaySize(PROJECTILE_DISPLAY, PROJECTILE_DISPLAY)
    bolt.setPosition(from.x, from.y)
    bolt.setRotation(angle)
    bolt.setVisible(true)
    bolt.setAlpha(1)
    bolt.anims.stop()

    this.scene.tweens.add({
      targets: bolt,
      x: to.x,
      y: to.y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        bolt.setVisible(false)
        bolt.setData('flying', false)
        this.playExplosion(to.x, to.y)
        onHit?.()
      },
    })
  }

  private playExplosion(x: number, y: number): void {
    const burst = this.explosions.find(e => !e.getData('playing'))
    if (!burst || !this.scene.anims.exists(EXPLOSION_ANIM)) return

    burst.setData('playing', true)
    burst.setPosition(x, y)
    burst.setDisplaySize(EXPLOSION_DISPLAY, EXPLOSION_DISPLAY)
    burst.setVisible(true)
    burst.setAlpha(1)
    burst.play(EXPLOSION_ANIM)

    burst.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      burst.setVisible(false)
      burst.setData('playing', false)
      burst.anims.stop()
    })
  }
}

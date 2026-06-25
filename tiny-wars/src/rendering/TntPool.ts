import Phaser from 'phaser'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { getSideAssets } from '@data/AssetManifest'
import { applyCardDisplaySize } from './assetDisplaySize'
import { resolveTexture } from './PlaceholderFactory'

const POOL_SIZE = 6
const PROJECTILE_SCALE = 0.5

export class TntPool {
  private pool: Phaser.GameObjects.Sprite[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(this.createProjectile())
    }
  }

  private createProjectile(): Phaser.GameObjects.Sprite {
    const key = resolveTexture(
      this.scene,
      getSideAssets('tnt', Owner.PLAYER)!.idle.sheet.key,
      'placeholder_player',
    )
    const spr = this.scene.add.sprite(0, 0, key, 0)
      .setDepth(21)
      .setOrigin(0.5, 0.5)
      .setVisible(false)
    spr.setData('flying', false)
    return spr
  }

  private layoutSprite(sprite: Phaser.GameObjects.Sprite, owner: Owner): void {
    const side = getSideAssets('tnt', owner)!
    const key = resolveTexture(this.scene, side.idle.sheet.key, 'placeholder_player')
    sprite.setTexture(key, 0)
    applyCardDisplaySize(sprite, this.scene, 'tnt', key, 0)
    sprite.setScale(sprite.scaleX * PROJECTILE_SCALE, sprite.scaleY * PROJECTILE_SCALE)
  }

  spawn(from: Vec2, to: Vec2, owner: Owner, flightMs: number): void {
    const rocket = this.pool.find(b => !b.getData('flying'))
    if (!rocket) return

    this.layoutSprite(rocket, owner)
    rocket.setData('flying', true)
    rocket.setVisible(true)
    rocket.setAlpha(1)
    rocket.setPosition(from.x, from.y)
    rocket.anims.stop()

    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    rocket.setRotation(angle)

    this.scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: flightMs,
      ease: 'Linear',
      onUpdate: (_tween, target) => {
        const t = (target as { t: number }).t
        rocket.setPosition(
          from.x + (to.x - from.x) * t,
          from.y + (to.y - from.y) * t,
        )
      },
      onComplete: () => this.finish(rocket),
    })
  }

  private finish(rocket: Phaser.GameObjects.Sprite): void {
    rocket.setAlpha(0)
    rocket.setVisible(false)
    rocket.setRotation(0)
    rocket.setData('flying', false)
    rocket.removeAllListeners()
    this.scene.tweens.killTweensOf(rocket)
  }
}

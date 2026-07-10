import Phaser from 'phaser'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { clipAnimKey } from '@data/AssetManifest'
import { CELL_SIZE } from '@data/GameConstants'
import { applyBombArcDisplaySize, BOMB_PROJECTILE_DISPLAY_SCALE, BOMB_SPIN_TIME_SCALE } from './bombProjectileVisual'

const POOL_SIZE = 8
const PROJECTILE_DISPLAY = CELL_SIZE * BOMB_PROJECTILE_DISPLAY_SCALE
const BOMB_SPIN_SHEET = 'bomb_spinning'

export class TntPool {
  private pool: Phaser.GameObjects.Sprite[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(this.createProjectile())
    }
  }

  private createProjectile(): Phaser.GameObjects.Sprite {
    const key = this.scene.textures.exists(BOMB_SPIN_SHEET) ? BOMB_SPIN_SHEET : 'placeholder_player'
    const spr = this.scene.add.sprite(0, 0, key, 0)
      .setDepth(21)
      .setOrigin(0.5, 0.5)
      .setVisible(false)
    spr.setData('flying', false)
    return spr
  }

  spawn(from: Vec2, to: Vec2, owner: Owner, flightMs: number): void {
    const bomb = this.pool.find(b => !b.getData('flying'))
    if (!bomb) return

    const spinKey = clipAnimKey('big_bomb', owner, 'run')

    bomb.setData('flying', true)
    bomb.setTexture(BOMB_SPIN_SHEET, 0)
    bomb.setDisplaySize(PROJECTILE_DISPLAY, PROJECTILE_DISPLAY)
    bomb.setPosition(from.x, from.y)
    bomb.setRotation(0)
    bomb.setVisible(true)
    bomb.setAlpha(1)

    if (this.scene.anims.exists(spinKey)) {
      bomb.anims.timeScale = BOMB_SPIN_TIME_SCALE
      bomb.anims.play(spinKey)
    } else {
      bomb.anims.stop()
    }

    this.scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: flightMs,
      ease: 'Linear',
      onUpdate: (_tween, target) => {
        const t = (target as { t: number }).t
        bomb.setPosition(
          from.x + (to.x - from.x) * t,
          from.y + (to.y - from.y) * t,
        )
        applyBombArcDisplaySize(bomb, PROJECTILE_DISPLAY, t)
      },
      onComplete: () => this.finish(bomb),
    })
  }

  private finish(bomb: Phaser.GameObjects.Sprite): void {
    bomb.setVisible(false)
    bomb.setData('flying', false)
    bomb.anims.stop()
    bomb.anims.timeScale = 1
    bomb.removeAllListeners()
    bomb.setDisplaySize(PROJECTILE_DISPLAY, PROJECTILE_DISPLAY)
    this.scene.tweens.killTweensOf(bomb)
  }
}

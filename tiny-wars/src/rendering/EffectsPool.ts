import Phaser from 'phaser'
import { CELL_SIZE } from '@data/GameConstants'

const POOL_SIZE = 8

export class EffectsPool {
  private pool: Phaser.GameObjects.Image[] = []

  constructor(private scene: Phaser.Scene) {
    const key = scene.textures.exists('explosion_1') ? 'explosion_1' : 'placeholder_player'
    for (let i = 0; i < POOL_SIZE; i++) {
      const img = scene.add.image(0, 0, key)
        .setDepth(20)
        .setAlpha(0)
        .setDisplaySize(CELL_SIZE * 2.4, CELL_SIZE * 2.4)
      this.pool.push(img)
    }
  }

  spawn(x: number, y: number, radiusPx = CELL_SIZE * 2.4): void {
    const img = this.pool.find(p => p.alpha === 0)
    if (!img) return

    const size = Math.max(CELL_SIZE * 2.4, radiusPx * 1.6)
    img.setDisplaySize(size, size)
    img.setPosition(x, y).setAlpha(1).setScale(0.5)
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 400,
      ease: 'Power2',
      onComplete: () => img.setAlpha(0).setScale(0.5),
    })
  }
}

import Phaser from 'phaser'
import { Owner } from '@core/types'
import { MONK_HEAL_EFFECT_SHEETS } from '@data/AssetManifest'
import { CELL_SIZE } from '@data/GameConstants'

const POOL_SIZE = 8
const EFFECT_DISPLAY = CELL_SIZE * 3.2

export class HealEffectPool {
  private pool: Phaser.GameObjects.Sprite[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const spr = scene.add.sprite(0, 0, MONK_HEAL_EFFECT_SHEETS.blue.key, 0)
        .setDepth(21)
        .setOrigin(0.5, 0.5)
        .setVisible(false)
      spr.setData('playing', false)
      this.pool.push(spr)
    }
  }

  spawn(x: number, y: number, owner: Owner, radiusCells: number): void {
    const sheet = owner === Owner.PLAYER ? MONK_HEAL_EFFECT_SHEETS.blue : MONK_HEAL_EFFECT_SHEETS.red
    const burst = this.pool.find(p => !p.getData('playing'))
    if (!burst || !this.scene.anims.exists(sheet.animKey)) return

    const size = Math.max(EFFECT_DISPLAY, radiusCells * CELL_SIZE * 1.6)
    burst.setData('playing', true)
    burst.setTexture(sheet.key, 0)
    burst.setPosition(x, y)
    burst.setDisplaySize(size, size)
    burst.setVisible(true)
    burst.setAlpha(0.85)
    burst.play(sheet.animKey)

    burst.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      burst.setVisible(false)
      burst.setData('playing', false)
      burst.anims.stop()
    })
  }
}

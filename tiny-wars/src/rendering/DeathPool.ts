import Phaser from 'phaser'
import { TROOP_DEATH_SHEET } from '@data/AssetManifest'
import { MAP_UNIT_TARGET_HEIGHT } from '@data/GameConstants'

const DEATH_DISPLAY_SIZE = MAP_UNIT_TARGET_HEIGHT * 1.1

export class DeathPool {
  constructor(private scene: Phaser.Scene) {}

  spawn(x: number, y: number, flipX = false): void {
    if (!this.scene.anims.exists(TROOP_DEATH_SHEET.animKey)) return

    const sprite = this.scene.add.sprite(x, y, TROOP_DEATH_SHEET.key, 0)
      .setDepth(5.5)
      .setDisplaySize(DEATH_DISPLAY_SIZE, DEATH_DISPLAY_SIZE)
      .setFlipX(flipX)

    sprite.play(TROOP_DEATH_SHEET.animKey)
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())
  }
}

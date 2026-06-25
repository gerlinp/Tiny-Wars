import Phaser from 'phaser'
import { Owner } from '@core/types'
import { clipAnimKey } from '@data/AssetManifest'
import { CELL_SIZE } from '@data/GameConstants'
import type { AttackSync } from './EntitySprite'

const CREW_DEPTH = 5.6
const CREW_HEIGHT = CELL_SIZE * 1.35
/** Seat the bomb fish near the top of the wood platform. */
const CREW_Y_FRAC = 0.82

export class BombTowerCrew {
  private readonly sprite: Phaser.GameObjects.Sprite
  private attacking = false

  constructor(
    private readonly scene: Phaser.Scene,
    owner: Owner,
  ) {
    this.sprite = scene.add.sprite(0, 0, 'bomb_idle', 0)
      .setDepth(CREW_DEPTH)
      .setDisplaySize(CREW_HEIGHT, CREW_HEIGHT)

    this.playIdle(owner)
  }

  layout(centerX: number, baseY: number, buildingHeight: number): void {
    this.sprite.setPosition(centerX, baseY - buildingHeight * CREW_Y_FRAC)
  }

  syncAttack(owner: Owner, attackSync?: AttackSync): void {
    if (!attackSync || attackSync.windupMs <= 0 || this.attacking) return
    if (attackSync.cooldownMs > 0 && attackSync.cooldownMs <= attackSync.windupMs) {
      this.beginAttack(owner)
    }
  }

  destroy(): void {
    this.sprite.destroy()
  }

  private beginAttack(owner: Owner): void {
    const attackKey = clipAnimKey('tnt', owner, 'attack')
    if (!this.scene.anims.exists(attackKey)) return

    this.attacking = true
    this.sprite.anims.play({ key: attackKey, repeat: 0 }, true)
    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.attacking = false
      this.playIdle(owner)
    })
  }

  private playIdle(owner: Owner): void {
    const idleKey = clipAnimKey('tnt', owner, 'idle')
    if (!this.scene.anims.exists(idleKey)) return
    this.sprite.anims.play(idleKey, true)
  }
}

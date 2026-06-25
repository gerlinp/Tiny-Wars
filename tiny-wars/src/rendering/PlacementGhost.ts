import Phaser from 'phaser'
import { Grid } from '@core/Grid'
import type { CardDefinition } from '@core/types'
import { GAME_HEIGHT } from '@data/GameConstants'
import { resolveTexture } from './PlaceholderFactory'
import { applyCardDisplaySize } from './assetDisplaySize'

const VALID_TINT   = 0x88ff88
const INVALID_TINT = 0xff6666

export class PlacementGhost {
  private sprite: Phaser.GameObjects.Image
  private grid: Grid

  constructor(private scene: Phaser.Scene) {
    this.grid = new Grid()
    this.sprite = scene.add.image(0, 0, 'placeholder_player')
      .setAlpha(0.55)
      .setDepth(6)
      .setVisible(false)
  }

  setCard(card: CardDefinition): void {
    const key = resolveTexture(this.scene, card.textureKeyPlayer, 'placeholder_player')
    this.sprite.setTexture(key, 0)
    applyCardDisplaySize(this.sprite, this.scene, card.id, key, 0)
  }

  show(): void {
    this.sprite.setVisible(true)
  }

  hide(): void {
    this.sprite.setVisible(false)
  }

  update(pointerX: number, pointerY: number, valid: boolean): void {
    if (pointerY >= GAME_HEIGHT) {
      this.sprite.setVisible(false)
      return
    }

    this.sprite.setVisible(true)
    const cell = this.grid.worldToCell(pointerX, pointerY)
    const world = this.grid.cellToWorld(cell.x, cell.y)
    this.sprite.setPosition(world.x, world.y)
    this.sprite.setTint(valid ? VALID_TINT : INVALID_TINT)
  }
}

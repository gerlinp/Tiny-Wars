import Phaser from 'phaser'
import { Grid } from '@core/Grid'
import type { CardDefinition } from '@core/types'
import { CardType, Owner } from '@core/types'
import { GAME_HEIGHT, CELL_SIZE } from '@data/GameConstants'
import { getSideAssets } from '@data/AssetManifest'
import { playCardAnim } from './AnimationRegistry'
import { resolveTexture } from './renderingUtils'
import { applyCardDisplaySize } from './assetDisplaySize'

const VALID_TINT   = 0x88ff88
const INVALID_TINT = 0xff6666

export class PlacementGhost {
  private sprite: Phaser.GameObjects.Sprite
  private ring: Phaser.GameObjects.Arc
  private grid: Grid
  private isSpell = false
  private spellCardId: string | null = null

  constructor(private scene: Phaser.Scene) {
    this.grid = new Grid()
    this.sprite = scene.add.sprite(0, 0, 'placeholder_player', 0)
      .setAlpha(0.55)
      .setDepth(6)
      .setVisible(false)

    this.ring = scene.add.circle(0, 0, 40, 0xff6622, 0.12)
      .setStrokeStyle(2, 0xff8844, 0.55)
      .setDepth(6)
      .setVisible(false)
  }

  setCard(card: CardDefinition): void {
    this.isSpell = card.cardType === CardType.SPELL
    this.spellCardId = this.isSpell ? card.id : null

    if (this.isSpell) {
      const stats = card.spellStats!
      this.ring.setRadius(stats.radius * CELL_SIZE)

      if (card.id === 'tnt') {
        const side = getSideAssets('tnt', Owner.PLAYER)!
        const key = resolveTexture(this.scene, side.idle.sheet.key, 'placeholder_player')
        this.sprite.setTexture(key, 0)
        applyCardDisplaySize(this.sprite, this.scene, 'tnt', key, 0)
        this.sprite.setScale(this.sprite.scaleX * 0.5, this.sprite.scaleY * 0.5)
        this.sprite.setAlpha(0.75)
        playCardAnim(this.sprite, this.scene, 'tnt', Owner.PLAYER, 'idle', -1)
      } else {
        this.sprite.setVisible(false)
        this.sprite.anims.stop()
      }
      return
    }

    this.sprite.anims.stop()
    const key = resolveTexture(this.scene, card.textureKeyPlayer, 'placeholder_player')
    this.sprite.setTexture(key, 0)
    applyCardDisplaySize(this.sprite, this.scene, card.id, key, 0)
    this.ring.setVisible(false)
  }

  show(): void {
    if (this.isSpell) {
      this.ring.setVisible(true)
      if (this.spellCardId === 'tnt') this.sprite.setVisible(true)
      return
    }
    this.sprite.setVisible(true)
  }

  hide(): void {
    this.sprite.setVisible(false)
    this.sprite.anims.stop()
    this.ring.setVisible(false)
  }

  update(pointerX: number, pointerY: number, valid: boolean): void {
    if (pointerY >= GAME_HEIGHT) {
      this.hide()
      return
    }

    const cell = this.grid.worldToCell(pointerX, pointerY)
    const world = this.grid.cellToWorld(cell.x, cell.y)

    if (this.isSpell) {
      this.ring.setVisible(true)
      this.ring.setPosition(world.x, world.y)
      this.ring.setFillStyle(valid ? 0xff6622 : 0xff2222, valid ? 0.14 : 0.1)
      this.ring.setStrokeStyle(2, valid ? 0xff8844 : 0xff4444, valid ? 0.6 : 0.45)

      if (this.spellCardId === 'tnt') {
        this.sprite.setVisible(true)
        this.sprite.setPosition(world.x, world.y - 8)
        this.sprite.setTint(valid ? 0xffffff : 0xffaaaa)
      } else if (this.spellCardId === 'arrows') {
        this.sprite.setVisible(false)
      }
      return
    }

    this.sprite.setVisible(true)
    this.sprite.setPosition(world.x, world.y)
    this.sprite.setTint(valid ? VALID_TINT : INVALID_TINT)
  }
}

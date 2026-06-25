import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { cardAvatarKey, getCardAvatarBackdrop, getCardAvatarBuildingFit, getCardAvatarHandScale } from '@data/AssetManifest'
import { applyCardAvatarTexture } from '@rendering/cardAvatarTexture'
import { applyArrowSprite, ARROW_DISPLAY_W } from '@rendering/arrowTexture'
import {
  CARD_SLOT_W, CARD_SLOT_H, CARD_SELECTED_LIFT,
  applyIconDisplaySize, applyBackdropDisplaySize, applyLayeredPortraitDisplaySize,
  applyBuildingAvatarDisplaySize,
  cardIconDisplaySize,
} from './cardHandLayout'

const COST_FONT = Math.max(11, Math.round(CARD_SLOT_W * 0.13))

export class CardSlot {
  private hitArea: Phaser.GameObjects.Rectangle
  private iconBackdrop: Phaser.GameObjects.Image
  private icon: Phaser.GameObjects.Image
  private costText: Phaser.GameObjects.Text
  private readonly cx: number
  private readonly cy: number
  private _selected = false
  private canPlay = true
  private shownCardId: string | null = null
  onTap: (() => void) | null = null

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.cx = x
    this.cy = y

    this.hitArea = scene.add.rectangle(x, y, CARD_SLOT_W, CARD_SLOT_H, 0x000000, 0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true })

    this.hitArea.on('pointerdown', () => {
      if (this.canPlay) this.onTap?.()
    })

    this.iconBackdrop = scene.add.image(x, y, cardAvatarKey('warrior'))
      .setDepth(51)
      .setVisible(false)

    this.icon = scene.add.image(x, y, cardAvatarKey('warrior'))
      .setDepth(52)
      .setVisible(false)

    this.costText = scene.add.text(x + CARD_SLOT_W / 2 - 3, y - CARD_SLOT_H / 2 + 2, '', {
      fontSize: `${COST_FONT}px`, color: '#f0d8ff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(53)

    this.layoutIcon(false)
  }

  private layoutIcon(selected: boolean): void {
    const { w, h } = cardIconDisplaySize()
    const y = selected ? this.cy - CARD_SELECTED_LIFT : this.cy
    const hasBackdrop = this.iconBackdrop.visible

    this.iconBackdrop.setPosition(this.cx, y)
    if (hasBackdrop) applyBackdropDisplaySize(this.iconBackdrop, w, h)

    this.icon.setPosition(this.cx, y)
    if (this.shownCardId === 'arrows') {
      applyArrowSprite(this.icon)
      const scale = (w / ARROW_DISPLAY_W) * 1.35
      this.icon.setScale(scale)
      this.icon.setRotation(-2.35)
    } else if (this.shownCardId && getCardAvatarBuildingFit(this.shownCardId)) {
      applyBuildingAvatarDisplaySize(this.icon, w, h)
    } else if (hasBackdrop) applyLayeredPortraitDisplaySize(this.icon, w, h)
    else applyIconDisplaySize(this.icon, w, h)

    if (this.shownCardId && this.shownCardId !== 'arrows') {
      const handScale = getCardAvatarHandScale(this.shownCardId)
      if (handScale !== 1) {
        this.icon.setScale(this.icon.scaleX * handScale, this.icon.scaleY * handScale)
      }
    }
  }

  setCard(scene: Phaser.Scene, card: CardDefinition, playerElixir: number): void {
    if (this.shownCardId !== card.id) {
      applyCardAvatarTexture(this.icon, scene, card.id)
      this.shownCardId = card.id

      const backdrop = getCardAvatarBackdrop(card.id)
      if (backdrop) {
        if (!scene.textures.exists(backdrop.key)) {
          throw new Error(`Card avatar backdrop "${backdrop.key}" for "${card.id}" is not loaded.`)
        }
        this.iconBackdrop.setTexture(backdrop.key)
        this.iconBackdrop.setVisible(true)
      } else {
        this.iconBackdrop.setVisible(false)
      }
    }
    this.icon.setVisible(true)
    this.layoutIcon(this._selected)
    this.costText.setText(`${card.elixirCost}`)

    const canPlay = card.elixirCost <= playerElixir
    this.canPlay = canPlay
    const alpha = canPlay ? 1 : 0.4
    this.icon.setAlpha(alpha)
    this.iconBackdrop.setAlpha(alpha)
    this.costText.setColor(canPlay ? '#f0d8ff' : '#886688')

    if (canPlay) {
      this.hitArea.setInteractive({ useHandCursor: true })
    } else {
      this.hitArea.disableInteractive()
    }
  }

  setEmpty(): void {
    this.canPlay = false
    this.shownCardId = null
    this.hitArea.disableInteractive()
    this.iconBackdrop.setVisible(false)
    this.icon.setVisible(false)
    this.costText.setText('')
  }

  setSelected(selected: boolean): void {
    this._selected = selected
    if (this.icon.visible) this.layoutIcon(selected)
  }
}

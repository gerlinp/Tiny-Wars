import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { cardAvatarKey, getCardAvatarBackdrop } from '@data/AssetManifest'
import { applyCardAvatarTexture } from '@rendering/cardAvatarTexture'
import { applyArrowSprite, ARROW_DISPLAY_W } from '@rendering/arrowTexture'
import {
  CARD_SLOT_W, CARD_SLOT_H, CARD_SELECTED_LIFT, NUMBER_FONT,
  applyBackdropDisplaySize, applyCardAvatarIconSize,
  cardIconDisplaySize,
} from './cardHandLayout'

const COST_FONT = Math.max(11, Math.round(CARD_SLOT_W * 0.13))

export class CardSlot {
  private bg: Phaser.GameObjects.Rectangle
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

    this.bg = scene.add.rectangle(x, y, CARD_SLOT_W, CARD_SLOT_H, 0x0d1b3e, 0.9)
      .setDepth(49)
      .setStrokeStyle(1.5, 0x2e4480)

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

    this.costText = scene.add.text(x - CARD_SLOT_W / 2 + 3, y + CARD_SLOT_H / 2 - 3, '', {
      fontSize: `${COST_FONT}px`,
      fontFamily: NUMBER_FONT,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1a004a',
      strokeThickness: 2,
      backgroundColor: '#5500cc',
      padding: { x: 5, y: 3 },
    }).setOrigin(0, 1).setDepth(53).setVisible(false)

    this.layoutIcon(false)
  }

  private layoutIcon(selected: boolean): void {
    const { w, h } = cardIconDisplaySize()
    const yOff = selected ? -CARD_SELECTED_LIFT : 0
    const y = this.cy + yOff
    const hasBackdrop = this.iconBackdrop.visible

    this.iconBackdrop.setPosition(this.cx, y)
    if (hasBackdrop) applyBackdropDisplaySize(this.iconBackdrop, w, h)

    this.icon.setPosition(this.cx, y)
    if (this.shownCardId === 'arrows') {
      applyArrowSprite(this.icon)
      const scale = (w / ARROW_DISPLAY_W) * 1.35
      this.icon.setScale(scale)
      this.icon.setRotation(-2.35)
    } else if (this.shownCardId) {
      applyCardAvatarIconSize(this.icon, this.shownCardId, w, h, hasBackdrop)
    }
    this.costText.setY(this.cy + CARD_SLOT_H / 2 - 3 + yOff)
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
    this.costText.setText(`${card.elixirCost}`).setVisible(true)

    const canPlay = card.elixirCost <= playerElixir
    this.canPlay = canPlay
    const alpha = canPlay ? 1 : 0.4
    this.icon.setAlpha(alpha)
    this.iconBackdrop.setAlpha(alpha)
    this.costText.setColor(canPlay ? '#ffffff' : '#cc99ff')
    this.costText.setBackgroundColor(canPlay ? '#5500cc' : '#280055')

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
    this.costText.setVisible(false).setText('')
  }

  setSelected(selected: boolean): void {
    this._selected = selected
    this.bg.setStrokeStyle(selected ? 2 : 1.5, selected ? 0x88aaf0 : 0x2e4480)
    if (this.icon.visible) this.layoutIcon(selected)
  }
}

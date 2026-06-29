import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { CARD_SLOT_W, CARD_SLOT_H, CARD_SELECTED_LIFT, NUMBER_FONT, cardIconDisplaySize } from './cardHandLayout'
import { createCardPortrait, destroyCardPortrait, setCardPortraitAlpha, type CardPortraitNode } from './cardPortrait'

const COST_FONT = Math.max(44, Math.round(CARD_SLOT_W * 0.13))

export class CardSlot {
  private bg: Phaser.GameObjects.Rectangle
  private hitArea: Phaser.GameObjects.Rectangle
  private portrait: CardPortraitNode[] = []
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
      .setStrokeStyle(6, 0x2e4480)

    this.hitArea = scene.add.rectangle(x, y, CARD_SLOT_W, CARD_SLOT_H, 0x000000, 0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true })

    this.hitArea.on('pointerdown', () => {
      if (this.canPlay) this.onTap?.()
    })

    this.costText = scene.add.text(x - CARD_SLOT_W / 2 + 12, y + CARD_SLOT_H / 2 - 12, '', {
      fontSize: `${COST_FONT}px`,
      fontFamily: NUMBER_FONT,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1a004a',
      strokeThickness: 8,
      backgroundColor: '#5500cc',
      padding: { x: 20, y: 12 },
    }).setOrigin(0, 1).setDepth(53).setVisible(false)

    this.layoutPortrait(false)
  }

  private layoutPortrait(selected: boolean): void {
    const yOff = selected ? -CARD_SELECTED_LIFT : 0
    const y = this.cy + yOff

    for (let i = 0; i < this.portrait.length; i++) {
      this.portrait[i].setPosition(this.cx, y)
      this.portrait[i].setDepth(51 + i)
    }
    this.costText.setY(this.cy + CARD_SLOT_H / 2 - 12 + yOff)
  }

  setCard(scene: Phaser.Scene, card: CardDefinition, playerElixir: number): void {
    if (this.shownCardId !== card.id) {
      destroyCardPortrait(this.portrait)
      this.portrait = createCardPortrait(scene, card, this.cx, this.cy, cardIconDisplaySize().w, cardIconDisplaySize().h)
      for (const node of this.portrait) node.setVisible(true)
      this.shownCardId = card.id
    }

    this.layoutPortrait(this._selected)
    this.costText.setText(`${card.elixirCost}`).setVisible(true)

    const canPlay = card.elixirCost <= playerElixir
    this.canPlay = canPlay
    const alpha = canPlay ? 1 : 0.4
    setCardPortraitAlpha(this.portrait, alpha)
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
    destroyCardPortrait(this.portrait)
    this.portrait = []
    this.costText.setVisible(false).setText('')
  }

  setSelected(selected: boolean): void {
    this._selected = selected
    this.bg.setStrokeStyle(selected ? 8 : 6, selected ? 0x88aaf0 : 0x2e4480)
    if (this.portrait.length > 0) this.layoutPortrait(selected)
  }
}

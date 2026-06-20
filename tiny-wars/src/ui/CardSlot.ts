import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { resolveTexture } from '@rendering/PlaceholderFactory'

const SLOT_W = 64
const SLOT_H = 72

export class CardSlot {
  private bg: Phaser.GameObjects.Rectangle
  private icon: Phaser.GameObjects.Image
  private costText: Phaser.GameObjects.Text
  private nameText: Phaser.GameObjects.Text
  private _selected = false
  onTap: (() => void) | null = null

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.bg = scene.add.rectangle(x, y, SLOT_W, SLOT_H, 0x222244, 1)
      .setDepth(50)
      .setStrokeStyle(2, 0x4455aa)
      .setInteractive({ useHandCursor: true })

    this.bg.on('pointerdown', () => this.onTap?.())
    this.bg.on('pointerover', () => { if (!this._selected) this.bg.setStrokeStyle(2, 0x8899ff) })
    this.bg.on('pointerout',  () => { if (!this._selected) this.bg.setStrokeStyle(2, 0x4455aa) })

    this.icon = scene.add.image(x, y - 10, 'placeholder_player')
      .setDisplaySize(40, 40)
      .setDepth(51)

    this.costText = scene.add.text(x + 24, y - 30, '', {
      fontSize: '12px', color: '#cc88ff', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(52)

    this.nameText = scene.add.text(x, y + 22, '', {
      fontSize: '9px', color: '#aabbdd', wordWrap: { width: SLOT_W - 4 },
    }).setOrigin(0.5, 0).setDepth(52)
  }

  setCard(scene: Phaser.Scene, card: CardDefinition, playerElixir: number): void {
    const key = resolveTexture(scene, card.textureKeyPlayer, 'placeholder_player')
    this.icon.setTexture(key).setDisplaySize(40, 40)
    this.costText.setText(`${card.elixirCost}e`)
    this.nameText.setText(card.displayName)

    const canPlay = card.elixirCost <= playerElixir
    this.bg.setFillStyle(canPlay ? 0x222244 : 0x221122)
    this.costText.setColor(canPlay ? '#cc88ff' : '#664466')
  }

  setEmpty(): void {
    this.icon.setTexture('placeholder_player').setAlpha(0.3)
    this.costText.setText('')
    this.nameText.setText('')
  }

  setSelected(selected: boolean): void {
    this._selected = selected
    this.bg.setStrokeStyle(2, selected ? 0xffdd44 : 0x4455aa)
    this.bg.setFillStyle(selected ? 0x443322 : 0x222244)
  }
}

import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { CINZEL_FONT } from './cardHandLayout'
import { createCardPortrait } from './cardPortrait'

const ICON_FILL = 0.78

/**
 * One of the 8 slots in the player's deck. Shows a card or an empty placeholder;
 * tapping a filled slot fires {@link onTap} (used to remove the card).
 */
export class DeckSlot {
  onTap: (() => void) | null = null

  private readonly bg: Phaser.GameObjects.Rectangle
  private readonly emptyText: Phaser.GameObjects.Text
  private readonly costText: Phaser.GameObjects.Text
  private portrait: Phaser.GameObjects.Image[] = []

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly w: number,
    private readonly h: number,
  ) {
    this.bg = scene.add.rectangle(x, y, w, h, 0x0d1b3e, 0.92)
      .setStrokeStyle(2, 0x2e4480)
      .setDepth(0)

    this.emptyText = scene.add.text(x, y, '+', {
      fontSize: '34px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#3a4a78',
    }).setOrigin(0.5).setDepth(2)

    this.costText = scene.add.text(x - w / 2 + 4, y + h / 2 - 4, '', {
      fontSize: '14px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1a004a',
      strokeThickness: 2,
      backgroundColor: '#5500cc',
      padding: { x: 5, y: 3 },
    }).setOrigin(0, 1).setDepth(2).setVisible(false)

    scene.add.rectangle(x, y, w, h, 0x000000, 0)
      .setDepth(3)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onTap?.())
  }

  setCard(card: CardDefinition | null): void {
    for (const img of this.portrait) img.destroy()
    this.portrait = []

    if (!card) {
      this.emptyText.setVisible(true)
      this.costText.setVisible(false)
      this.bg.setStrokeStyle(2, 0x2e4480)
      return
    }

    this.emptyText.setVisible(false)
    this.portrait = createCardPortrait(this.scene, card, this.x, this.y, this.w * ICON_FILL, this.h * ICON_FILL)
    for (const img of this.portrait) img.setDepth(1)
    this.costText.setText(`${card.elixirCost}`).setVisible(true)
    this.bg.setStrokeStyle(3, 0xffdd88)
  }
}

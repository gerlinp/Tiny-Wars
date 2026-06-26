import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { CINZEL_FONT } from './cardHandLayout'
import { createCardPortrait } from './cardPortrait'

/** Portrait fills most of the cell, leaving room for the cost badge and border. */
const ICON_FILL = 0.74

/**
 * A card in the deck builder collection. Renders the portrait, name, and elixir
 * cost; taps fire {@link onToggle}. {@link setInDeck} greys it out while the card
 * is already part of the deck above.
 */
export class DeckCard {
  onToggle: (() => void) | null = null

  private readonly bg: Phaser.GameObjects.Rectangle
  private readonly dim: Phaser.GameObjects.Rectangle

  constructor(
    scene: Phaser.Scene,
    public readonly card: CardDefinition,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    this.bg = scene.add.rectangle(x, y, w, h, 0x0d1b3e, 0.92)
      .setStrokeStyle(2, 0x2e4480)
      .setDepth(0)

    for (const img of createCardPortrait(scene, card, x, y, w * ICON_FILL, h * ICON_FILL)) {
      img.setDepth(1)
    }

    scene.add.text(x, y - h / 2 + 11, card.displayName, {
      fontSize: '11px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#cfe0ff',
      stroke: '#000022',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2)

    scene.add.text(x - w / 2 + 4, y + h / 2 - 4, `${card.elixirCost}`, {
      fontSize: '14px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1a004a',
      strokeThickness: 2,
      backgroundColor: '#5500cc',
      padding: { x: 5, y: 3 },
    }).setOrigin(0, 1).setDepth(2)

    this.dim = scene.add.rectangle(x, y, w, h, 0x05070f, 0.62)
      .setDepth(3)
      .setVisible(false)

    scene.add.rectangle(x, y, w, h, 0x000000, 0)
      .setDepth(4)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onToggle?.())
  }

  /** Grey out + mark the card while it is already in the deck. */
  setInDeck(inDeck: boolean): void {
    this.dim.setVisible(inDeck)
    this.bg.setStrokeStyle(inDeck ? 3 : 2, inDeck ? 0xffdd88 : 0x2e4480)
  }
}

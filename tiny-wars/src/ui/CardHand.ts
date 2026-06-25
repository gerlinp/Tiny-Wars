import Phaser from 'phaser'
import { CardSlot } from './CardSlot'
import type { HandState } from '@core/CardSystem'

const SLOT_SPACING = 70

export class CardHand {
  private slots: CardSlot[] = []
  private nextLabel: Phaser.GameObjects.Text
  private nextIcon: Phaser.GameObjects.Image
  onCardSelected: ((index: number) => void) | null = null

  constructor(scene: Phaser.Scene, cx: number, y: number) {
    // 4 main slots
    for (let i = 0; i < 4; i++) {
      const x = cx - (SLOT_SPACING * 1.5) + i * SLOT_SPACING
      const slot = new CardSlot(scene, x, y)
      slot.onTap = () => this.onCardSelected?.(i)
      this.slots.push(slot)
    }

    // Next card preview (smaller, to the right)
    const nextX = cx + SLOT_SPACING * 2.4
    scene.add.rectangle(nextX, y, 48, 56, 0x111133, 1)
      .setDepth(50)
      .setStrokeStyle(1, 0x3344aa)

    this.nextIcon = scene.add.image(nextX, y - 6, 'placeholder_player')
      .setDisplaySize(30, 30)
      .setDepth(51)

    this.nextLabel = scene.add.text(nextX, y + 18, 'NEXT', {
      fontSize: '8px', color: '#6677aa',
    }).setOrigin(0.5).setDepth(52)
  }

  update(scene: Phaser.Scene, handState: HandState, playerElixir: number): void {
    for (let i = 0; i < 4; i++) {
      const card = handState.hand[i]
      if (card) {
        this.slots[i]!.setCard(scene, card, playerElixir)
      } else {
        this.slots[i]!.setEmpty()
      }
      this.slots[i]!.setSelected(handState.selectedIndex === i)
    }

    const nextKey = handState.nextCard.textureKeyPlayer
    if (scene.textures.exists(nextKey)) {
      this.nextIcon.setTexture(nextKey, 0).setDisplaySize(30, 30)
    }
    void this.nextLabel
  }
}

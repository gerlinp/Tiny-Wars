import Phaser from 'phaser'
import { CardSlot } from './CardSlot'
import type { HandState } from '@core/CardSystem'
import {
  handSlotCenterX, nextCardCenterX, nextIconDisplaySize,
  NEXT_SLOT_W, NEXT_SLOT_H, CINZEL_FONT,
} from './cardHandLayout'
import { createCardPortrait, destroyCardPortrait, type CardPortraitNode } from './cardPortrait'

export class CardHand {
  private slots: CardSlot[] = []
  private nextBorder: Phaser.GameObjects.Rectangle
  private nextPortrait: CardPortraitNode[] = []
  private nextLabel: Phaser.GameObjects.Text
  private nextCardId: string | null = null
  onCardSelected: ((index: number) => void) | null = null

  constructor(scene: Phaser.Scene, cx: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const slot = new CardSlot(scene, handSlotCenterX(cx, i), y)
      slot.onTap = () => this.onCardSelected?.(i)
      this.slots.push(slot)
    }

    const nextX = nextCardCenterX(cx)
    this.nextBorder = scene.add.rectangle(nextX, y, NEXT_SLOT_W, NEXT_SLOT_H, 0x0d1b3e, 0.9)
      .setDepth(49)
      .setStrokeStyle(1.5, 0x2e4480)
      .setVisible(false)

    this.nextLabel = scene.add.text(nextX, y + NEXT_SLOT_H / 2 + 4, 'NEXT', {
      fontSize: '12px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#aabbdd', stroke: '#000022', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(50).setVisible(false)
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

    const next = handState.nextCard
    const nextX = this.nextBorder.x
    const nextY = this.nextBorder.y
    const nextSize = nextIconDisplaySize()

    if (this.nextCardId !== next.id) {
      destroyCardPortrait(this.nextPortrait)
      this.nextPortrait = createCardPortrait(scene, next, nextX, nextY, nextSize.w, nextSize.h)
      for (const node of this.nextPortrait) {
        node.setAlpha(0.85)
        node.setDepth(node instanceof Phaser.GameObjects.Container ? 52 : 51)
      }
      this.nextCardId = next.id
    }

    this.nextBorder.setVisible(true)
    for (const node of this.nextPortrait) node.setVisible(true)
    this.nextLabel.setVisible(true)
  }
}

import Phaser from 'phaser'
import { CardSlot } from './CardSlot'
import type { HandState } from '@core/CardSystem'
import { cardAvatarKey, getCardAvatarBackdrop, getCardAvatarBuildingFit, getCardAvatarHandScale } from '@data/AssetManifest'
import { applyCardAvatarTexture } from '@rendering/cardAvatarTexture'
import {
  applyIconDisplaySize, applyBackdropDisplaySize, applyLayeredPortraitDisplaySize,
  applyBuildingAvatarDisplaySize,
  handSlotCenterX, nextCardCenterX, nextIconDisplaySize,
  NEXT_SLOT_W, NEXT_SLOT_H,
} from './cardHandLayout'

export class CardHand {
  private slots: CardSlot[] = []
  private nextBorder: Phaser.GameObjects.Rectangle
  private nextBackdrop: Phaser.GameObjects.Image
  private nextIcon: Phaser.GameObjects.Image
  private nextCardId: string | null = null
  onCardSelected: ((index: number) => void) | null = null

  constructor(scene: Phaser.Scene, cx: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const slot = new CardSlot(scene, handSlotCenterX(cx, i), y)
      slot.onTap = () => this.onCardSelected?.(i)
      this.slots.push(slot)
    }

    const nextX = nextCardCenterX(cx)
    this.nextBorder = scene.add.rectangle(nextX, y, NEXT_SLOT_W, NEXT_SLOT_H, 0x111133, 0.55)
      .setDepth(50)
      .setStrokeStyle(2, 0x7788cc)
      .setVisible(false)

    this.nextBackdrop = scene.add.image(nextX, y, cardAvatarKey('warrior'))
      .setAlpha(0.85)
      .setDepth(51)
      .setVisible(false)

    const nextSize = nextIconDisplaySize()
    this.nextIcon = scene.add.image(nextX, y, cardAvatarKey('warrior'))
      .setAlpha(0.85)
      .setDepth(52)
      .setVisible(false)
    applyIconDisplaySize(this.nextIcon, nextSize.w, nextSize.h)
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
    const nextSize = nextIconDisplaySize()
    if (this.nextCardId !== next.id) {
      applyCardAvatarTexture(this.nextIcon, scene, next.id)
      this.nextCardId = next.id

      const backdrop = getCardAvatarBackdrop(next.id)
      if (backdrop) {
        if (!scene.textures.exists(backdrop.key)) {
          throw new Error(`Card avatar backdrop "${backdrop.key}" for "${next.id}" is not loaded.`)
        }
        this.nextBackdrop.setTexture(backdrop.key)
        this.nextBackdrop.setVisible(true)
      } else {
        this.nextBackdrop.setVisible(false)
      }
    }

    const hasBackdrop = this.nextBackdrop.visible
    if (hasBackdrop) applyBackdropDisplaySize(this.nextBackdrop, nextSize.w, nextSize.h)
    if (getCardAvatarBuildingFit(next.id)) {
      applyBuildingAvatarDisplaySize(this.nextIcon, nextSize.w, nextSize.h)
    } else if (hasBackdrop) applyLayeredPortraitDisplaySize(this.nextIcon, nextSize.w, nextSize.h)
    else applyIconDisplaySize(this.nextIcon, nextSize.w, nextSize.h)

    if (next.id !== 'arrows') {
      const handScale = getCardAvatarHandScale(next.id)
      if (handScale !== 1) {
        this.nextIcon.setScale(this.nextIcon.scaleX * handScale, this.nextIcon.scaleY * handScale)
      }
    }

    this.nextBorder.setVisible(true)
    this.nextIcon.setVisible(true)
  }
}

import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { CINZEL_FONT, NUMBER_FONT } from './cardHandLayout'
import { createCardPortrait, destroyCardPortrait, type CardPortraitNode } from './cardPortrait'

const ICON_FILL  = 0.78
const BTN_H      = 152
const BTN_GAP    = 8
const PANEL_PAD  = 32
const BTN_FONT   = '72px'

export class DeckSlot {
  onInfo:   (() => void) | null = null
  onRemove: (() => void) | null = null
  onExpand: (() => void) | null = null

  private readonly bg: Phaser.GameObjects.Rectangle
  private readonly emptyText: Phaser.GameObjects.Text
  private readonly costText: Phaser.GameObjects.Text
  private readonly panelBg: Phaser.GameObjects.Rectangle
  private readonly infoBtnBg: Phaser.GameObjects.Rectangle
  private readonly infoBtnText: Phaser.GameObjects.Text
  private readonly remBtnBg: Phaser.GameObjects.Rectangle
  private readonly remBtnText: Phaser.GameObjects.Text
  private readonly hitArea: Phaser.GameObjects.Rectangle
  private portrait: CardPortraitNode[] = []
  private expanded = false
  private hasCard = false
  private btnPressed = false
  private sf = 1
  justInteracted = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly w: number,
    private readonly h: number,
  ) {
    this.bg = scene.add.rectangle(x, y, w, h, 0x0d1b3e, 0.92)
      .setStrokeStyle(8, 0x2e4480).setDepth(0)

    this.emptyText = scene.add.text(x, y, '+', {
      fontSize: '136px', fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#3a4a78',
    }).setOrigin(0.5).setDepth(2)

    this.costText = scene.add.text(x - w / 2 + 16, y + h / 2 - 16, '', {
      fontSize: '56px', fontFamily: NUMBER_FONT, fontStyle: 'bold',
      color: '#ffffff', stroke: '#1a004a', strokeThickness: 8,
      backgroundColor: '#5500cc', padding: { x: 20, y: 12 },
    }).setOrigin(0, 1).setDepth(4).setVisible(false)

    const btnY1   = y + h / 2 + PANEL_PAD + BTN_H / 2
    const btnY2   = btnY1 + BTN_H + BTN_GAP
    const panelH  = BTN_H * 2 + BTN_GAP + PANEL_PAD * 2
    const panelCy = y + h / 2 + panelH / 2

    this.panelBg = scene.add.rectangle(x, panelCy, w, panelH, 0x2e4480)
      .setStrokeStyle(6, 0x2e4480).setDepth(9).setVisible(false)

    this.infoBtnBg = scene.add.rectangle(x, btnY1, w - 16, BTN_H, 0x1a4a8a)
      .setStrokeStyle(0).setDepth(10).setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.infoBtnBg.setFillStyle(0x2a6ac0))
      .on('pointerout',  () => this.infoBtnBg.setFillStyle(0x1a4a8a))
      .on('pointerdown', () => {
        this.btnPressed = true; this.justInteracted = true
        this.onInfo?.()
        scene.time.delayedCall(50, () => { this.btnPressed = false; this.justInteracted = false })
      })
    this.infoBtnText = scene.add.text(x, btnY1, 'Info', {
      fontSize: BTN_FONT, fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11).setVisible(false)

    this.remBtnBg = scene.add.rectangle(x, btnY2, w - 16, BTN_H, 0x6a1a1a)
      .setStrokeStyle(0).setDepth(10).setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.remBtnBg.setFillStyle(0x8a2a2a))
      .on('pointerout',  () => this.remBtnBg.setFillStyle(0x6a1a1a))
      .on('pointerdown', () => {
        this.btnPressed = true; this.justInteracted = true
        this.onRemove?.()
        scene.time.delayedCall(50, () => { this.btnPressed = false; this.justInteracted = false })
      })
    this.remBtnText = scene.add.text(x, btnY2, 'Remove', {
      fontSize: BTN_FONT, fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11).setVisible(false)

    this.hitArea = scene.add.rectangle(x, y, w, h, 0x000000, 0).setDepth(5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (!this.hasCard || this.btnPressed) return
        this.justInteracted = true
        scene.time.delayedCall(50, () => { this.justInteracted = false })
        if (this.expanded) {
          this.collapse()
        } else {
          this.onExpand?.()
          this.expand()
        }
      })
  }

  setScrollFactor(x: number): void {
    this.sf = x
    this.bg.setScrollFactor(x)
    this.emptyText.setScrollFactor(x)
    this.costText.setScrollFactor(x)
    this.panelBg.setScrollFactor(x)
    this.infoBtnBg.setScrollFactor(x)
    this.infoBtnText.setScrollFactor(x)
    this.remBtnBg.setScrollFactor(x)
    this.remBtnText.setScrollFactor(x)
    this.hitArea.setScrollFactor(x)
    for (const img of this.portrait) img.setScrollFactor(x)
  }

  expand(): void {
    if (!this.hasCard) return
    this.expanded = true
    this.panelBg.setVisible(true)
    this.infoBtnBg.setVisible(true)
    this.infoBtnText.setVisible(true)
    this.remBtnBg.setVisible(true)
    this.remBtnText.setVisible(true)
    this.bg.setStrokeStyle(12, 0x4488ff)
  }

  collapse(): void {
    this.expanded = false
    this.panelBg.setVisible(false)
    this.infoBtnBg.setVisible(false)
    this.infoBtnText.setVisible(false)
    this.remBtnBg.setVisible(false)
    this.remBtnText.setVisible(false)
    if (this.hasCard) this.bg.setStrokeStyle(12, 0xffdd88)
  }

  setCard(card: CardDefinition | null): void {
    destroyCardPortrait(this.portrait)
    this.portrait = []
    this.collapse()

    this.hasCard = card !== null
    this.emptyText.setVisible(!this.hasCard)
    this.costText.setVisible(this.hasCard)
    this.bg.setStrokeStyle(this.hasCard ? 12 : 8, this.hasCard ? 0xffdd88 : 0x2e4480)

    if (!card) return

    this.portrait = createCardPortrait(this.scene, card, this.x, this.y, this.w * ICON_FILL, this.h * ICON_FILL)
    for (const img of this.portrait) { img.setDepth(1); img.setScrollFactor(this.sf) }
    this.costText.setText(`${card.elixirCost}`)
  }
}

import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { CINZEL_FONT, NUMBER_FONT } from './cardHandLayout'
import { createCardPortrait } from './cardPortrait'

const ICON_FILL  = 0.74
const BTN_H      = 38
const BTN_GAP    = 2
const PANEL_PAD  = 8
const BTN_FONT   = '18px'
const INFO_FILL  = 0x1a4a8a
const INFO_HOVER = 0x2a6ac0
const ADD_FILL   = 0x1a5a2a
const ADD_HOVER  = 0x2a7a3a
const REM_FILL   = 0x6a1a1a
const REM_HOVER  = 0x8a2a2a

export class DeckCard {
  onInfo:   (() => void) | null = null
  onAction: (() => void) | null = null
  onExpand: (() => void) | null = null

  private readonly bg: Phaser.GameObjects.Rectangle
  private readonly dim: Phaser.GameObjects.Rectangle
  private readonly infoBtnBg: Phaser.GameObjects.Rectangle
  private readonly infoBtnText: Phaser.GameObjects.Text
  private readonly actionBtnBg: Phaser.GameObjects.Rectangle
  private readonly actionBtnText: Phaser.GameObjects.Text
  private readonly panelBg: Phaser.GameObjects.Rectangle
  private expanded = false
  private btnPressed = false
  /** True for 50 ms after any interaction — lets the scene dismiss-handler skip this card. */
  justInteracted = false

  constructor(
    private readonly scene: Phaser.Scene,
    public readonly card: CardDefinition,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    this.bg = scene.add.rectangle(x, y, w, h, 0x0d1b3e, 0.92)
      .setStrokeStyle(2, 0x2e4480).setDepth(0)

    for (const img of createCardPortrait(scene, card, x, y, w * ICON_FILL, h * ICON_FILL)) {
      img.setDepth(1)
    }

    scene.add.text(x, y - h / 2 + 11, card.displayName, {
      fontSize: '13px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#cfe0ff', stroke: '#000022', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2)

    scene.add.text(x - w / 2 + 4, y + h / 2 - 4, `${card.elixirCost}`, {
      fontSize: '14px', fontFamily: NUMBER_FONT, fontStyle: 'bold',
      color: '#ffffff', stroke: '#1a004a', strokeThickness: 2,
      backgroundColor: '#5500cc', padding: { x: 5, y: 3 },
    }).setOrigin(0, 1).setDepth(2)

    this.dim = scene.add.rectangle(x, y, w, h, 0x05070f, 0.62)
      .setDepth(3).setVisible(false)

    const btnY1   = y + h / 2 + PANEL_PAD + BTN_H / 2
    const btnY2   = btnY1 + BTN_H + BTN_GAP
    const panelH  = BTN_H * 2 + BTN_GAP + PANEL_PAD * 2
    const panelCy = y + h / 2 + panelH / 2

    this.panelBg = scene.add.rectangle(x, panelCy, w, panelH, 0x2e4480)
      .setStrokeStyle(1.5, 0x2e4480).setDepth(9).setVisible(false)

    this.infoBtnBg = scene.add.rectangle(x, btnY1, w - 4, BTN_H, INFO_FILL)
      .setStrokeStyle(0).setDepth(10).setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => this.infoBtnBg.setFillStyle(INFO_HOVER))
      .on('pointerout',   () => this.infoBtnBg.setFillStyle(INFO_FILL))
      .on('pointerdown',  () => { this.btnPressed = true; this.justInteracted = true })
      .on('pointerup',    () => {
        this.onInfo?.()
        this.scene.time.delayedCall(50, () => { this.btnPressed = false; this.justInteracted = false })
      })
    this.infoBtnText = scene.add.text(x, btnY1, 'Info', {
      fontSize: BTN_FONT, fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11).setVisible(false)

    this.actionBtnBg = scene.add.rectangle(x, btnY2, w - 4, BTN_H, ADD_FILL)
      .setStrokeStyle(0).setDepth(10).setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.btnPressed = true; this.justInteracted = true })
      .on('pointerup',   () => {
        this.onAction?.()
        this.scene.time.delayedCall(50, () => { this.btnPressed = false; this.justInteracted = false })
      })
    this.actionBtnText = scene.add.text(x, btnY2, 'Add', {
      fontSize: BTN_FONT, fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11).setVisible(false)

    scene.add.rectangle(x, y, w, h, 0x000000, 0).setDepth(5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { this.justInteracted = true })
      .on('pointerup',   () => {
        if (this.btnPressed) return
        this.scene.time.delayedCall(50, () => { this.justInteracted = false })
        if (this.expanded) {
          this.collapse()
        } else {
          this.onExpand?.()
          this.expand()
        }
      })
  }

  expand(): void {
    this.expanded = true
    this.panelBg.setVisible(true)
    this.infoBtnBg.setVisible(true)
    this.infoBtnText.setVisible(true)
    this.actionBtnBg.setVisible(true)
    this.actionBtnText.setVisible(true)
    this.bg.setStrokeStyle(2, 0x4488ff)
  }

  collapse(): void {
    this.expanded = false
    this.panelBg.setVisible(false)
    this.infoBtnBg.setVisible(false)
    this.infoBtnText.setVisible(false)
    this.actionBtnBg.setVisible(false)
    this.actionBtnText.setVisible(false)
    this.bg.setStrokeStyle(this.dim.visible ? 3 : 2, this.dim.visible ? 0xffdd88 : 0x2e4480)
  }

  setInDeck(inDeck: boolean): void {
    this.dim.setVisible(inDeck)
    const border = inDeck ? 0xffdd88 : (this.expanded ? 0x4488ff : 0x2e4480)
    this.bg.setStrokeStyle(inDeck ? 3 : 2, border)
    if (inDeck) {
      this.actionBtnBg.setFillStyle(REM_FILL).setStrokeStyle(1, 0xaa4444)
      this.actionBtnBg.off('pointerover').on('pointerover', () => this.actionBtnBg.setFillStyle(REM_HOVER))
      this.actionBtnBg.off('pointerout') .on('pointerout',  () => this.actionBtnBg.setFillStyle(REM_FILL))
      this.actionBtnText.setText('Remove')
    } else {
      this.actionBtnBg.setFillStyle(ADD_FILL).setStrokeStyle(1, 0x44aa66)
      this.actionBtnBg.off('pointerover').on('pointerover', () => this.actionBtnBg.setFillStyle(ADD_HOVER))
      this.actionBtnBg.off('pointerout') .on('pointerout',  () => this.actionBtnBg.setFillStyle(ADD_FILL))
      this.actionBtnText.setText('Add')
    }
  }
}

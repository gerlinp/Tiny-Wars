import Phaser from 'phaser'
import { CINZEL_FONT } from './cardHandLayout'
import { GAME_WIDTH, CANVAS_HEIGHT } from '@data/GameConstants'

const BTN_H = 36
const GAP   = 4
const PAD   = 6

export class CardActionPopup {
  private readonly panel: Phaser.GameObjects.Container
  private readonly panelBg: Phaser.GameObjects.Rectangle
  private readonly infoBg: Phaser.GameObjects.Rectangle
  private readonly infoText: Phaser.GameObjects.Text
  private readonly actionBtnBg: Phaser.GameObjects.Rectangle
  private readonly actionBtnText: Phaser.GameObjects.Text

  private onInfoCb:   (() => void) | null = null
  private onActionCb: (() => void) | null = null

  /** True briefly after show() so the scene dismiss-listener doesn't fire immediately. */
  justShown = false

  private storedW = 0
  private storedTotalH = BTN_H + GAP + BTN_H

  constructor(private readonly scene: Phaser.Scene) {
    this.panel = scene.add.container(0, 0).setDepth(191).setVisible(false).setAlpha(0)

    this.panelBg = scene.add.rectangle(0, 0, 1, 1, 0x060e1f).setStrokeStyle(1.5, 0x1a3a6a)
    this.panel.add(this.panelBg)

    this.infoBg = scene.add.rectangle(0, BTN_H / 2, 1, BTN_H, 0x1a4a8a)
      .setStrokeStyle(1, 0x4477cc)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (p: Phaser.Input.Pointer) => { p.event.stopPropagation(); this.onInfoCb?.() })
      .on('pointerover', () => this.infoBg.setFillStyle(0x2a6ac0))
      .on('pointerout',  () => this.infoBg.setFillStyle(0x1a4a8a))
    this.infoText = scene.add.text(0, BTN_H / 2, 'Info', {
      fontSize: '15px', fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)

    this.actionBtnBg = scene.add.rectangle(0, BTN_H + GAP + BTN_H / 2, 1, BTN_H, 0x6a1a1a)
      .setStrokeStyle(1, 0xaa4444)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (p: Phaser.Input.Pointer) => { p.event.stopPropagation(); this.onActionCb?.() })
    this.actionBtnText = scene.add.text(0, BTN_H + GAP + BTN_H / 2, '', {
      fontSize: '15px', fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)

    this.panel.add([this.infoBg, this.infoText, this.actionBtnBg, this.actionBtnText])
  }

  show(
    cardCx: number,
    cardBottom: number,
    cardW: number,
    inDeck: boolean,
    onInfo: () => void,
    onAction: () => void,
  ): void {
    this.onInfoCb   = onInfo
    this.onActionCb = onAction
    this.storedW    = cardW
    this.storedTotalH = BTN_H + GAP + BTN_H

    this.panelBg.setSize(cardW + PAD * 2, this.storedTotalH + PAD * 2)
      .setPosition(0, this.storedTotalH / 2)
    this.infoBg.setSize(cardW, BTN_H)
    this.actionBtnBg.setSize(cardW, BTN_H)

    if (inDeck) {
      this.actionBtnBg.setFillStyle(0x6a1a1a).setStrokeStyle(1, 0xaa4444)
      this.actionBtnBg.off('pointerover').on('pointerover', () => this.actionBtnBg.setFillStyle(0x8a2a2a))
      this.actionBtnBg.off('pointerout') .on('pointerout',  () => this.actionBtnBg.setFillStyle(0x6a1a1a))
      this.actionBtnText.setText('Remove')
    } else {
      this.actionBtnBg.setFillStyle(0x1a5a2a).setStrokeStyle(1, 0x44aa66)
      this.actionBtnBg.off('pointerover').on('pointerover', () => this.actionBtnBg.setFillStyle(0x2a7a3a))
      this.actionBtnBg.off('pointerout') .on('pointerout',  () => this.actionBtnBg.setFillStyle(0x1a5a2a))
      this.actionBtnText.setText('Add')
    }

    const x = Phaser.Math.Clamp(cardCx, cardW / 2 + 4, GAME_WIDTH - cardW / 2 - 4)
    const y = Math.min(cardBottom + 2, CANVAS_HEIGHT - this.storedTotalH - 4)

    this.scene.tweens.killTweensOf(this.panel)

    if (this.panel.visible) {
      // Already open — slide to new position
      this.scene.tweens.add({
        targets: this.panel,
        x, y,
        scaleY: 1,
        alpha: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      })
    } else {
      // First open — slide down from card edge
      this.panel.setPosition(x, cardBottom).setAlpha(0).setScale(1, 0).setVisible(true)
      this.scene.tweens.add({
        targets: this.panel,
        y,
        alpha: 1,
        scaleY: 1,
        duration: 180,
        ease: 'Quad.easeOut',
      })
    }

    // Prevent the scene dismiss-listener from firing for this same tap
    this.justShown = true
    this.scene.time.delayedCall(50, () => { this.justShown = false })
  }

  hide(): void {
    if (!this.panel.visible) return
    this.scene.tweens.killTweensOf(this.panel)
    this.scene.tweens.add({
      targets: this.panel,
      alpha: 0,
      scaleY: 0,
      duration: 130,
      ease: 'Quad.easeIn',
      onComplete: () => this.panel.setVisible(false),
    })
    this.onInfoCb   = null
    this.onActionCb = null
  }

  /** True if the screen point is within the popup's interactive area. */
  containsPoint(sx: number, sy: number): boolean {
    const hw = this.storedW / 2 + PAD
    const px = this.panel.x
    const py = this.panel.y
    return sx >= px - hw && sx <= px + hw
      && sy >= py && sy <= py + this.storedTotalH + PAD * 2
  }

  get visible(): boolean {
    return this.panel.visible
  }
}

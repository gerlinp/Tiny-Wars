import Phaser from 'phaser'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { DeckCard } from '../ui/DeckCard'
import { DeckSlot } from '../ui/DeckSlot'
import { CardInfoModal } from '../ui/CardInfoModal'
import { CARD_DEFINITIONS } from '@data/CardData'
import { DECK_SIZE, getDeckCandidates, loadPlayerDeck, savePlayerDeck } from '@data/PlayerDeck'
import { GAME_WIDTH, CANVAS_HEIGHT } from '@data/GameConstants'

const COLS = 4
const SIDE_MARGIN = 16
const CELL_GAP_X = 8
const CELL_GAP_Y = 10

const DECK_TOP = 92
const FOOTER_H = 96

export class DeckBuilderScene extends Phaser.Scene {
  private deck: string[] = []
  private slots: DeckSlot[] = []
  private collection: DeckCard[] = []
  private counterText!: Phaser.GameObjects.Text
  private elixirText!: Phaser.GameObjects.Text
  private saveBtn!: { setEnabled: (on: boolean) => void }
  private clearBtn!: { setEnabled: (on: boolean) => void }
  private warningText!: Phaser.GameObjects.Text

  private modal!: CardInfoModal
  private expandedCard: DeckCard | null = null
  private expandedSlot: DeckSlot | null = null
  private collectionTop = 0

  constructor() {
    super({ key: 'DeckBuilderScene' })
  }

  create(): void {
    this.deck = loadPlayerDeck()
    this.slots = []
    this.collection = []

    this.add.rectangle(0, 0, GAME_WIDTH, CANVAS_HEIGHT, 0x1a1a2e).setOrigin(0)

    this.add.text(GAME_WIDTH / 2, 40, 'DECK BUILDER', {
      fontSize: '32px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#ffdd88', stroke: '#332200', strokeThickness: 6,
    }).setOrigin(0.5)

    this.add.text(SIDE_MARGIN, 72, 'YOUR DECK', {
      fontSize: '17px', fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#cfe0ff',
    }).setOrigin(0, 0.5)

    this.counterText = this.add.text(GAME_WIDTH - SIDE_MARGIN, 72, '', {
      fontSize: '17px', fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(1, 0.5)

    const { cellW, cellH } = this.cellSize()
    const deckBottom = DECK_TOP + 2 * cellH + CELL_GAP_Y
    this.collectionTop = deckBottom + 40

    this.elixirText = this.add.text(GAME_WIDTH / 2, deckBottom + 14, '', {
      fontSize: '16px', fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#d8a8ff',
    }).setOrigin(0.5, 0)

    this.add.text(SIDE_MARGIN, this.collectionTop - 22, 'COLLECTION', {
      fontSize: '17px', fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#cfe0ff',
    }).setOrigin(0, 0.5)

    this.warningText = this.add.text(GAME_WIDTH / 2, this.collectionTop - 8, 'DECK IS FULL!', {
      fontSize: '15px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#ff6666', stroke: '#1a0000', strokeThickness: 3,
      backgroundColor: '#330000', padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 1).setAlpha(0).setDepth(50)

    this.modal = new CardInfoModal(this, () => this.modal.hide())
    this.buildSlots(cellW, cellH)
    this.buildFooter()
    this.buildCollection(cellW, cellH)
    this.setupDismissHandlers()
    this.refresh()
  }

  private cellSize(): { cellW: number; cellH: number } {
    const cellW = (GAME_WIDTH - SIDE_MARGIN * 2 - (COLS - 1) * CELL_GAP_X) / COLS
    return { cellW, cellH: cellW * 1.12 }
  }

  private buildSlots(cellW: number, cellH: number): void {
    for (let i = 0; i < DECK_SIZE; i++) {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x = SIDE_MARGIN + col * (cellW + CELL_GAP_X) + cellW / 2
      const y = DECK_TOP + row * (cellH + CELL_GAP_Y) + cellH / 2
      const slot = new DeckSlot(this, x, y, cellW, cellH)
      slot.onExpand = () => {
        this.expandedCard?.collapse()
        this.expandedCard = null
        this.expandedSlot?.collapse()
        this.expandedSlot = slot
      }
      slot.onInfo   = () => { const def = CARD_DEFINITIONS[this.deck[i] ?? '']; if (def) this.modal.show(def) }
      slot.onRemove = () => this.removeAt(i)
      this.slots.push(slot)
    }
  }

  private buildCollection(cellW: number, cellH: number): void {
    getDeckCandidates().forEach((id, i) => {
      const def = CARD_DEFINITIONS[id]
      if (!def) return
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x = SIDE_MARGIN + col * (cellW + CELL_GAP_X) + cellW / 2
      const y = this.collectionTop + row * (cellH + CELL_GAP_Y) + cellH / 2
      const cardUi = new DeckCard(this, def, x, y, cellW, cellH)
      cardUi.onExpand = () => {
        this.expandedCard?.collapse()
        this.expandedSlot?.collapse()
        this.expandedSlot = null
        this.expandedCard = cardUi
      }
      cardUi.onInfo   = () => this.modal.show(def)
      cardUi.onAction = () => this.toggle(id)
      this.collection.push(cardUi)
    })
  }

  private setupDismissHandlers(): void {
    this.input.on('pointerdown', () => {
      if (this.modal.visible) return
      if (this.expandedCard && !this.expandedCard.justInteracted) {
        this.expandedCard.collapse()
        this.expandedCard = null
      }
      if (this.expandedSlot && !this.expandedSlot.justInteracted) {
        this.expandedSlot.collapse()
        this.expandedSlot = null
      }
    })
  }

  private toggle(id: string): void {
    const idx = this.deck.indexOf(id)
    if (idx !== -1) {
      this.deck.splice(idx, 1)
    } else if (this.deck.length < DECK_SIZE) {
      this.deck.push(id)
    } else {
      this.flashFullWarning()
      return
    }
    this.refresh()
  }

  private removeAt(i: number): void {
    if (i >= this.deck.length) return
    this.deck.splice(i, 1)
    this.refresh()
  }

  private clearDeck(): void {
    if (this.deck.length === 0) return
    this.deck = []
    this.refresh()
  }

  private refresh(): void {
    for (let i = 0; i < this.slots.length; i++) {
      const id = this.deck[i]
      this.slots[i]!.setCard(id ? CARD_DEFINITIONS[id] ?? null : null)
    }
    for (const cardUi of this.collection) {
      cardUi.setInDeck(this.deck.includes(cardUi.card.id))
    }
    const full = this.deck.length === DECK_SIZE
    this.counterText.setText(`${this.deck.length} / ${DECK_SIZE}`)
    this.counterText.setColor(full ? '#7dff9b' : '#ffd27d')
    this.elixirText.setText(formatAvgElixir(this.deck))
    this.saveBtn.setEnabled(full)
    this.clearBtn.setEnabled(this.deck.length > 0)
  }

  private flashFullWarning(): void {
    this.tweens.killTweensOf(this.warningText)
    this.warningText.setAlpha(1)
    this.tweens.add({
      targets: this.warningText,
      alpha: 0, delay: 1200, duration: 400, ease: 'Quad.easeIn',
    })
  }

  private flashSaved(): void {
    this.counterText.setText('Saved!')
    this.counterText.setColor('#7dff9b')
    this.tweens.add({
      targets: this.counterText,
      scale: { from: 1.25, to: 1 }, duration: 220, ease: 'Quad.easeOut',
    })
    this.time.delayedCall(900, () => { if (this.counterText.active) this.refresh() })
  }

  private buildFooter(): void {
    const footerY = CANVAS_HEIGHT - FOOTER_H / 2
    this.add.rectangle(GAME_WIDTH / 2, footerY, GAME_WIDTH, FOOTER_H, 0x0d1120)
      .setDepth(30)
    this.add.rectangle(GAME_WIDTH / 2, CANVAS_HEIGHT - FOOTER_H, GAME_WIDTH, 1, 0x2e4480, 0.6)
      .setDepth(30)

    const btnW = 130
    const gap = 12
    const totalW = btnW * 3 + gap * 2
    const left = (GAME_WIDTH - totalW) / 2 + btnW / 2

    makeButton(this, left,                   footerY, btnW, 'BACK',  0x44324f, 31, () => this.scene.start('MainMenuScene'))
    this.clearBtn = makeButton(this, left + btnW + gap,       footerY, btnW, 'CLEAR', 0x8b3a3a, 31, () => this.clearDeck())
    this.saveBtn  = makeButton(this, left + (btnW + gap) * 2, footerY, btnW, 'SAVE',  0x2e7d32, 31, () => {
      if (this.deck.length !== DECK_SIZE) return
      savePlayerDeck([...this.deck])
      this.flashSaved()
    })
  }
}

function formatAvgElixir(deckIds: string[]): string {
  if (deckIds.length === 0) return 'Avg Elixir: —'
  const sum = deckIds.reduce((acc, id) => acc + (CARD_DEFINITIONS[id]?.elixirCost ?? 0), 0)
  return `Avg Elixir: ${(sum / deckIds.length).toFixed(1)}`
}

function makeButton(
  scene: Phaser.Scene,
  cx: number,
  y: number,
  w: number,
  label: string,
  color: number,
  depth: number,
  onPress: () => void,
): { setEnabled: (on: boolean) => void } {
  const h = 54
  const bg   = scene.add.rectangle(cx, y, w, h, color).setStrokeStyle(2, 0xffffff, 0.25).setDepth(depth)
  const text = scene.add.text(cx, y, label, {
    fontSize: '22px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
    color: '#ffffff', stroke: '#000022', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(depth)

  let enabled = true
  bg.setInteractive({ useHandCursor: true })
  bg.on('pointerdown', () => { if (enabled) onPress() })
  bg.on('pointerover', () => { if (enabled) bg.setFillStyle(color, 0.8) })
  bg.on('pointerout',  () => bg.setFillStyle(color, enabled ? 1 : 0.35))

  return {
    setEnabled(on: boolean): void {
      enabled = on
      bg.setFillStyle(color, on ? 1 : 0.35)
      text.setAlpha(on ? 1 : 0.5)
    },
  }
}

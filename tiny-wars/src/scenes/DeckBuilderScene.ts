import Phaser from 'phaser'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { DeckCard } from '../ui/DeckCard'
import { DeckSlot } from '../ui/DeckSlot'
import { CARD_DEFINITIONS } from '@data/CardData'
import { DECK_SIZE, getDeckCandidates, loadPlayerDeck, savePlayerDeck } from '@data/PlayerDeck'
import { GAME_WIDTH, CANVAS_HEIGHT } from '@data/GameConstants'

const COLS = 4
const SIDE_MARGIN = 16
const CELL_GAP_X = 8
const CELL_GAP_Y = 10

const DECK_TOP = 92
const COLLECTION_TOP = 410

export class DeckBuilderScene extends Phaser.Scene {
  /** Ordered ids in the deck (max {@link DECK_SIZE}); order is cosmetic. */
  private deck: string[] = []
  private slots: DeckSlot[] = []
  private collection: DeckCard[] = []
  private counterText!: Phaser.GameObjects.Text
  private saveBtn!: { setEnabled: (on: boolean) => void }

  constructor() {
    super({ key: 'DeckBuilderScene' })
  }

  create(): void {
    this.deck = loadPlayerDeck()
    this.slots = []
    this.collection = []

    this.add.rectangle(0, 0, GAME_WIDTH, CANVAS_HEIGHT, 0x1a1a2e).setOrigin(0)

    this.add.text(GAME_WIDTH / 2, 40, 'DECK BUILDER', {
      fontSize: '32px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#ffdd88',
      stroke: '#332200',
      strokeThickness: 6,
    }).setOrigin(0.5)

    this.add.text(SIDE_MARGIN, 72, 'YOUR DECK', {
      fontSize: '15px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#cfe0ff',
    }).setOrigin(0, 0.5)

    this.counterText = this.add.text(GAME_WIDTH - SIDE_MARGIN, 72, '', {
      fontSize: '15px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(1, 0.5)

    this.add.text(SIDE_MARGIN, COLLECTION_TOP - 22, 'COLLECTION', {
      fontSize: '15px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#cfe0ff',
    }).setOrigin(0, 0.5)

    const { cellW, cellH } = this.cellSize()
    this.buildSlots(cellW, cellH)
    this.buildCollection(cellW, cellH)
    this.buildButtons()
    this.refresh()
  }

  private cellSize(): { cellW: number; cellH: number } {
    const cellW = (GAME_WIDTH - SIDE_MARGIN * 2 - (COLS - 1) * CELL_GAP_X) / COLS
    return { cellW, cellH: cellW * 1.12 }
  }

  /** Two rows of 4 deck slots. */
  private buildSlots(cellW: number, cellH: number): void {
    for (let i = 0; i < DECK_SIZE; i++) {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      const x = SIDE_MARGIN + col * (cellW + CELL_GAP_X) + cellW / 2
      const y = DECK_TOP + row * (cellH + CELL_GAP_Y) + cellH / 2
      const slot = new DeckSlot(this, x, y, cellW, cellH)
      slot.onTap = () => this.removeAt(i)
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
      const y = COLLECTION_TOP + row * (cellH + CELL_GAP_Y) + cellH / 2
      const cardUi = new DeckCard(this, def, x, y, cellW, cellH)
      cardUi.onToggle = () => this.toggle(id)
      this.collection.push(cardUi)
    })
  }

  private toggle(id: string): void {
    const idx = this.deck.indexOf(id)
    if (idx !== -1) {
      this.deck.splice(idx, 1)
    } else if (this.deck.length < DECK_SIZE) {
      this.deck.push(id)
    } else {
      this.flashCounter()
      return
    }
    this.refresh()
  }

  /** Remove the card occupying deck slot `i` (no-op for an empty slot). */
  private removeAt(i: number): void {
    if (i >= this.deck.length) return
    this.deck.splice(i, 1)
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
    this.saveBtn.setEnabled(full)
  }

  private flashCounter(): void {
    this.tweens.add({
      targets: this.counterText,
      scale: { from: 1.4, to: 1 },
      duration: 220,
      ease: 'Quad.easeOut',
    })
  }

  private buildButtons(): void {
    const y = CANVAS_HEIGHT - 70
    const btnW = 180
    const gap = 24

    makeButton(this, GAME_WIDTH / 2 - btnW / 2 - gap / 2, y, btnW, 'BACK', 0x44324f, () => {
      this.scene.start('MainMenuScene')
    })

    this.saveBtn = makeButton(
      this,
      GAME_WIDTH / 2 + btnW / 2 + gap / 2,
      y,
      btnW,
      'SAVE',
      0x2e7d32,
      () => {
        if (this.deck.length !== DECK_SIZE) return
        savePlayerDeck([...this.deck])
        this.scene.start('MainMenuScene')
      },
    )
  }
}

/** A flat coloured button with an enable/disable handle for the Save action. */
function makeButton(
  scene: Phaser.Scene,
  cx: number,
  y: number,
  w: number,
  label: string,
  color: number,
  onPress: () => void,
): { setEnabled: (on: boolean) => void } {
  const h = 54
  const bg = scene.add.rectangle(cx, y, w, h, color).setStrokeStyle(2, 0xffffff, 0.25)
  const text = scene.add.text(cx, y, label, {
    fontSize: '22px',
    fontFamily: CINZEL_FONT,
    fontStyle: 'bold',
    color: '#ffffff',
    stroke: '#000022',
    strokeThickness: 3,
  }).setOrigin(0.5)

  let enabled = true
  bg.setInteractive({ useHandCursor: true })
  bg.on('pointerdown', () => { if (enabled) onPress() })
  bg.on('pointerover', () => { if (enabled) bg.setFillStyle(color, 0.8) })
  bg.on('pointerout', () => bg.setFillStyle(color, enabled ? 1 : 0.35))

  return {
    setEnabled(on: boolean): void {
      enabled = on
      bg.setFillStyle(color, on ? 1 : 0.35)
      text.setAlpha(on ? 1 : 0.5)
    },
  }
}

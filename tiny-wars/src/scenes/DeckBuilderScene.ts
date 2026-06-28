import Phaser from 'phaser'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { footerButtonRowLayout } from '../ui/SceneButton'
import { DeckCard } from '../ui/DeckCard'
import { DeckSlot } from '../ui/DeckSlot'
import { CardInfoModal } from '../ui/CardInfoModal'
import { CARD_DEFINITIONS } from '@data/CardData'
import {
  COLLECTION_SORT_LABELS,
  COLLECTION_SORT_MODES,
  collectionSortLabel,
  DECK_SIZE,
  defaultSortDirection,
  getDeckCandidates,
  loadCollectionSort,
  loadPlayerDeck,
  saveCollectionSort,
  savePlayerDeck,
  type CollectionSortMode,
  type CollectionSortState,
} from '@data/PlayerDeck'
import { GAME_WIDTH, CANVAS_HEIGHT } from '@data/GameConstants'

const COLS = 4
const SIDE_MARGIN = 16
const CELL_GAP_X = 8
const CELL_GAP_Y = 10

const DECK_TOP = 92
const FOOTER_H = 96
// Extra space below the last collection row so the expanded action panel of the
// bottom row clears the fixed footer when scrolled fully down.
// Reference: rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-scrollablepanel/
// — "space.panel.bottom" for bottom padding inside a scrollable panel.
const EXPANDED_PANEL_H = 38 * 2 + 2 + 8 * 2  // BTN_H*2 + BTN_GAP + PANEL_PAD*2
const SCROLL_BOTTOM_PAD = FOOTER_H + EXPANDED_PANEL_H + 20
const COLLECTION_TITLE_BOTTOM_MARGIN = 18
const COLLECTION_SORT_BTN_H = 28
const COLLECTION_SORT_BOTTOM_MARGIN = 14

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
  private maxCollectionScrollY = 0
  private collectionSort: CollectionSortState = loadCollectionSort()
  private cellW = 0
  private cellH = 0
  private sortBtnBgs = new Map<CollectionSortMode, Phaser.GameObjects.Rectangle>()
  private sortBtnTexts = new Map<CollectionSortMode, Phaser.GameObjects.Text>()

  constructor() {
    super({ key: 'DeckBuilderScene' })
  }

  create(): void {
    this.deck = loadPlayerDeck()
    this.slots = []
    this.collection = []
    this.cameras.main.scrollY = 0

    this.add.rectangle(0, 0, GAME_WIDTH, CANVAS_HEIGHT, 0x1a1a2e).setOrigin(0).setScrollFactor(0)

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
    this.cellW = cellW
    this.cellH = cellH
    const deckBottom = DECK_TOP + 2 * cellH + CELL_GAP_Y
    this.collectionTop = deckBottom + 120

    this.elixirText = this.add.text(GAME_WIDTH / 2, deckBottom + 14, '', {
      fontSize: '16px', fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#d8a8ff',
    }).setOrigin(0.5, 0)

    const sortRowY = this.collectionTop - COLLECTION_SORT_BTN_H / 2 - COLLECTION_SORT_BOTTOM_MARGIN
    const titleY = sortRowY - COLLECTION_SORT_BTN_H - COLLECTION_TITLE_BOTTOM_MARGIN

    this.add.text(SIDE_MARGIN, titleY, 'COLLECTION', {
      fontSize: '17px', fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#cfe0ff',
    }).setOrigin(0, 0.5)

    this.buildSortControls(sortRowY)

    this.warningText = this.add.text(GAME_WIDTH / 2, this.collectionTop - 8, 'DECK IS FULL!', {
      fontSize: '15px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#ff6666', stroke: '#1a0000', strokeThickness: 3,
      backgroundColor: '#330000', padding: { x: 10, y: 5 },
    }).setOrigin(0.5, 1).setAlpha(0).setDepth(50)

    this.modal = new CardInfoModal(this, () => this.modal.hide())
    this.modal.setScrollFactor(0)
    this.buildSlots(cellW, cellH)
    this.buildFooter()
    this.buildCollection(cellW, cellH)
    this.setupScrolling(cellH)
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

  private buildSortControls(y: number): void {
    const btnW = 86
    const btnH = COLLECTION_SORT_BTN_H
    const gap = 6
    const count = COLLECTION_SORT_MODES.length
    const totalW = count * btnW + (count - 1) * gap
    let cx = (GAME_WIDTH - totalW) / 2 + btnW / 2

    for (const mode of COLLECTION_SORT_MODES) {
      const bg = this.add.rectangle(cx, y, btnW, btnH, 0x1a2a4a)
        .setStrokeStyle(1.5, 0x2e4480)
        .setDepth(20)
        .setInteractive({ useHandCursor: true })
      const text = this.add.text(cx, y, COLLECTION_SORT_LABELS[mode], {
        fontSize: '12px', fontFamily: CINZEL_FONT, fontStyle: 'bold', color: '#cfe0ff',
      }).setOrigin(0.5).setDepth(21)

      bg.on('pointerdown', () => this.setCollectionSort(mode))
      this.sortBtnBgs.set(mode, bg)
      this.sortBtnTexts.set(mode, text)
      cx += btnW + gap
    }

    this.updateSortButtonStyles()
  }

  private updateSortButtonStyles(): void {
    for (const mode of COLLECTION_SORT_MODES) {
      const active = mode === this.collectionSort.mode
      const bg = this.sortBtnBgs.get(mode)
      const text = this.sortBtnTexts.get(mode)
      bg?.setFillStyle(active ? 0x2e4480 : 0x1a2a4a)
      bg?.setStrokeStyle(1.5, active ? 0x88aaff : 0x2e4480)
      text?.setColor(active ? '#ffffff' : '#9ab0d8')
      text?.setText(collectionSortLabel(
        active ? this.collectionSort : { mode, direction: defaultSortDirection(mode) },
        active,
      ))
    }
  }

  private setCollectionSort(mode: CollectionSortMode): void {
    if (this.collectionSort.mode === mode) {
      this.collectionSort = {
        mode,
        direction: this.collectionSort.direction === 'asc' ? 'desc' : 'asc',
      }
    } else {
      this.collectionSort = { mode, direction: defaultSortDirection(mode) }
    }
    saveCollectionSort(this.collectionSort)
    this.updateSortButtonStyles()
    this.rebuildCollection()
  }

  private rebuildCollection(): void {
    this.expandedCard?.collapse()
    this.expandedCard = null
    for (const cardUi of this.collection) cardUi.destroy()
    this.collection = []
    this.buildCollection(this.cellW, this.cellH)
    this.updateScrollBounds(this.cellH)
    this.refresh()
  }

  private buildCollection(cellW: number, cellH: number): void {
    getDeckCandidates(this.collectionSort).forEach((id, i) => {
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

  private updateScrollBounds(cellH: number): void {
    const candidates = getDeckCandidates(this.collectionSort)
    const rows = Math.ceil(candidates.length / COLS)
    const totalCollH = rows * (cellH + CELL_GAP_Y) - CELL_GAP_Y
    const worldBottom = this.collectionTop + totalCollH + SCROLL_BOTTOM_PAD
    this.maxCollectionScrollY = Math.max(FOOTER_H, worldBottom - CANVAS_HEIGHT)
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, CANVAS_HEIGHT + this.maxCollectionScrollY)
    this.cameras.main.scrollY = Phaser.Math.Clamp(
      this.cameras.main.scrollY,
      0,
      this.maxCollectionScrollY,
    )
  }

  private setupScrolling(cellH: number): void {
    this.updateScrollBounds(cellH)

    const DRAG_THRESHOLD = 8
    let dragStartY = 0
    let dragStartCamY = 0
    let isDragging = false
    let dragValid = false

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      dragStartY = ptr.y
      dragStartCamY = this.cameras.main.scrollY
      isDragging = true
      dragValid = false
    })
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!isDragging || !ptr.isDown) return
      if (!dragValid && Math.abs(ptr.y - dragStartY) >= DRAG_THRESHOLD) dragValid = true
      if (dragValid) {
        this.cameras.main.scrollY = Phaser.Math.Clamp(
          dragStartCamY - (ptr.y - dragStartY),
          0,
          this.maxCollectionScrollY,
        )
      }
    })
    this.input.on('pointerup', () => { isDragging = false })
    this.input.on('wheel', (_ptr: unknown, _objs: unknown, _dx: number, dy: number) => {
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        this.cameras.main.scrollY + dy,
        0,
        this.maxCollectionScrollY,
      )
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
    // Auto-save whenever the deck is complete so matches always use the
    // latest deck even if the player doesn't press the SAVE button.
    if (full) savePlayerDeck([...this.deck])
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
      .setDepth(30).setScrollFactor(0)
    this.add.rectangle(GAME_WIDTH / 2, CANVAS_HEIGHT - FOOTER_H, GAME_WIDTH, 1, 0x2e4480, 0.6)
      .setDepth(30).setScrollFactor(0)

    const { centers, btnW } = footerButtonRowLayout(GAME_WIDTH, 3, SIDE_MARGIN, 8)
    const depth = 31

    makeButton(this, centers[0]!, footerY, btnW, 'BACK',  0x44324f, depth, () => this.scene.start('MainMenuScene'))
    this.clearBtn = makeButton(this, centers[1]!, footerY, btnW, 'CLEAR', 0x8b3a3a, depth, () => this.clearDeck())
    this.saveBtn  = makeButton(this, centers[2]!, footerY, btnW, 'SAVE',  0x2e7d32, depth, () => {
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
  const bg   = scene.add.rectangle(cx, y, w, h, color).setStrokeStyle(2, 0xffffff, 0.25).setDepth(depth).setScrollFactor(0)
  const text = scene.add.text(cx, y, label, {
    fontSize: '22px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
    color: '#ffffff', stroke: '#000022', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(depth).setScrollFactor(0)

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

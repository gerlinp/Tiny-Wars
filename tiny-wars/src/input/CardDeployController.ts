import Phaser from 'phaser'
import type { CardSystem } from '@core/CardSystem'
import type { GameSimulator } from '@core/GameSimulator'
import type { Grid } from '@core/Grid'
import type { DeployZoneOverlay } from '@rendering/DeployZoneOverlay'
import type { PlacementGhost } from '@rendering/PlacementGhost'
import { Owner } from '@core/types'
import { CardType } from '@core/types'
import type { Vec2 } from '@core/types'
import { GAME_HEIGHT } from '@data/GameConstants'
import { LOCAL_OWNER, enemyLaneUnlocksFor } from '@core/DeploySystem'

type State = 'IDLE' | 'CARD_SELECTED'

export class CardDeployController {
  private state: State = 'IDLE'
  private selectedIndex: number | null = null
  /** Pointer went down on the arena while aiming — release there to deploy. */
  private aimPointerActive = false

  onDeploy: ((cardId: string, gridPos: Vec2, worldPos: Vec2) => void) | null = null

  constructor(
    private scene: Phaser.Scene,
    private cardSystem: CardSystem,
    private simulator: GameSimulator,
    private grid: Grid,
    private overlay: DeployZoneOverlay,
    private ghost: PlacementGhost,
  ) {}

  private overlayModeFor(card: { id?: string; cardType: CardType }): 'troop' | 'elixir' | 'spell' {
    if (card.cardType === CardType.ELIXIR) return 'elixir'
    if (card.cardType === CardType.SPELL) return 'spell'
    // Miner burrows anywhere — highlight the whole arena like a spell.
    if (card.id === 'miner') return 'spell'
    return 'troop'
  }

  refreshDeployOverlay(): void {
    if (this.state !== 'CARD_SELECTED') return
    this.overlay.syncExpandedZones(LOCAL_OWNER, enemyLaneUnlocksFor(this.simulator.state, LOCAL_OWNER))
  }

  selectCard(index: number, playerElixir: number): void {
    const card = this.cardSystem.hand[index]
    if (!card) return

    if (this.selectedIndex === index) {
      this.deselect()
      return
    }

    if (card.elixirCost > playerElixir) {
      this.scene.cameras.main.shake(60, 0.002)
      return
    }

    if (this.selectedIndex !== null && this.cardSystem.selectedIndex === this.selectedIndex) {
      this.cardSystem.selectCard(this.selectedIndex)
    }

    this.state = 'CARD_SELECTED'
    this.selectedIndex = index
    this.aimPointerActive = false
    this.cardSystem.selectCard(index)

    const mode = this.overlayModeFor(card)
    this.overlay.syncExpandedZones(LOCAL_OWNER, enemyLaneUnlocksFor(this.simulator.state, LOCAL_OWNER))
    this.overlay.show(mode)

    if (card.cardType === CardType.ELIXIR) {
      this.ghost.hide()
    } else {
      this.ghost.setCard(card)
      this.ghost.hide()
    }
  }

  deselect(): void {
    if (this.selectedIndex !== null) {
      this.cardSystem.selectCard(this.selectedIndex)
    }
    this.state = 'IDLE'
    this.selectedIndex = null
    this.aimPointerActive = false
    this.overlay.hide()
    this.ghost.hide()
  }

  private updateAimPreview(x: number, y: number): void {
    if (this.state !== 'CARD_SELECTED' || this.selectedIndex === null) return

    const card = this.cardSystem.hand[this.selectedIndex]
    if (!card || card.cardType === CardType.ELIXIR) return

    const cell = this.grid.worldToCell(x, y)
    const valid = this.simulator.canDeployAt(Owner.PLAYER, card, cell)
    this.ghost.show()
    this.ghost.update(x, y, valid)
  }

  handlePointerMove(x: number, y: number): void {
    if (y >= GAME_HEIGHT) {
      if (this.aimPointerActive) this.ghost.hide()
      return
    }

    if (this.state !== 'CARD_SELECTED' || this.selectedIndex === null) return

    this.updateAimPreview(x, y)
  }

  /** Arena pointer down — start drag-to-aim (preview follows finger/mouse while held). */
  handleMapPointerDown(x: number, y: number): void {
    if (this.state !== 'CARD_SELECTED' || this.selectedIndex === null) return
    this.aimPointerActive = true
    this.updateAimPreview(x, y)
  }

  /** Arena pointer up — deploy at release position when a card is selected. */
  handleMapPointerUp(x: number, y: number): boolean {
    if (this.state !== 'CARD_SELECTED' || this.selectedIndex === null) return false
    if (!this.aimPointerActive) return false

    this.aimPointerActive = false
    return this.deployAt(x, y)
  }

  /** Cancel an in-progress aim when the pointer leaves the arena. */
  cancelAimPointer(): void {
    this.aimPointerActive = false
    if (this.state === 'CARD_SELECTED') {
      this.ghost.hide()
    }
  }

  private deployAt(x: number, y: number): boolean {
    if (this.state !== 'CARD_SELECTED' || this.selectedIndex === null) return false

    const card = this.cardSystem.hand[this.selectedIndex]
    if (!card) return false

    const cell = this.grid.worldToCell(x, y)
    const worldPos: Vec2 = { x, y }
    const success = this.simulator.deployCard(Owner.PLAYER, card, cell, worldPos)
    if (success) {
      this.onDeploy?.(card.id, cell, worldPos)
      this.cardSystem.consumeCard(this.selectedIndex)
      this.deselect()
    } else {
      this.scene.cameras.main.shake(80, 0.003)
    }

    return success
  }

  get isSelectingCard(): boolean { return this.state === 'CARD_SELECTED' }
  get activeIndex(): number | null { return this.selectedIndex }
}

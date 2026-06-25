import Phaser from 'phaser'
import type { CardSystem } from '@core/CardSystem'
import type { GameSimulator } from '@core/GameSimulator'
import type { Grid } from '@core/Grid'
import type { DeployZoneOverlay } from '@rendering/DeployZoneOverlay'
import type { PlacementGhost } from '@rendering/PlacementGhost'
import { Owner } from '@core/types'
import { GAME_HEIGHT, PLAYER_DEPLOY_ROW_MIN, PLAYER_DEPLOY_ROW_MAX } from '@data/GameConstants'

type State = 'IDLE' | 'CARD_SELECTED'

export class CardDeployController {
  private state: State = 'IDLE'
  private selectedIndex: number | null = null

  constructor(
    private scene: Phaser.Scene,
    private cardSystem: CardSystem,
    private simulator: GameSimulator,
    private grid: Grid,
    private overlay: DeployZoneOverlay,
    private ghost: PlacementGhost,
  ) {}

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
    this.cardSystem.selectCard(index)

    this.overlay.show()
    this.overlay.hideHint()
    this.ghost.setCard(card)
    this.ghost.show()
  }

  deselect(): void {
    if (this.selectedIndex !== null) {
      this.cardSystem.selectCard(this.selectedIndex)
    }
    this.state = 'IDLE'
    this.selectedIndex = null
    this.overlay.hide()
    this.ghost.hide()
  }

  handlePointerMove(x: number, y: number): void {
    if (y >= GAME_HEIGHT) {
      this.ghost.hide()
      return
    }

    if (this.state !== 'CARD_SELECTED' || this.selectedIndex === null) {
      const cell = this.grid.worldToCell(x, y)
      const inZone = cell.y >= PLAYER_DEPLOY_ROW_MIN && cell.y <= PLAYER_DEPLOY_ROW_MAX
      if (inZone) this.overlay.showHint()
      else this.overlay.hideHint()
      return
    }

    const card = this.cardSystem.hand[this.selectedIndex]
    if (!card) return

    const cell = this.grid.worldToCell(x, y)
    const valid = this.simulator.canDeployAt(Owner.PLAYER, card, cell)
    this.ghost.update(x, y, valid)
  }

  handleMapTap(x: number, y: number): boolean {
    if (this.state !== 'CARD_SELECTED' || this.selectedIndex === null) return false

    const card = this.cardSystem.hand[this.selectedIndex]
    if (!card) return false

    const cell = this.grid.worldToCell(x, y)
    const success = this.simulator.deployCard(Owner.PLAYER, card, cell)
    if (success) {
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

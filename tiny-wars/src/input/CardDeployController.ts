import Phaser from 'phaser'
import type { CardSystem } from '@core/CardSystem'
import type { GameSimulator } from '@core/GameSimulator'
import { Owner } from '@core/types'
import { CELL_SIZE } from '@data/GameConstants'

type State = 'IDLE' | 'CARD_SELECTED'

export class CardDeployController {
  private state: State = 'IDLE'
  private selectedIndex: number | null = null

  constructor(
    private scene: Phaser.Scene,
    private cardSystem: CardSystem,
    private simulator: GameSimulator,
    private camera: Phaser.Cameras.Scene2D.Camera,
  ) {}

  selectCard(index: number): void {
    if (this.selectedIndex === index) {
      // Deselect
      this.state = 'IDLE'
      this.selectedIndex = null
      this.cardSystem.selectCard(index) // toggles off
    } else {
      this.state = 'CARD_SELECTED'
      this.selectedIndex = index
      this.cardSystem.selectCard(index)
    }
  }

  handleMapTap(screenX: number, screenY: number): boolean {
    if (this.state !== 'CARD_SELECTED' || this.selectedIndex === null) return false

    const card = this.cardSystem.hand[this.selectedIndex]
    if (!card) return false

    // Convert screen → world via camera
    const worldX = (screenX + this.camera.scrollX)
    const worldY = (screenY + this.camera.scrollY)

    const col = Math.floor(worldX / CELL_SIZE)
    const row = Math.floor(worldY / CELL_SIZE)

    const success = this.simulator.deployCard(Owner.PLAYER, card, { x: col, y: row })
    if (success) {
      this.cardSystem.consumeCard(this.selectedIndex)
      this.state = 'IDLE'
      this.selectedIndex = null
    } else {
      // Flash invalid placement — reset selection
      this.scene.cameras.main.shake(80, 0.003)
    }

    return success
  }

  get isSelectingCard(): boolean { return this.state === 'CARD_SELECTED' }
  get activeIndex(): number | null { return this.selectedIndex }
}

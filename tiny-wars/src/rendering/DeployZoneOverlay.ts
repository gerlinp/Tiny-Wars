import Phaser from 'phaser'
import {
  GAME_WIDTH, CELL_SIZE,
  PLAYER_DEPLOY_ROW_MIN, PLAYER_DEPLOY_ROW_MAX,
} from '@data/GameConstants'

export class DeployZoneOverlay {
  private zone: Phaser.GameObjects.Rectangle
  private hint: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene) {
    const y = PLAYER_DEPLOY_ROW_MIN * CELL_SIZE
    const h = (PLAYER_DEPLOY_ROW_MAX - PLAYER_DEPLOY_ROW_MIN + 1) * CELL_SIZE

    this.zone = scene.add.rectangle(0, y, GAME_WIDTH, h, 0x44cc66, 0.18)
      .setOrigin(0)
      .setDepth(2)
      .setVisible(false)

    this.hint = scene.add.text(GAME_WIDTH / 2, y + h - 30, 'Select a card', {
      fontSize: '13px',
      color: '#88cc99',
    }).setOrigin(0.5).setDepth(3).setVisible(false)
  }

  show(): void {
    this.zone.setVisible(true)
  }

  hide(): void {
    this.zone.setVisible(false)
    this.hint.setVisible(false)
  }

  showHint(): void {
    if (!this.zone.visible) this.hint.setVisible(true)
  }

  hideHint(): void {
    this.hint.setVisible(false)
  }
}

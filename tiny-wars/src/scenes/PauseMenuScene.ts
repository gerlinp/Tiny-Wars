import Phaser from 'phaser'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { createOverlayButton } from '../ui/OverlayButton'

export class PauseMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseMenuScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setDepth(0)

    const panelW = Math.min(420, width * 0.7)
    const panelH = 420
    this.add.rectangle(cx, height / 2, panelW, panelH, 0x1a1a2e, 0.96)
      .setStrokeStyle(4, 0x445588)
      .setDepth(1)

    this.add.text(cx, height / 2 - panelH / 2 + 60, 'PAUSED', {
      fontSize: '48px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#ffdd88',
      stroke: '#000022',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(2)

    const step = 90

    createOverlayButton(this, cx, height / 2 - step, 'RESUME', () => {
      this.resumeBattle()
    }, { width: panelW - 100 }).setDepth(2)

    createOverlayButton(this, cx, height / 2, 'SETTINGS', () => {
      this.scene.setVisible(false)
      this.scene.pause()
      this.scene.launch('SettingsScene')
      this.scene.get('SettingsScene').events.once('shutdown', () => {
        this.scene.setVisible(true)
        this.scene.resume()
      })
    }, { width: panelW - 100 }).setDepth(2)

    createOverlayButton(this, cx, height / 2 + step, 'QUIT', () => {
      this.scene.stop('SettingsScene')
      this.scene.stop('BattleScene')
      this.scene.stop('UIScene')
      this.scene.stop('PauseMenuScene')
      this.scene.start('MainMenuScene')
    }, { width: panelW - 100, fill: 0x8b3a3a, stroke: 0xcc8888 }).setDepth(2)
  }

  private resumeBattle(): void {
    this.scene.stop('SettingsScene')
    this.scene.resume('BattleScene')
    this.scene.resume('UIScene')
    this.scene.stop('PauseMenuScene')
  }
}

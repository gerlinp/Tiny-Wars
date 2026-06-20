import Phaser from 'phaser'
import { Owner } from '@core/types'

interface ResultData { winner: Owner | null }

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' })
  }

  create(data: ResultData): void {
    const { width, height } = this.scale

    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setDepth(0)

    const { winner } = data
    const titleText = winner === Owner.PLAYER ? '🏆 VICTORY!' :
                      winner === Owner.BOT    ? '💀 DEFEAT'   :
                                               '🤝 TIE'
    const titleColor = winner === Owner.PLAYER ? '#ffdd44' :
                       winner === Owner.BOT    ? '#ff4444' : '#aabbff'

    this.add.text(width / 2, height * 0.35, titleText, {
      fontSize: '42px',
      fontStyle: 'bold',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10)

    // Play Again
    const btn = this.add.image(width / 2, height * 0.56, 'button_blue')
      .setInteractive({ useHandCursor: true })
      .setScale(2)
      .setDepth(10)

    this.add.text(width / 2, height * 0.56, 'PLAY AGAIN', {
      fontSize: '18px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11)

    btn.on('pointerdown', () => this.scene.start('BattleScene'))
    btn.on('pointerover', () => btn.setTint(0xdddddd))
    btn.on('pointerout',  () => btn.clearTint())

    // Main Menu
    this.add.text(width / 2, height * 0.65, 'Main Menu', {
      fontSize: '14px', color: '#aabbff',
    }).setOrigin(0.5).setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MainMenuScene'))
  }
}

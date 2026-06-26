import Phaser from 'phaser'
import { Owner } from '@core/types'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { createMenuButton } from '../ui/SceneButton'

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
      fontSize: '44px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(10)

    createMenuButton(this, width / 2, height * 0.56, 'PLAY AGAIN', '19px', 10, () => this.scene.start('BattleScene'))

    // Main Menu
    this.add.text(width / 2, height * 0.65, 'Main Menu', {
      fontSize: '14px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#aabbff', stroke: '#000022', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MainMenuScene'))
  }
}

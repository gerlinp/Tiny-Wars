import Phaser from 'phaser'
import { Owner } from '@core/types'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { createMenuButton, menuButtonRowCenters } from '../ui/SceneButton'
import { startBattleLoading } from '../ui/loadingScreenUi'
import type { PvPNetwork } from '@core/PvPNetwork'

interface ResultData {
  winner: Owner | null
  pvpNetwork?: PvPNetwork
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' })
  }

  create(data: ResultData): void {
    const { width, height } = this.scale
    const { winner, pvpNetwork } = data

    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setDepth(0)

    const titleText  = winner === Owner.PLAYER ? '🏆 VICTORY!' :
                       winner === Owner.BOT    ? '💀 DEFEAT'   : '🤝 TIE'
    const titleColor = winner === Owner.PLAYER ? '#ffdd44' :
                       winner === Owner.BOT    ? '#ff4444'  : '#aabbff'

    this.add.text(width / 2, height * 0.35, titleText, {
      fontSize: '44px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(10)

    if (pvpNetwork) {
      this.buildPvPButtons(width, height, pvpNetwork)
    } else {
      this.buildSoloButtons(width, height)
    }
  }

  private buildSoloButtons(width: number, height: number): void {
    createMenuButton(this, width / 2, height * 0.56, 'PLAY AGAIN', '19px', 10, () => startBattleLoading(this))
    createMenuButton(this, width / 2, height * 0.66, 'DECK', '19px', 10, () => this.scene.start('DeckBuilderScene'))
    this.add.text(width / 2, height * 0.75, 'Main Menu', {
      fontSize: '16px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#aabbff', stroke: '#000022', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MainMenuScene'))
  }

  private buildPvPButtons(width: number, height: number, network: PvPNetwork): void {
    let localReady  = false
    let remoteReady = false

    const statusText = this.add.text(width / 2, height * 0.52, '', {
      fontSize: '15px',
      fontFamily: "'Philosopher', Georgia, serif",
      color: '#aabbff',
      align: 'center',
    }).setOrigin(0.5).setDepth(11)

    // REMATCH button
    const [rematchX, menuX] = menuButtonRowCenters(width, 2, 10)
    createMenuButton(this, rematchX, height * 0.62, 'REMATCH', '15px', 10, () => {
      if (localReady) return
      localReady = true
      network.sendRematch()
      statusText.setText('Waiting for opponent...')
      checkBothReady()
    })

    createMenuButton(this, menuX, height * 0.62, 'MENU', '15px', 10, () => {
      network.destroy()
      this.scene.start('MainMenuScene')
    })

    const checkBothReady = () => {
      if (localReady && remoteReady) {
        statusText.setText('Starting rematch!')
        network.onRematch = null
        network.onDisconnected = null
        this.scene.start('TransitionLoadingScene', {
          next: 'BattleScene',
          data: { pvpNetwork: network },
        })
      }
    }

    network.onRematch = () => {
      remoteReady = true
      if (!localReady) {
        statusText.setText('Opponent wants a rematch!')
      }
      checkBothReady()
    }

    network.onDisconnected = () => {
      statusText.setText('Opponent disconnected.')
      network.destroy()
    }
  }
}

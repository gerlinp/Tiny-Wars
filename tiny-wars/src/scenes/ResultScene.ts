import Phaser from 'phaser'
import { Owner } from '@core/types'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { createMenuButton, menuButtonRowCenters, MENU_BUTTON_SCALE } from '../ui/SceneButton'
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
      fontSize: '176px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 28,
    }).setOrigin(0.5).setDepth(10)

    if (pvpNetwork) {
      this.buildPvPButtons(width, height, pvpNetwork)
    } else {
      this.buildSoloButtons(width, height)
    }
  }

  private buildSoloButtons(width: number, height: number): void {
    createMenuButton(this, width / 2, height * 0.56, 'PLAY AGAIN', '76px', 10, () => startBattleLoading(this))
    createMenuButton(this, width / 2, height * 0.66, 'DECK', '76px', 10, () => this.scene.start('DeckBuilderScene'))
    this.add.text(width / 2, height * 0.75, 'Main Menu', {
      fontSize: '64px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#aabbff', stroke: '#000022', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MainMenuScene'))
  }

  private buildPvPButtons(width: number, height: number, network: PvPNetwork): void {
    let localReady  = false
    let remoteReady = false

    const statusText = this.add.text(width / 2, height * 0.52, '', {
      fontSize: '60px',
      fontFamily: "'Philosopher', Georgia, serif",
      color: '#aabbff',
      align: 'center',
    }).setOrigin(0.5).setDepth(11)

    // REMATCH button — built inline so we can update its appearance
    const [rematchX, menuX] = menuButtonRowCenters(width, 2, 40)
    const rematchBtn = this.add.image(rematchX, height * 0.62, 'button_blue')
      .setInteractive({ useHandCursor: true })
      .setScale(MENU_BUTTON_SCALE)
      .setDepth(10)
    const rematchLabel = this.add.text(rematchX, height * 0.62, 'REMATCH', {
      fontSize: '60px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#ffffff', stroke: '#000022', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(11)
    rematchBtn.on('pointerover', () => { if (!localReady) rematchBtn.setTint(0xdddddd) })
    rematchBtn.on('pointerout',  () => { if (!localReady) rematchBtn.clearTint() })
    rematchBtn.on('pointerdown', () => {
      if (localReady) return
      localReady = true
      network.sendRematch()
      // Dim the button to show we've committed
      rematchPulse?.stop()
      rematchBtn.setTint(0x888888).disableInteractive()
      rematchLabel.setColor('#888888')
      if (!remoteReady) statusText.setText('Waiting for opponent...')
      checkBothReady()
    })

    createMenuButton(this, menuX, height * 0.62, 'MENU', '60px', 10, () => {
      network.destroy()
      this.scene.start('MainMenuScene')
    })

    // Pulsing tween shown when opponent has clicked but we haven't yet
    let rematchPulse: Phaser.Tweens.Tween | null = null
    const startRematchPulse = () => {
      rematchBtn.setTint(0xffdd44)
      rematchLabel.setColor('#ffdd44')
      rematchPulse = this.tweens.add({
        targets: rematchBtn,
        scaleX: MENU_BUTTON_SCALE * 1.08,
        scaleY: MENU_BUTTON_SCALE * 1.08,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }

    const checkBothReady = () => {
      if (localReady && remoteReady) {
        rematchPulse?.stop()
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
        startRematchPulse()
      }
      checkBothReady()
    }

    network.onDisconnected = () => {
      statusText.setText('Opponent disconnected.')
      network.destroy()
    }
  }
}

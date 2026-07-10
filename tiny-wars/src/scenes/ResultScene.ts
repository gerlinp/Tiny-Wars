import Phaser from 'phaser'
import { Owner } from '@core/types'
import { createWideButton, wideButtonDisplayHeight, DEEP_BLUE, DEEP_PURPLE, DEEP_RED, DEEP_GREEN } from '../ui/SceneButton'
import { createBannerPopup } from '../ui/matchupBanner'
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

    // A dim scrim, not a solid cover — BattleScene keeps rendering behind this scene
    // (frozen at the moment of victory), so the board stays visible through it.
    this.add.rectangle(0, 0, width, height, 0x000000, 0.4).setOrigin(0).setDepth(0)

    const titleText  = winner === Owner.PLAYER ? '🏆 VICTORY!' :
                       winner === Owner.BOT    ? '💀 DEFEAT'   : '🤝 TIE'
    const titleColor = winner === Owner.PLAYER ? '#ffdd44' :
                       winner === Owner.BOT    ? '#ff6666'  : '#aabbff'

    const banner = createBannerPopup(this, width / 2, height * 0.32, titleText, {
      width: 640, height: 190, fontSize: '80px', color: titleColor,
    })
    banner.fadeIn(600)

    // Buttons fade in just after the banner lands, so the reveal reads first.
    this.time.delayedCall(600, () => {
      if (pvpNetwork) {
        this.buildPvPButtons(width, height, pvpNetwork)
      } else {
        this.buildSoloButtons(width, height)
      }
    })
  }

  /** BattleScene is only frozen (never paused/stopped) while this scene is up, so
   *  any navigation away from here must explicitly tear it down first. */
  private leaveBattle(next: () => void): void {
    this.scene.stop('BattleScene')
    next()
  }

  private fadeInGroup(objects: Phaser.GameObjects.GameObject[]): void {
    for (const obj of objects) (obj as unknown as { alpha: number }).alpha = 0
    this.tweens.add({ targets: objects, alpha: 1, duration: 300 })
  }

  private buildSoloButtons(width: number, height: number): void {
    // Same wide pill buttons + stacked layout as MainMenuScene's PLAY/ONLINE/DECK column.
    const btnStep = wideButtonDisplayHeight() + 26
    const btnYs = [0, 1, 2].map(i => height * 0.55 + i * btnStep)

    const playAgain = createWideButton(this, width / 2, btnYs[0]!, 'PLAY AGAIN', '64px', 10,
      () => this.leaveBattle(() => startBattleLoading(this)), { tint: DEEP_BLUE })
    const deck = createWideButton(this, width / 2, btnYs[1]!, 'DECK', '64px', 10,
      () => this.leaveBattle(() => this.scene.start('DeckBuilderScene')), { tint: DEEP_RED })
    const menu = createWideButton(this, width / 2, btnYs[2]!, 'MAIN MENU', '64px', 10,
      () => this.leaveBattle(() => this.scene.start('MainMenuScene')), { tint: DEEP_PURPLE })

    this.fadeInGroup([
      playAgain.button, playAgain.label,
      deck.button, deck.label,
      menu.button, menu.label,
    ])
  }

  private buildPvPButtons(width: number, height: number, network: PvPNetwork): void {
    let localReady  = false
    let remoteReady = false

    const statusText = this.add.text(width / 2, height * 0.50, '', {
      fontSize: '37px',
      fontFamily: "'Philosopher', Georgia, serif",
      color: '#aabbff',
      align: 'center',
    }).setOrigin(0.5).setDepth(11)

    // Same wide pill buttons as MainMenuScene, stacked (they're too wide to sit side by side).
    const btnStep = wideButtonDisplayHeight() + 26
    const rematchY = height * 0.58
    const menuY = rematchY + btnStep

    const rematch = createWideButton(this, width / 2, rematchY, 'REMATCH', '64px', 10, () => {
      if (localReady) return
      localReady = true
      network.sendRematch()
      // Dim the button to show we've committed
      rematchPulse?.stop()
      rematch.button.setTint(0x888888).disableInteractive()
      rematch.label.setColor('#888888')
      if (!remoteReady) statusText.setText('Waiting for opponent...')
      checkBothReady()
    }, { tint: DEEP_GREEN })

    const menuBtn = createWideButton(this, width / 2, menuY, 'MENU', '64px', 10, () => {
      network.destroy()
      this.leaveBattle(() => this.scene.start('MainMenuScene'))
    }, { tint: DEEP_PURPLE })

    this.fadeInGroup([statusText, rematch.button, rematch.label, menuBtn.button, menuBtn.label])

    // Pulsing tween shown when opponent has clicked but we haven't yet
    let rematchPulse: Phaser.Tweens.Tween | null = null
    const startRematchPulse = () => {
      rematch.button.setTint(0xffdd44)
      rematch.label.setColor('#ffdd44')
      rematchPulse = this.tweens.add({
        targets: rematch.button,
        scaleX: rematch.button.scaleX * 1.08,
        scaleY: rematch.button.scaleY * 1.08,
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
        this.leaveBattle(() => this.scene.start('TransitionLoadingScene', {
          next: 'BattleScene',
          data: { pvpNetwork: network },
        }))
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

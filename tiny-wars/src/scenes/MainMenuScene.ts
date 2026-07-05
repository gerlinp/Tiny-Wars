import Phaser from 'phaser'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { createMenuButton, menuButtonRowCenters } from '../ui/SceneButton'
import { startBattleLoading } from '../ui/loadingScreenUi'
import { createWaterBackground } from '../ui/menuBackground'
import { createDriftingClouds, playCloudCoverClose } from '../ui/clouds'

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' })
  }

  create(): void {
    const params = new URLSearchParams(window.location.search)
    if (params.get('testArena') === '1') {
      this.scene.start('TestArenaScene')
      return
    }

    const roomCode = params.get('room')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
    if (roomCode && roomCode.length === 5) {
      this.scene.start('PvPLobbyScene', { autoJoinCode: roomCode })
      return
    }

    const { width, height } = this.scale

    createWaterBackground(this, width, height)
    createDriftingClouds(this, width, height)

    this.add.text(width / 2, height * 0.28, 'TINY WARS', {
      fontSize: '129px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#ffdd88',
      stroke: '#332200',
      strokeThickness: 20,
    }).setOrigin(0.5).setDepth(5)

    this.add.text(width / 2, height * 0.38, 'Real-time lane battles', {
      fontSize: '42px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#8888aa',
      stroke: '#000022',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(5)

    const menuBtnY = height * 0.55
    const [playX, onlineX, deckX] = menuButtonRowCenters(width, 3, 24)
    let leaving = false
    const playWithCloudClose = () => {
      if (leaving) return
      leaving = true
      playCloudCoverClose(this, width, height, 650)
      this.time.delayedCall(750, () => startBattleLoading(this))
    }
    createMenuButton(this, playX,   menuBtnY, 'PLAY',   '72px', 5, playWithCloudClose)
    createMenuButton(this, onlineX, menuBtnY, 'ONLINE', '56px', 5, () => this.scene.start('PvPLobbyScene'))
    createMenuButton(this, deckX,   menuBtnY, 'DECK',   '72px', 5, () => this.scene.start('DeckBuilderScene'))
  }
}

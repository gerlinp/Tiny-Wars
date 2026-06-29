import Phaser from 'phaser'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { createMenuButton, menuButtonRowCenters } from '../ui/SceneButton'
import { startBattleLoading } from '../ui/loadingScreenUi'

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' })
  }

  create(): void {
    const { width, height } = this.scale

    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0)

    this.add.text(width / 2, height * 0.28, 'TINY WARS', {
      fontSize: '208px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#ffdd88',
      stroke: '#332200',
      strokeThickness: 32,
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.38, 'Real-time lane battles', {
      fontSize: '68px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#8888aa',
      stroke: '#000022',
      strokeThickness: 8,
    }).setOrigin(0.5)

    const menuBtnY = height * 0.55
    const [playX, onlineX, deckX] = menuButtonRowCenters(width, 3, 40)
    createMenuButton(this, playX,   menuBtnY, 'PLAY',   '72px', 1, () => startBattleLoading(this))
    createMenuButton(this, onlineX, menuBtnY, 'ONLINE', '56px', 1, () => this.scene.start('PvPLobbyScene'))
    createMenuButton(this, deckX,   menuBtnY, 'DECK',   '72px', 1, () => this.scene.start('DeckBuilderScene'))
  }
}

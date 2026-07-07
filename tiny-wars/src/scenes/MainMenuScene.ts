import Phaser from 'phaser'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { createWideButton, wideButtonDisplayHeight, DEEP_BLUE, DEEP_PURPLE, DEEP_RED, DEEP_GREEN, type MenuButtonHandle } from '../ui/SceneButton'
import { startBattleLoading } from '../ui/loadingScreenUi'
import { createWaterBackground } from '../ui/menuBackground'
import { createDriftingClouds, playCloudCoverClose } from '../ui/clouds'
import {
  BOT_DIFFICULTIES,
  BOT_DIFFICULTY_LABELS,
  saveBotDifficulty,
  type BotDifficulty,
} from '@data/BotDecks'

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

    // Wide buttons stacked in a column
    const btnStep = wideButtonDisplayHeight() + 26
    const btnYs = [0, 1, 2].map(i => height * 0.50 + i * btnStep)
    let leaving = false
    const startBattleAt = (difficulty: BotDifficulty) => {
      if (leaving) return
      leaving = true
      saveBotDifficulty(difficulty)
      playCloudCoverClose(this, width, height, 650)
      this.time.delayedCall(750, () => startBattleLoading(this))
    }

    // Difficulty row — hidden until PLAY is pressed, then swaps in for the main row.
    const mainRow: MenuButtonHandle[] = []
    const difficultyRow: MenuButtonHandle[] = []
    const showDifficulties = (show: boolean) => {
      for (const b of mainRow) b.setVisible(!show)
      for (const b of difficultyRow) b.setVisible(show)
      backLabel.setVisible(show)
    }

    mainRow.push(
      createWideButton(this, width / 2, btnYs[0]!, 'PLAY',   '64px', 5, () => showDifficulties(true), { tint: DEEP_BLUE }),
      createWideButton(this, width / 2, btnYs[1]!, 'ONLINE', '64px', 5, () => this.scene.start('PvPLobbyScene'), { tint: DEEP_GREEN }),
      createWideButton(this, width / 2, btnYs[2]!, 'DECK',   '64px', 5, () => this.scene.start('DeckBuilderScene'), { tint: DEEP_RED }),
    )

    const difficultyStyles: ReadonlyArray<{ tint?: number }> =
      [{ tint: DEEP_BLUE }, { tint: DEEP_PURPLE }, { tint: DEEP_RED }]
    BOT_DIFFICULTIES.forEach((difficulty, i) => {
      const btn = createWideButton(
        this, width / 2, height * 0.50 + i * btnStep,
        BOT_DIFFICULTY_LABELS[difficulty].toUpperCase(), '64px', 5,
        () => startBattleAt(difficulty),
        difficultyStyles[i] ?? {},
      )
      btn.setVisible(false)
      difficultyRow.push(btn)
    })

    const backLabel = this.add.text(width / 2, height * 0.50 + BOT_DIFFICULTIES.length * btnStep, '← Back', {
      fontSize: '40px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#aabbff', stroke: '#000022', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(5).setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => showDifficulties(false))
  }
}

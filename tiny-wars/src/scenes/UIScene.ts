import Phaser from 'phaser'
import { ElixirBar } from '@ui/ElixirBar'
import { CardHand } from '@ui/CardHand'
import { TimerDisplay } from '@ui/TimerDisplay'
import { CrownCounter } from '@ui/CrownCounter'
import type { HandState } from '@core/CardSystem'

export interface UISnapshot {
  playerElixir: number
  botElixir: number
  playerCrowns: number
  botCrowns: number
  elapsedMs: number
  hand: HandState
}

export class UIScene extends Phaser.Scene {
  private elixirBar!: ElixirBar
  private cardHand!: CardHand
  private timer!: TimerDisplay
  private crowns!: CrownCounter
  private pauseBtn!: Phaser.GameObjects.Text

  onCardSelected: ((index: number) => void) | null = null

  constructor() {
    super({ key: 'UIScene' })
  }

  create(): void {
    const { width, height } = this.scale

    // Fixed camera — never scrolls
    this.cameras.main.setScroll(0, 0)

    // Semi-transparent bottom bar background
    this.add.rectangle(0, height - 110, width, 110, 0x111122, 0.85).setOrigin(0).setDepth(45)

    const cx = width / 2
    const barY = height - 98

    this.crowns   = new CrownCounter(this, cx, barY - 36)
    this.timer    = new TimerDisplay(this, cx, barY - 54)
    this.elixirBar = new ElixirBar(this, cx, barY - 16)
    this.cardHand  = new CardHand(this, cx, height - 52)

    this.cardHand.onCardSelected = (i) => {
      this.onCardSelected?.(i)
    }

    this.pauseBtn = this.add.text(width - 12, 12, '⏸', {
      fontSize: '22px',
    }).setOrigin(1, 0).setDepth(60).setInteractive({ useHandCursor: true })

    this.pauseBtn.on('pointerdown', () => {
      this.scene.pause('BattleScene')
    })
  }

  updateState(snapshot: UISnapshot): void {
    this.elixirBar.update(Math.floor(snapshot.playerElixir))
    this.cardHand.update(this, snapshot.hand, snapshot.playerElixir)
    this.timer.update(snapshot.elapsedMs)
    this.crowns.update(snapshot.playerCrowns, snapshot.botCrowns)
  }
}

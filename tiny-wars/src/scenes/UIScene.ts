import Phaser from 'phaser'
import { ElixirBar } from '@ui/ElixirBar'
import { CardHand } from '@ui/CardHand'
import { TimerDisplay } from '@ui/TimerDisplay'
import { CrownCounter } from '@ui/CrownCounter'
import type { HandState } from '@core/CardSystem'
import type { GamePhase } from '@core/GameState'
import { GAME_HEIGHT, HUD_HEIGHT } from '@data/GameConstants'
import { deckCenterY, elixirBarY } from '@ui/cardHandLayout'
import { DevMode } from '@debug/DevMode'

export interface UISnapshot {
  playerElixir: number
  botElixir: number
  playerCrowns: number
  botCrowns: number
  elapsedMs: number
  phase: GamePhase
  hand: HandState
}

export class UIScene extends Phaser.Scene {
  private elixirBar!: ElixirBar
  private cardHand!: CardHand
  private timer!: TimerDisplay
  private crowns!: CrownCounter
  private pauseBtn!: Phaser.GameObjects.Text
  private devBtn!: Phaser.GameObjects.Text

  onCardSelected: ((index: number) => void) | null = null
  onDevModeToggle: (() => void) | null = null

  constructor() {
    super({ key: 'UIScene' })
  }

  create(): void {
    const { width } = this.scale

    this.cameras.main.setScroll(0, 0)

    this.add.rectangle(0, GAME_HEIGHT, width, HUD_HEIGHT, 0x111122, 0.88).setOrigin(0).setDepth(45)

    const cx = width / 2

    this.timer  = new TimerDisplay(this, cx, 80)
    this.crowns = new CrownCounter(this, cx, 40)

    this.elixirBar = new ElixirBar(this, cx, elixirBarY(GAME_HEIGHT))
    this.cardHand  = new CardHand(this, cx, deckCenterY(GAME_HEIGHT))

    this.cardHand.onCardSelected = (i) => {
      this.onCardSelected?.(i)
    }

    this.devBtn = this.add.text(48, 48, 'DEV: OFF', {
      fontSize: '52px',
      color: '#888888',
      backgroundColor: '#222244',
      padding: { x: 24, y: 16 },
    }).setOrigin(0, 0).setDepth(60).setInteractive({ useHandCursor: true })

    this.devBtn.on('pointerdown', () => {
      const on = DevMode.toggle()
      this.updateDevButton(on)
      this.onDevModeToggle?.()
    })

    this.updateDevButton(DevMode.enabled)

    this.pauseBtn = this.add.text(width - 48, 48, '⏸', {
      fontSize: '88px',
      shadow: { offsetX: 4, offsetY: 8, color: '#000000', blur: 6, fill: true },
    }).setOrigin(1, 0).setDepth(60).setInteractive({ useHandCursor: true })

    this.pauseBtn.on('pointerdown', () => {
      this.scene.pause('BattleScene')
    })
  }

  private opponentNameText: Phaser.GameObjects.Text | null = null

  /** Call immediately after launch to switch the HUD into online-match mode. */
  setPvP(isPvP: boolean, localName = '', opponentName = ''): void {
    if (!isPvP) return
    const { width } = this.scale
    this.pauseBtn.setVisible(false).disableInteractive()

    this.add.text(width - 48, 48, '🌐 ONLINE', {
      fontSize: '52px',
      color: '#44ddff',
      backgroundColor: '#0a1a2a',
      padding: { x: 24, y: 16 },
    }).setOrigin(1, 0).setDepth(60)

    // Player name — bottom-left of HUD panel
    const youLabel = localName || 'YOU'
    this.add.text(32, GAME_HEIGHT + 24, youLabel, {
      fontSize: '44px',
      fontFamily: "'Philosopher', Georgia, serif",
      color: '#88aacc',
    }).setOrigin(0, 0).setDepth(60)

    // Opponent name — bottom-right of HUD panel (updated once HELLO arrives)
    const oppLabel = opponentName || 'OPPONENT'
    this.opponentNameText = this.add.text(width - 32, GAME_HEIGHT + 24, oppLabel, {
      fontSize: '44px',
      fontFamily: "'Philosopher', Georgia, serif",
      color: '#cc8888',
    }).setOrigin(1, 0).setDepth(60)
  }

  /** Update the opponent name label once the HELLO message arrives. */
  setOpponentName(name: string): void {
    if (this.opponentNameText && name) {
      this.opponentNameText.setText(name)
    }
  }

  private updateDevButton(on: boolean): void {
    this.devBtn.setText(on ? 'DEV: ON' : 'DEV: OFF')
    this.devBtn.setColor(on ? '#44ff88' : '#888888')
  }

  updateState(snapshot: UISnapshot): void {
    this.elixirBar.update(Math.floor(snapshot.playerElixir))
    this.cardHand.update(this, snapshot.hand, snapshot.playerElixir)
    this.timer.update(snapshot.elapsedMs, snapshot.phase)
    this.crowns.update(snapshot.playerCrowns, snapshot.botCrowns)
  }
}

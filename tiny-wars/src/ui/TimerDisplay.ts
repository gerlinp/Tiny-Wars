import Phaser from 'phaser'
import { GAME_DURATION_MS } from '@data/GameConstants'
import { NUMBER_FONT } from './cardHandLayout'

const TIMER_COLOR_SAFE     = '#ffffff'
const TIMER_COLOR_WARN     = '#ffcc44'
const TIMER_COLOR_CRITICAL = '#ff4444'
const TIMER_WARN_MS        = 60_000
const TIMER_CRIT_MS        = 30_000

export class TimerDisplay {
  private text: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.text = scene.add.text(x, y, '3:00', {
      fontSize: '26px',
      fontFamily: NUMBER_FONT,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000022',
      strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 10, stroke: true, fill: true },
    }).setOrigin(0.5).setDepth(50)
  }

  update(elapsedMs: number): void {
    const remainingMs = Math.max(0, GAME_DURATION_MS - elapsedMs)
    const totalSec = Math.ceil(remainingMs / 1000)
    const minutes  = Math.floor(totalSec / 60)
    const seconds  = totalSec % 60

    this.text.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`)

    if (remainingMs > TIMER_WARN_MS)      this.text.setColor(TIMER_COLOR_SAFE)
    else if (remainingMs > TIMER_CRIT_MS) this.text.setColor(TIMER_COLOR_WARN)
    else                                  this.text.setColor(TIMER_COLOR_CRITICAL)
  }
}

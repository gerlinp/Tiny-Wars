import Phaser from 'phaser'
import { GAME_DURATION_MS } from '@data/GameConstants'

export class TimerDisplay {
  private text: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.text = scene.add.text(x, y, '3:00', {
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50)
  }

  update(elapsedMs: number): void {
    const remainingMs = Math.max(0, GAME_DURATION_MS - elapsedMs)
    const totalSec = Math.ceil(remainingMs / 1000)
    const minutes  = Math.floor(totalSec / 60)
    const seconds  = totalSec % 60

    this.text.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`)

    if (remainingMs > 60_000)      this.text.setColor('#ffffff')
    else if (remainingMs > 30_000) this.text.setColor('#ffcc44')
    else                           this.text.setColor('#ff4444')
  }
}

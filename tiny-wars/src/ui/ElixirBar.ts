import Phaser from 'phaser'
import { ELIXIR_MAX } from '@data/GameConstants'

const PIP_W = 26
const PIP_H = 14
const PIP_GAP = 3

export class ElixirBar {
  private pips: Phaser.GameObjects.Rectangle[] = []
  private label: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, cx: number, y: number) {
    const totalW = ELIXIR_MAX * (PIP_W + PIP_GAP) - PIP_GAP
    const startX = cx - totalW / 2

    for (let i = 0; i < ELIXIR_MAX; i++) {
      const x = startX + i * (PIP_W + PIP_GAP)
      const pip = scene.add.rectangle(x, y, PIP_W, PIP_H, 0x220033, 1)
        .setOrigin(0, 0.5)
        .setDepth(50)
        .setStrokeStyle(1, 0x8800cc)
      this.pips.push(pip)
    }

    this.label = scene.add.text(cx, y + 10, '0', {
      fontSize: '11px', color: '#cc88ff',
    }).setOrigin(0.5).setDepth(51)
  }

  update(elixir: number): void {
    for (let i = 0; i < this.pips.length; i++) {
      this.pips[i]!.setFillStyle(i < elixir ? 0xcc44ff : 0x220033)
    }
    this.label.setText(`${elixir}`)
  }
}

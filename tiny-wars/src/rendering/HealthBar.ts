import Phaser from 'phaser'

const BAR_W = 28
const BAR_H = 4
const BAR_OFFSET_Y = -18

export class HealthBar {
  private bg: Phaser.GameObjects.Rectangle
  private fill: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.bg   = scene.add.rectangle(x, y + BAR_OFFSET_Y, BAR_W, BAR_H, 0x330000).setDepth(10)
    this.fill = scene.add.rectangle(x - BAR_W / 2, y + BAR_OFFSET_Y, BAR_W, BAR_H, 0x00cc44).setOrigin(0, 0.5).setDepth(11)
  }

  update(x: number, y: number, fraction: number): void {
    this.bg.setPosition(x, y + BAR_OFFSET_Y)
    this.fill.setPosition(x - BAR_W / 2, y + BAR_OFFSET_Y)
    this.fill.width = Math.max(0, BAR_W * fraction)

    // Color shift: green → yellow → red
    if (fraction > 0.5)      this.fill.setFillStyle(0x00cc44)
    else if (fraction > 0.25) this.fill.setFillStyle(0xcccc00)
    else                      this.fill.setFillStyle(0xcc2200)
  }

  destroy(): void {
    this.bg.destroy()
    this.fill.destroy()
  }
}

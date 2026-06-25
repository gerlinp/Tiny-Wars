import Phaser from 'phaser'

const BAR_H = 4

export interface HealthBarOptions {
  /** Pixels above entity centre; negative = up */
  offsetY?: number
  barWidth?: number
  depth?: number
}

export class HealthBar {
  private bg: Phaser.GameObjects.Rectangle
  private fill: Phaser.GameObjects.Rectangle
  private readonly barW: number
  private readonly offsetY: number

  constructor(scene: Phaser.Scene, x: number, y: number, options: HealthBarOptions = {}) {
    this.barW = options.barWidth ?? 28
    this.offsetY = options.offsetY ?? -14
    const depth = options.depth ?? 12

    this.bg   = scene.add.rectangle(x, y + this.offsetY, this.barW, BAR_H, 0x330000).setDepth(depth).setVisible(false)
    this.fill = scene.add.rectangle(x - this.barW / 2, y + this.offsetY, this.barW, BAR_H, 0x00cc44).setOrigin(0, 0.5).setDepth(depth + 1).setVisible(false)
  }

  /** Troop bar — sits just above the unit sprite */
  static forTroop(scene: Phaser.Scene, x: number, y: number, spriteHeight: number): HealthBar {
    return new HealthBar(scene, x, y, {
      barWidth: Math.max(28, Math.round(spriteHeight * 0.55)),
      offsetY: -Math.round(spriteHeight * 0.45),
    })
  }

  /** Building bar — sits above the full building height */
  static forBuilding(scene: Phaser.Scene, x: number, y: number, spriteHeight: number): HealthBar {
    return new HealthBar(scene, x, y, {
      barWidth: Math.max(40, Math.round(spriteHeight * 0.65)),
      offsetY: -(Math.round(spriteHeight / 2) + 10),
      depth: 25,
    })
  }

  /** Princess / king tower bar — above the tower sprite */
  static forTower(scene: Phaser.Scene, x: number, y: number, spriteHeight: number, isKing: boolean): HealthBar {
    const widthMult = isKing ? 0.75 : 0.65
    return new HealthBar(scene, x, y, {
      barWidth: Math.max(48, Math.round(spriteHeight * widthMult)),
      offsetY: -(Math.round(spriteHeight / 2) + 12),
      depth: 25,
    })
  }

  setVisible(visible: boolean): void {
    this.bg.setVisible(visible)
    this.fill.setVisible(visible)
  }

  update(x: number, y: number, fraction: number, visible = false): void {
    if (!visible) {
      this.setVisible(false)
      return
    }

    this.setVisible(true)
    this.bg.setPosition(x, y + this.offsetY)
    this.fill.setPosition(x - this.barW / 2, y + this.offsetY)
    this.fill.width = Math.max(0, this.barW * fraction)

    if (fraction > 0.5)      this.fill.setFillStyle(0x00cc44)
    else if (fraction > 0.25) this.fill.setFillStyle(0xcccc00)
    else                      this.fill.setFillStyle(0xcc2200)
  }

  destroy(): void {
    this.bg.destroy()
    this.fill.destroy()
  }
}

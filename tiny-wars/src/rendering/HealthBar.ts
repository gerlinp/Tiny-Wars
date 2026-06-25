import Phaser from 'phaser'
import {
  HEALTH_BAR_ASSETS,
  HEALTH_BAR_FILL_HEIGHT_RATIO,
  HEALTH_BAR_FILL_INSET_X,
} from '@data/AssetManifest'

type HealthBarVariant = keyof typeof HEALTH_BAR_ASSETS

export interface HealthBarOptions {
  /** Pixels above entity centre; zero = y is already the bar centre */
  offsetY?: number
  barWidth?: number
  depth?: number
  variant?: HealthBarVariant
}

export class HealthBar {
  private bg: Phaser.GameObjects.Image
  private fill: Phaser.GameObjects.Image
  private readonly barW: number
  private readonly offsetY: number
  private readonly barH: number
  private readonly fillInnerW: number

  constructor(scene: Phaser.Scene, x: number, y: number, options: HealthBarOptions = {}) {
    const variant = options.variant ?? 'small'
    const assets = HEALTH_BAR_ASSETS[variant]
    this.barW = options.barWidth ?? 28
    this.offsetY = options.offsetY ?? -14
    this.barH = assets.displayHeight
    this.fillInnerW = this.barW * (1 - 2 * HEALTH_BAR_FILL_INSET_X)
    const depth = options.depth ?? 12
    const cy = y + this.offsetY

    this.bg = scene.add.image(x, cy, assets.base.key)
      .setDepth(depth)
      .setVisible(false)
    this.bg.setDisplaySize(this.barW, this.barH)

    this.fill = scene.add.image(
      x - this.barW / 2 + this.barW * HEALTH_BAR_FILL_INSET_X,
      cy,
      assets.fill.key,
    )
      .setOrigin(0, 0.5)
      .setDepth(depth + 1)
      .setVisible(false)
    this.layoutFill(cy, 1)
  }

  /** Troop bar — sits just above the unit sprite */
  static forTroop(scene: Phaser.Scene, x: number, y: number, spriteHeight: number): HealthBar {
    return new HealthBar(scene, x, y, {
      barWidth: Math.max(28, Math.round(spriteHeight * 0.55)),
      offsetY: -Math.round(spriteHeight * 0.45),
      variant: 'small',
    })
  }

  /** Building bar — sits above the full building height */
  static forBuilding(scene: Phaser.Scene, x: number, y: number, spriteHeight: number): HealthBar {
    return new HealthBar(scene, x, y, {
      barWidth: Math.max(40, Math.round(spriteHeight * 0.65)),
      offsetY: -(Math.round(spriteHeight / 2) + 10),
      depth: 25,
      variant: 'small',
    })
  }

  /** Princess / king tower bar — arena-facing edge of the sprite */
  static forTower(
    scene: Phaser.Scene,
    x: number,
    barY: number,
    spriteHeight: number,
    isKing: boolean,
  ): HealthBar {
    const widthMult = isKing ? 0.75 : 0.65
    return new HealthBar(scene, x, barY, {
      barWidth: Math.max(48, Math.round(spriteHeight * widthMult)),
      offsetY: 0,
      depth: 25,
      variant: 'big',
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
    const cy = y + this.offsetY
    this.bg.setPosition(x, cy)
    this.bg.setDisplaySize(this.barW, this.barH)
    this.layoutFill(cy, fraction)
    this.applyFillTint(fraction)
  }

  destroy(): void {
    this.bg.destroy()
    this.fill.destroy()
  }

  private layoutFill(cy: number, fraction: number): void {
    const fillW = Math.max(0, this.fillInnerW * fraction)
    const fillH = this.barH * HEALTH_BAR_FILL_HEIGHT_RATIO
    const fillX = this.bg.x - this.barW / 2 + this.barW * HEALTH_BAR_FILL_INSET_X

    this.fill.setPosition(fillX, cy)
    this.fill.setDisplaySize(fillW, fillH)
  }

  private applyFillTint(fraction: number): void {
    if (fraction > 0.5) {
      this.fill.clearTint()
      return
    }
    if (fraction > 0.25) {
      this.fill.setTint(0xffcc66)
      return
    }
    this.fill.setTint(0xff5555)
  }
}

import Phaser from 'phaser'
import {
  HEALTH_BAR_ASSETS,
  HEALTH_BAR_BASE_SHEET_W,
  HEALTH_BAR_TEXTURE_H,
} from '@data/AssetManifest'
import { Owner } from '@core/types'
import {
  healthBarFillDisplayHeight,
  healthBarFillHorizontalInset,
  healthBarInnerWidth,
} from './healthBarLayout'

type HealthBarVariant = keyof typeof HEALTH_BAR_ASSETS

const HEALTH_BAR_FILL_SHEET_W = 64
const HEALTH_WARN_THRESHOLD = 0.3
const HEALTH_CRIT_THRESHOLD = 0.15


export interface HealthBarOptions {
  /** Pixels above entity centre; zero = y is already the bar centre */
  offsetY?: number
  barWidth?: number
  depth?: number
  variant?: HealthBarVariant
  owner?: Owner
}

/**
 * Tiny Swords live bars: 3 named sub-frames (leftCap | mid stretch | rightCap) + fill on top.
 * Frames are registered in PreloadScene so setDisplaySize scales against the art width,
 * not the full 320 px sheet — eliminating the gap artefact.
 */
export class HealthBar {
  private readonly frameLeft: Phaser.GameObjects.Image
  private readonly frameCenter: Phaser.GameObjects.Image
  private readonly frameRight: Phaser.GameObjects.Image
  private readonly fill: Phaser.GameObjects.Image
  private readonly barW: number
  private readonly offsetY: number
  private readonly barH: number
  private readonly depth: number
  private readonly fillInsetX: number
  private readonly fillHeightRatio: number
  private readonly fillMinW: number
  private readonly fillFrameH: number
  private readonly leftCapTexW: number
  private readonly rightCapTexW: number
  private readonly baseArtH: number
  private readonly owner: Owner | undefined

  constructor(scene: Phaser.Scene, x: number, y: number, options: HealthBarOptions = {}) {
    const variant = options.variant ?? 'small'
    const assets = HEALTH_BAR_ASSETS[variant]
    this.offsetY = options.offsetY ?? -35
    this.barH = assets.displayHeight
    this.depth = options.depth ?? 12
    this.owner = options.owner
    this.fillInsetX = assets.fillInsetX
    this.fillHeightRatio = assets.fillHeightRatio
    this.fillMinW = 10
    this.fillFrameH = assets.fillFrame.h
    this.leftCapTexW = assets.baseRegions.leftCap.w
    this.rightCapTexW = assets.baseRegions.rightCap.w
    this.baseArtH = assets.baseFrame.h

    const minBarW = this.minBarWidth()
    this.barW = Math.max(options.barWidth ?? minBarW, minBarW)
    const cy = y + this.offsetY
    const baseKey = assets.base.key

    const frameOpts = { depth: this.depth, visible: false as boolean }
    this.frameLeft   = scene.add.image(0, cy, baseKey, 'leftCap').setOrigin(0.5, 0.5).setDepth(frameOpts.depth).setVisible(frameOpts.visible)
    this.frameCenter = scene.add.image(0, cy, baseKey, 'mid').setOrigin(0.5, 0.5).setDepth(frameOpts.depth).setVisible(frameOpts.visible)
    this.frameRight  = scene.add.image(0, cy, baseKey, 'rightCap').setOrigin(0.5, 0.5).setDepth(frameOpts.depth).setVisible(frameOpts.visible)

    const fillKey = options.owner === Owner.PLAYER ? assets.fillPlayer.key : assets.fill.key
    this.fill = scene.add.image(0, cy, fillKey, 'fill')
      .setOrigin(0, 0.5)
      .setDepth(this.depth + 1)
      .setVisible(false)

    this.layout(x, cy, 1)
  }

  /** Troop bar — thin bar above the unit */
  static forTroop(scene: Phaser.Scene, x: number, y: number, spriteHeight: number, owner?: Owner): HealthBar {
    return new HealthBar(scene, x, y, {
      barWidth: Math.max(112, Math.round(spriteHeight * 0.4)),
      offsetY: -Math.round(spriteHeight * 0.52),
      variant: 'small',
      owner,
    })
  }

  /** Building bar — above the structure */
  static forBuilding(scene: Phaser.Scene, x: number, y: number, spriteHeight: number, owner?: Owner): HealthBar {
    return new HealthBar(scene, x, y, {
      barWidth: Math.max(192, Math.round(spriteHeight * 0.6)),
      offsetY: -(Math.round(spriteHeight / 2) + 48),
      depth: 25,
      variant: 'small',
      owner,
    })
  }

  /** Princess / king tower bar */
  static forTower(
    scene: Phaser.Scene,
    x: number,
    barY: number,
    spriteWidth: number,
    isKing: boolean,
    owner?: Owner,
  ): HealthBar {
    const widthMult = isKing ? 0.38 : 0.32
    return new HealthBar(scene, x, barY, {
      barWidth: Math.max(isKing ? 100 : 80, Math.round(spriteWidth * widthMult)),
      offsetY: 0,
      depth: 48,
      variant: 'big',
      owner,
    })
  }

  setVisible(visible: boolean): void {
    this.frameLeft.setVisible(visible)
    this.frameCenter.setVisible(visible)
    this.frameRight.setVisible(visible)
    this.fill.setVisible(visible)
  }

  update(x: number, y: number, fraction: number, visible = false): void {
    if (!visible) {
      this.setVisible(false)
      return
    }

    this.setVisible(true)
    this.layout(x, y + this.offsetY, fraction)
    this.applyFillTint(fraction)
  }

  destroy(): void {
    this.frameLeft.destroy()
    this.frameCenter.destroy()
    this.frameRight.destroy()
    this.fill.destroy()
  }

  private minBarWidth(): number {
    const capPx = this.texToDisplayW(this.leftCapTexW + this.rightCapTexW)
    return Math.max(capPx + 8, Math.round(this.barH * (HEALTH_BAR_BASE_SHEET_W / HEALTH_BAR_TEXTURE_H)))
  }

  private texToDisplayW(texW: number): number {
    return Math.max(1, Math.round(this.barH * (texW / this.baseArtH)))
  }

  private layoutFramePart(
    img: Phaser.GameObjects.Image,
    displayW: number,
    centerX: number,
    cy: number,
  ): void {
    img
      .setDisplaySize(displayW, this.barH)
      .setPosition(centerX, cy)
  }

  private layout(cx: number, cy: number, fraction: number): void {
    const leftX = cx - this.barW / 2
    const capLW = this.texToDisplayW(this.leftCapTexW)
    const capRW = this.texToDisplayW(this.rightCapTexW)
    const centerW = Math.max(0, this.barW - capLW - capRW)

    this.layoutFramePart(this.frameLeft,   capLW,   leftX + capLW / 2,              cy)
    this.layoutFramePart(this.frameCenter, centerW, leftX + capLW + centerW / 2,    cy)
    this.layoutFramePart(this.frameRight,  capRW,   leftX + this.barW - capRW / 2,  cy)

    const inset = healthBarFillHorizontalInset(this.barH, capLW, {
      baseArtH: this.baseArtH,
      fillFrameH: this.fillFrameH,
      fillInsetX: this.fillInsetX,
      fillHeightRatio: this.fillHeightRatio,
    })
    const innerW = healthBarInnerWidth(this.barW, inset)
    const fillW = fraction <= 0 ? 0 : Math.max(this.fillMinW, innerW * fraction)
    const fillH = healthBarFillDisplayHeight(this.barH, {
      baseArtH: this.baseArtH,
      fillFrameH: this.fillFrameH,
      fillInsetX: this.fillInsetX,
      fillHeightRatio: this.fillHeightRatio,
    })

    if (fillW <= 0) {
      this.fill.setVisible(false)
      return
    }

    this.fill.setVisible(true)
    const cropW = Math.min(
      HEALTH_BAR_FILL_SHEET_W,
      Math.max(12, Math.round(HEALTH_BAR_FILL_SHEET_W * fraction)),
    )
    this.fill
      .setCrop(0, 0, cropW, this.fillFrameH)
      .setDisplaySize(fillW, fillH)
      .setPosition(leftX + inset, cy)
  }

  private applyFillTint(fraction: number): void {
    if (this.owner !== undefined) {
      this.fill.clearTint()
      return
    }
    if (fraction > HEALTH_WARN_THRESHOLD) {
      this.fill.clearTint()
      return
    }
    if (fraction > HEALTH_CRIT_THRESHOLD) {
      this.fill.setTint(0xffcc66)
      return
    }
    this.fill.setTint(0xff6666)
  }
}

import Phaser from 'phaser'
import { TERRAIN_BRIDGE, bridgeSliceHeights } from '@data/TerrainManifest'

/**
 * Vertical 3-slice bridge — mirrors HealthBar layout (topCap | mid stretch | bottomCap).
 * Sub-frames are registered in PreloadScene from tight opaque art bounds.
 */
export class BridgeStrip {
  private readonly top: Phaser.GameObjects.Image
  private readonly mid: Phaser.GameObjects.Image
  private readonly bottom: Phaser.GameObjects.Image
  private readonly bridgeW: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    topY: number,
    totalH: number,
    bridgeW: number,
    depth: number,
  ) {
    this.bridgeW = bridgeW
    const cx = x + bridgeW / 2
    const key = TERRAIN_BRIDGE.key

    this.top = scene.add.image(cx, topY, key, 'topCap')
      .setOrigin(0.5, 0)
      .setDepth(depth)
    this.mid = scene.add.image(cx, topY, key, 'mid')
      .setOrigin(0.5, 0)
      .setDepth(depth)
    this.bottom = scene.add.image(cx, topY, key, 'bottomCap')
      .setOrigin(0.5, 0)
      .setDepth(depth)

    this.layout(topY, totalH)
  }

  private layoutPart(img: Phaser.GameObjects.Image, displayH: number, topY: number): void {
    img.setDisplaySize(this.bridgeW, displayH).setPosition(img.x, topY)
  }

  private layout(topY: number, totalH: number): void {
    const { topH, midH, bottomH } = bridgeSliceHeights(totalH, this.bridgeW)

    this.layoutPart(this.top,    topH,    topY)
    this.layoutPart(this.mid,    midH,    topY + topH)
    this.layoutPart(this.bottom, bottomH, topY + topH + midH)
  }
}

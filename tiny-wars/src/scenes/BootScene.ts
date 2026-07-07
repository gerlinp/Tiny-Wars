import Phaser from 'phaser'
import { TERRAIN_WATER } from '@data/TerrainManifest'
import { getHealthBarImageKeys } from '@data/AssetManifest'
import { registerHealthBarFrames } from '@rendering/HealthBar'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    this.load.image(TERRAIN_WATER.key, TERRAIN_WATER.path)
    // Load the health-bar art here (tiny, fast) so PreloadScene's own loading bar —
    // which checks for this texture at creation time — can use the real bar from
    // the very first frame instead of falling back to a plain rectangle.
    for (const bar of getHealthBarImageKeys()) {
      this.load.image(bar.key, bar.path)
    }
  }

  create(): void {
    // Named leftCap/mid/rightCap/fill sub-frames must exist before PreloadScene's
    // loading bar uses them, or HealthBar falls back to whole-image frame 0 (the
    // fragmented/gapped bar look).
    registerHealthBarFrames(this)
    this.scene.start('PreloadScene')
  }
}

import Phaser from 'phaser'
import { TERRAIN_WATER } from '@data/TerrainManifest'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    this.load.image(TERRAIN_WATER.key, TERRAIN_WATER.path)
  }

  create(): void {
    this.scene.start('PreloadScene')
  }
}

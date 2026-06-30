import Phaser from 'phaser'
import { TERRAIN_WATER } from '@data/TerrainManifest'

/** Matches TileMapRenderer fallback when the water texture is missing. */
const FALLBACK_WATER_COLOR = 0x1a3a6a

export interface WaterBackgroundOptions {
  depth?: number
  scrollFactor?: number
}

/** Tiled water texture fill for menu and loading screens. */
export function createWaterBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
  options: WaterBackgroundOptions = {},
): Phaser.GameObjects.GameObject {
  const depth = options.depth ?? 0
  const scrollFactor = options.scrollFactor ?? 0

  if (scene.textures.exists(TERRAIN_WATER.key)) {
    return scene.add
      .tileSprite(0, 0, width, height, TERRAIN_WATER.key)
      .setOrigin(0)
      .setDepth(depth)
      .setScrollFactor(scrollFactor)
  }

  return scene.add
    .rectangle(0, 0, width, height, FALLBACK_WATER_COLOR)
    .setOrigin(0)
    .setDepth(depth)
    .setScrollFactor(scrollFactor)
}

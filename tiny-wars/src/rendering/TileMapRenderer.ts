import Phaser from 'phaser'
import { GRID_COLS, GRID_ROWS, CELL_SIZE } from '@data/GameConstants'
import { TERRAIN_COLOR1, TERRAIN_WATER, TERRAIN_BRIDGE } from '@data/TerrainManifest'
import {
  terrainCellAt,
  grassTilePlacement,
  cliffOverlayAt,
  bridgeFrameIndex,
} from '@rendering/TerrainMap'

const DEPTH_WATER = 0
const DEPTH_CLIFF = 1
const DEPTH_GROUND = 2
const DEPTH_BRIDGE = 3

const FALLBACK_WATER_COLOR = 0x1a3a6a
const FALLBACK_BRIDGE_COLOR = 0x8b6914
const FALLBACK_GRASS_COLOR = 0x2d6a2d

export class TileMapRenderer {
  constructor(private scene: Phaser.Scene) {}

  draw(): void {
    const hasTileset = this.scene.textures.exists(TERRAIN_COLOR1.key)
    const hasWater = this.scene.textures.exists(TERRAIN_WATER.key)
    const hasBridge = this.scene.textures.exists(TERRAIN_BRIDGE.key)

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = col * CELL_SIZE
        const y = row * CELL_SIZE
        const kind = terrainCellAt(col, row)

        if (kind === 'water') {
          this.drawTile(x, y, hasWater ? TERRAIN_WATER.key : null, null, FALLBACK_WATER_COLOR, DEPTH_WATER)
          const cliff = cliffOverlayAt(col, row)
          if (cliff && hasTileset) {
            this.drawTile(x, y, TERRAIN_COLOR1.key, cliff.frame, FALLBACK_WATER_COLOR, DEPTH_CLIFF, cliff.flipY)
          }
        } else if (kind === 'bridge') {
          this.drawTile(x, y, hasWater ? TERRAIN_WATER.key : null, null, FALLBACK_WATER_COLOR, DEPTH_WATER)
          const frame = bridgeFrameIndex(col, row)
          this.drawTile(x, y, hasBridge ? TERRAIN_BRIDGE.key : null, frame, FALLBACK_BRIDGE_COLOR, DEPTH_BRIDGE)
        } else {
          const { frame, flipY } = grassTilePlacement(col, row)
          this.drawTile(x, y, hasTileset ? TERRAIN_COLOR1.key : null, frame, FALLBACK_GRASS_COLOR, DEPTH_GROUND, flipY)
        }
      }
    }
  }

  private drawTile(
    x: number,
    y: number,
    textureKey: string | null,
    frame: number | null,
    fallbackColor: number,
    depth: number,
    flipY = false,
  ): void {
    if (textureKey !== null) {
      const img = frame !== null
        ? this.scene.add.image(x, y, textureKey, frame)
        : this.scene.add.image(x, y, textureKey)
      img.setOrigin(0, flipY ? 1 : 0)
      if (flipY) img.y += CELL_SIZE
      img.setFlipY(flipY)
      img.setDisplaySize(CELL_SIZE, CELL_SIZE).setDepth(depth)
      return
    }
    this.scene.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, fallbackColor, 1)
      .setOrigin(0)
      .setDepth(depth)
  }
}

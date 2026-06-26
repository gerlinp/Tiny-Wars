import Phaser from 'phaser'
import { GRID_COLS, GRID_ROWS, CELL_SIZE, RIVER_ROW_START, RIVER_ROW_END, LEFT_BRIDGE_COLS, RIGHT_BRIDGE_COLS } from '@data/GameConstants'
import { TERRAIN_COLOR1, TERRAIN_WATER, TERRAIN_BRIDGE, BRIDGE_BANK_PADDING_ROWS } from '@data/TerrainManifest'
import { BridgeStrip } from '@rendering/BridgeStrip'
import {
  terrainCellAt,
  grassTilePlacement,
  cliffOverlayAt,
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
    const hasWater   = this.scene.textures.exists(TERRAIN_WATER.key)
    const hasBridge  = this.scene.textures.exists(TERRAIN_BRIDGE.key)

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
          // Water underneath; bridge deck drawn as single image below
          this.drawTile(x, y, hasWater ? TERRAIN_WATER.key : null, null, FALLBACK_WATER_COLOR, DEPTH_WATER)
        } else {
          const { frame, flipY } = grassTilePlacement(col, row)
          this.drawTile(x, y, hasTileset ? TERRAIN_COLOR1.key : null, frame, FALLBACK_GRASS_COLOR, DEPTH_GROUND, flipY)
        }
      }
    }

    this.drawBridges(hasBridge)
  }

  /** Draw each bridge as a 3-slice vertical strip (health-bar style). */
  private drawBridges(hasBridge: boolean): void {
    const spanStart = RIVER_ROW_START - BRIDGE_BANK_PADDING_ROWS
    const spanEnd   = RIVER_ROW_END + BRIDGE_BANK_PADDING_ROWS
    const bridgeH   = (spanEnd - spanStart + 1) * CELL_SIZE
    const bridgeW   = 2 * CELL_SIZE
    const topY      = spanStart * CELL_SIZE

    if (!hasBridge) {
      for (const pair of [LEFT_BRIDGE_COLS, RIGHT_BRIDGE_COLS]) {
        const x = Math.min(pair[0], pair[1]) * CELL_SIZE
        this.scene.add.rectangle(x, topY, bridgeW, bridgeH, FALLBACK_BRIDGE_COLOR, 1)
          .setOrigin(0)
          .setDepth(DEPTH_BRIDGE)
      }
      return
    }

    for (const pair of [LEFT_BRIDGE_COLS, RIGHT_BRIDGE_COLS]) {
      const x = Math.min(pair[0], pair[1]) * CELL_SIZE
      new BridgeStrip(this.scene, x, topY, bridgeH, bridgeW, DEPTH_BRIDGE)
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

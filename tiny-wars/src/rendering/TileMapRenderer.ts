import Phaser from 'phaser'
import { GRID_COLS, GRID_ROWS, CELL_SIZE, RIVER_ROW_START, RIVER_ROW_END, LEFT_BRIDGE_COLS, RIGHT_BRIDGE_COLS } from '@data/GameConstants'

export class TileMapRenderer {
  constructor(private scene: Phaser.Scene) {}

  draw(): void {
    const hasFlat  = this.scene.textures.exists('terrain_flat')

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = col * CELL_SIZE
        const y = row * CELL_SIZE
        const inRiver  = row >= RIVER_ROW_START && row <= RIVER_ROW_END
        const isBridge = (LEFT_BRIDGE_COLS as readonly number[]).includes(col)
          || (RIGHT_BRIDGE_COLS as readonly number[]).includes(col)

        if (inRiver && !isBridge) {
          // River cell — deep blue
          this.scene.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, 0x1a3a6a, 1).setOrigin(0)
        } else if (hasFlat) {
          // Grass tile — use terrain texture tinted per-side
          const img = this.scene.add.image(x, y, 'terrain_flat').setOrigin(0)
          img.setDisplaySize(CELL_SIZE, CELL_SIZE)
          // Subtle colour difference: player (bottom) slightly greener, bot (top) slightly cooler
          if (row > RIVER_ROW_END) {
            img.setTint(0xaaddaa)
          } else {
            img.setTint(0xaaccaa)
          }
        } else {
          // Fallback solid colour
          const color = inRiver && isBridge ? 0x8b6914 : (row > RIVER_ROW_END ? 0x2d6a2d : 0x1a4a1a)
          this.scene.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, color, 1).setOrigin(0)
        }

        // Bridge column marker in river zone
        if (inRiver && isBridge) {
          this.scene.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, 0x8b6914, 1).setOrigin(0)
        }
      }
    }

    // River midline highlight
    const riverCentreY = ((RIVER_ROW_START + RIVER_ROW_END) / 2) * CELL_SIZE
    this.scene.add.rectangle(0, riverCentreY, GRID_COLS * CELL_SIZE, 2, 0x3355cc, 0.5).setOrigin(0)
  }
}

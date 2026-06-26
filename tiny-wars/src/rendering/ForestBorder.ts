import Phaser from 'phaser'
import { CELL_SIZE, GAME_WIDTH, GAME_HEIGHT } from '@data/GameConstants'

const TREE_KEYS = ['tree1', 'tree2', 'tree3', 'tree4'] as const

const TREE_W = CELL_SIZE * 5   // 100px wide
const TREE_H = CELL_SIZE * 9   // 180px tall

// Step between tree origins: 60% of height → 40% overlap so each tree stays legible
const STEP_Y = TREE_H * 0.6    // 108px

// Tree depths — below units but above terrain
const DEPTH = 4

function pickKey(i: number): string {
  return TREE_KEYS[((i * 7 + i * i * 3) >>> 0) % TREE_KEYS.length]!
}

export class ForestBorder {
  constructor(private scene: Phaser.Scene) {}

  draw(): void {
    if (!TREE_KEYS.some(k => this.scene.textures.exists(k))) return
    // Center trees exactly at screen edges — half the tree bleeds off, half shows in arena
    this.drawColumn(0)
    this.drawColumn(GAME_WIDTH)
  }

  private drawColumn(centerX: number): void {
    const startY = -TREE_H * 0.4   // start above screen top
    const endY   = GAME_HEIGHT + TREE_H * 0.4

    let i = 0
    for (let y = startY; y <= endY; y += STEP_Y) {
      const key = pickKey(i)
      if (!this.scene.textures.exists(key)) { i++; continue }

      const jitter = ((i * 13) % 20) - 10   // ±10px Y jitter
      const img = this.scene.add.image(centerX, y + jitter, key)
      img.setOrigin(0.5, 1)
      img.setDisplaySize(TREE_W, TREE_H)
      img.setDepth(DEPTH)
      i++
    }
  }
}

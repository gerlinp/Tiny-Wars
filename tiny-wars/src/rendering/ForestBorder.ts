import Phaser from 'phaser'
import { CELL_SIZE, GAME_WIDTH, GAME_HEIGHT } from '@data/GameConstants'

const ALL_TREE_KEYS = ['tree1', 'tree2', 'tree3', 'tree4'] as const
const TREE_FRAME_COUNT = 8
const TREE_FPS         = 8

const TREE_W  = CELL_SIZE * 5   // 100px wide
const TREE_H  = CELL_SIZE * 9   // 180px tall
const STEP_Y  = TREE_H * 0.6   // 40% overlap between consecutive trees
const DEPTH   = 4

// Non-map decorations scattered in the side border strips
// Format: [key, frameCount|0 for static, fps]  — frameCount=0 means static image
const SIDE_DECOS: readonly [string, number, number][] = [
  ['stump1', 0, 0], ['stump2', 0, 0], ['stump3', 0, 0], ['stump4', 0, 0],
  ['rock1',  0, 0], ['rock2',  0, 0], ['rock3',  0, 0], ['rock4',  0, 0],
  ['bush1',  8, 8], ['bush2',  8, 8], ['bush3',  8, 8], ['bush4',  8, 8],
]

export class ForestBorder {
  private treePattern: string[] = []
  private availableDecos: typeof SIDE_DECOS[number][] = []

  constructor(
    private scene: Phaser.Scene,
    private leftEdgeX = 0,
    private rightEdgeX = GAME_WIDTH,
  ) {}

  draw(): void {
    this.treePattern = ALL_TREE_KEYS
      .filter(k => this.scene.textures.exists(k))
      .slice(0, 3)
    if (this.treePattern.length === 0) return

    this.availableDecos = SIDE_DECOS.filter(([key]) => this.scene.textures.exists(key))

    this.ensureAnims()
    this.drawColumn(this.leftEdgeX, true)
    this.drawColumn(this.rightEdgeX, false)
  }

  private ensureAnims(): void {
    // Tree animations
    for (const key of this.treePattern) {
      const animKey = `${key}_sway`
      if (this.scene.anims.exists(animKey)) continue
      this.scene.anims.create({
        key: animKey,
        frames: this.scene.anims.generateFrameNumbers(key, { start: 0, end: TREE_FRAME_COUNT - 1 }),
        frameRate: TREE_FPS,
        repeat: -1,
      })
    }
    // Animated side decos (e.g. bushes)
    for (const [key, frames, fps] of this.availableDecos) {
      if (frames === 0) continue
      const animKey = `${key}_idle`
      if (this.scene.anims.exists(animKey)) continue
      this.scene.anims.create({
        key: animKey,
        frames: this.scene.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
        frameRate: fps,
        repeat: -1,
      })
    }
  }

  private drawColumn(edgeX: number, isLeft: boolean): void {
    const n      = this.treePattern.length
    const startY = -TREE_H * 0.4
    const endY   = GAME_HEIGHT + TREE_H * 0.4
    let i = 0

    for (let y = startY; y <= endY; y += STEP_Y) {
      // Tree
      const key    = this.treePattern[i % n]!
      const jitter = ((i * 13) % 20) - 10
      const spr    = this.scene.add.sprite(edgeX, y + jitter, key, 0)
      spr.setOrigin(0.5, 1)
      spr.setDisplaySize(TREE_W, TREE_H)
      spr.setDepth(DEPTH)
      spr.play(`${key}_sway`)

      // Side deco between this tree and the next
      if (this.availableDecos.length > 0) {
        const deco = this.availableDecos[(i * 7 + 3) % this.availableDecos.length]!
        const [decoKey, frames] = deco
        const decoY = y + STEP_Y * 0.5 + ((i * 11) % 30) - 15
        const xOffset = isLeft
          ? edgeX + 18 + (i % 3) * 6
          : edgeX - 18 - (i % 3) * 6
        const decoSize = CELL_SIZE * 1.8

        if (frames > 0) {
          const ds = this.scene.add.sprite(xOffset, decoY, decoKey, 0)
          ds.setOrigin(0.5, 1)
          const sc = Math.min(decoSize / ds.width, decoSize / ds.height, 1)
          ds.setDisplaySize(ds.width * sc, ds.height * sc)
          ds.setDepth(DEPTH - 1)
          ds.play(`${decoKey}_idle`)
        } else {
          const img = this.scene.add.image(xOffset, decoY, decoKey)
          img.setOrigin(0.5, 1)
          const sc = Math.min(decoSize / img.width, decoSize / img.height, 1)
          img.setDisplaySize(img.width * sc, img.height * sc)
          img.setDepth(DEPTH - 1)
        }
      }

      i++
    }
  }
}

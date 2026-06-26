import Phaser from 'phaser'
import { CELL_SIZE } from '@data/GameConstants'
import { getActiveMapConfig } from '@data/ActiveMapConfig'

interface AnimConfig { frames: number; fps: number }

// Spritesheet decorations and their animation config
const ANIM_CONFIGS: Record<string, AnimConfig> = {
  tree1:     { frames: 8, fps: 8 },
  tree2:     { frames: 8, fps: 8 },
  tree3:     { frames: 8, fps: 8 },
  tree4:     { frames: 8, fps: 8 },
  bush1:     { frames: 8, fps: 8 },
  bush2:     { frames: 8, fps: 8 },
  bush3:     { frames: 8, fps: 8 },
  bush4:     { frames: 8, fps: 8 },
  wrock1:    { frames: 8, fps: 6 },
  wrock2:    { frames: 8, fps: 6 },
  wrock3:    { frames: 8, fps: 6 },
  wrock4:    { frames: 8, fps: 6 },
  wrock_in1: { frames: 8, fps: 6 },
  wrock_in2: { frames: 8, fps: 6 },
  wrock_in3: { frames: 8, fps: 6 },
  wrock_in4: { frames: 8, fps: 6 },
  duck:      { frames: 3, fps: 5 },
}

const LARGE_IDS = new Set(['tree1', 'tree2', 'tree3', 'tree4'])

export class DecorationLayer {
  constructor(private scene: Phaser.Scene) {}

  draw(): void {
    const config = getActiveMapConfig()
    if (!config?.decorations?.length) return

    for (let i = 0; i < config.decorations.length; i++) {
      const deco = config.decorations[i]!
      if (!this.scene.textures.exists(deco.id)) continue

      const x = deco.col * CELL_SIZE + CELL_SIZE / 2
      const y = deco.row * CELL_SIZE + CELL_SIZE

      const animCfg = ANIM_CONFIGS[deco.id]
      const isLarge = LARGE_IDS.has(deco.id)
      const maxW    = isLarge ? CELL_SIZE * 3 : CELL_SIZE * 2.5
      const maxH    = isLarge ? CELL_SIZE * 5 : CELL_SIZE * 3

      if (animCfg) {
        // Animated spritesheet — ensure anim exists, then play it
        const animKey = `${deco.id}_idle`
        if (!this.scene.anims.exists(animKey)) {
          this.scene.anims.create({
            key: animKey,
            frames: this.scene.anims.generateFrameNumbers(deco.id, { start: 0, end: animCfg.frames - 1 }),
            frameRate: animCfg.fps,
            repeat: -1,
          })
        }
        const spr = this.scene.add.sprite(x, y, deco.id, 0)
        spr.setOrigin(0.5, 1)
        const scale = Math.min(maxW / spr.width, maxH / spr.height, 1)
        spr.setDisplaySize(spr.width * scale, spr.height * scale)
        spr.setDepth(3)
        spr.play(animKey)
      } else {
        // Static single-frame asset
        const img = this.scene.add.image(x, y, deco.id)
        img.setOrigin(0.5, 1)
        const scale = Math.min(maxW / img.width, maxH / img.height, 1)
        img.setDisplaySize(img.width * scale, img.height * scale)
        img.setDepth(3)
      }
    }
  }
}

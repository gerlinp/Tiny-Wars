import Phaser from 'phaser'

export const SNAKE_SPRAY_TEXTURE_KEY = 'snake_spray'

/** Thin wavy venom stream — stretched along the snake→target line, like a continuous spray jet. */
export function registerSnakeSprayTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SNAKE_SPRAY_TEXTURE_KEY)) return

  const g = scene.make.graphics({ x: 0, y: 0 })
  g.setVisible(false)
  const w = 48
  const h = 10

  for (let x = 0; x < w; x++) {
    const wave = Math.sin(x * 0.55) * 3
    const mid = h / 2 + wave
    // Droplet scatter above/below the core stream for a sprayed, uneven edge.
    g.fillStyle(0x99cc00, 0.35)
    g.fillRect(x, mid - 4, 1, 1)
    g.fillRect(x, mid + 3, 1, 1)
    g.fillStyle(0xaadd22, 0.7)
    g.fillRect(x, mid - 2, 1, 1)
    g.fillRect(x, mid + 2, 1, 1)
    g.fillStyle(0xccff33, 1)
    g.fillRect(x, mid - 1, 1, 3)
  }

  g.generateTexture(SNAKE_SPRAY_TEXTURE_KEY, w, h)
  g.destroy()
}

import Phaser from 'phaser'

export const HOOK_ROPE_TEXTURE_KEY = 'hook_rope'

/** Thin horizontal rope strip — stretched along the shark→target line. */
export function registerHookRopeTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(HOOK_ROPE_TEXTURE_KEY)) return

  const g = scene.make.graphics({ x: 0, y: 0 })
  g.setVisible(false)
  const w = 48
  const h = 3

  for (let x = 0; x < w; x++) {
    const twist = Math.sin(x * 0.45) * 0.4
    g.fillStyle(0x5c4018, 1)
    g.fillRect(x, 0 + twist, 1, 1)
    g.fillStyle(0x9a7030, 1)
    g.fillRect(x, 1 + twist, 1, 1)
    g.fillStyle(0xc4a035, 1)
    g.fillRect(x, 2 + twist, 1, 1)
  }

  g.generateTexture(HOOK_ROPE_TEXTURE_KEY, w, h)
  g.destroy()
}

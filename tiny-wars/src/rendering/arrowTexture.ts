import Phaser from 'phaser'

/** Procedural arrow with transparency — asset PNG has opaque padding. */
export function ensureArrowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('arrow_proj')) return

  const g = scene.make.graphics({ x: 0, y: 0 })
  g.fillStyle(0x8b5a2b, 1)
  g.fillRect(4, 6, 26, 5)
  g.fillStyle(0xd8d8d8, 1)
  g.fillTriangle(30, 4, 38, 8.5, 30, 13)
  g.fillStyle(0xf0f0f0, 1)
  g.fillTriangle(4, 4, 9, 8.5, 4, 13)
  g.generateTexture('arrow_proj', 40, 17)
  g.destroy()
}

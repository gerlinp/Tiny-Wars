import Phaser from 'phaser'

const COLORS: Record<string, number> = {
  placeholder_player: 0x4488ff,
  placeholder_bot:    0xff4444,
  placeholder_tower:  0xffcc44,
  placeholder_spell:  0xcc44ff,
}

/** Registers a solid-colour rectangle texture for every key that failed to load */
export function ensurePlaceholders(scene: Phaser.Scene): void {
  for (const [key, color] of Object.entries(COLORS)) {
    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0 })
      g.fillStyle(color, 1)
      g.fillRect(0, 0, 32, 32)
      g.generateTexture(key, 32, 32)
      g.destroy()
    }
  }
}

/** Return the placeholder key if a texture is missing */
export function resolveTexture(scene: Phaser.Scene, key: string, fallback: string): string {
  return scene.textures.exists(key) ? key : fallback
}

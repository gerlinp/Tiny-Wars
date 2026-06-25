import Phaser from 'phaser'
import { getCardAvatarDef } from '@data/AssetManifest'

/** Resolve a loaded card-hand avatar texture — never falls back to placeholders. */
export function resolveCardAvatar(scene: Phaser.Scene, cardId: string): string {
  const def = getCardAvatarDef(cardId)
  if (!scene.textures.exists(def.key)) {
    throw new Error(
      `Card avatar "${def.key}" for "${cardId}" is not loaded (path: ${def.path}).`,
    )
  }
  return def.key
}

export function applyCardAvatarTexture(
  image: Phaser.GameObjects.Image,
  scene: Phaser.Scene,
  cardId: string,
): void {
  const key = resolveCardAvatar(scene, cardId)
  const def = getCardAvatarDef(cardId)
  if (def.frame !== undefined) {
    image.setTexture(key, def.frame)
  } else {
    image.setTexture(key)
  }
}

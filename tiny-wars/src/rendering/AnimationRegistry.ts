import Phaser from 'phaser'
import { Owner } from '@core/types'
import {
  CARD_ASSET_BUNDLES,
  clipAnimKey,
  type AnimClip,
  type SideAssets,
} from '@data/AssetManifest'

function registerClip(scene: Phaser.Scene, cardId: string, owner: Owner, anim: AnimClip, side: SideAssets): void {
  const def = side[anim]
  const key = clipAnimKey(cardId, owner, anim)
  if (scene.anims.exists(key)) return

  if (!scene.textures.exists(def.sheet.key)) return

  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(def.sheet.key, {
      start: def.start,
      end: def.end,
    }),
    frameRate: def.frameRate,
    repeat: def.repeat,
  })
}

export function registerCardAnimations(scene: Phaser.Scene): void {
  for (const bundle of CARD_ASSET_BUNDLES) {
    if (bundle.animated === false) continue
    for (const [owner, side] of [[Owner.PLAYER, bundle.player], [Owner.BOT, bundle.bot]] as const) {
      registerClip(scene, bundle.cardId, owner, 'idle', side)
      registerClip(scene, bundle.cardId, owner, 'run', side)
      registerClip(scene, bundle.cardId, owner, 'attack', side)
    }
  }
}

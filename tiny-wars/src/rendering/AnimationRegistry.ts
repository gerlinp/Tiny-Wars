import Phaser from 'phaser'
import { Owner } from '@core/types'
import {
  CARD_ASSET_BUNDLES,
  clipAnimKey,
  DAMAGE_FIRE_SHEETS,
  TROOP_DEATH_SHEET,
  type AnimClip,
  type ClipDef,
  type SideAssets,
} from '@data/AssetManifest'

function registerClip(
  scene: Phaser.Scene,
  def: ClipDef,
  key: string,
): void {
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

function registerSideClips(scene: Phaser.Scene, cardId: string, owner: Owner, side: SideAssets): void {
  registerClip(scene, side.idle, clipAnimKey(cardId, owner, 'idle'))
  registerClip(scene, side.run, clipAnimKey(cardId, owner, 'run'))
  registerClip(scene, side.attack, clipAnimKey(cardId, owner, 'attack'))
  if (side.attackUp) {
    registerClip(scene, side.attackUp, clipAnimKey(cardId, owner, 'attack', 'up'))
  }
  if (side.attackDown) {
    registerClip(scene, side.attackDown, clipAnimKey(cardId, owner, 'attack', 'down'))
  }
}

export function registerCardAnimations(scene: Phaser.Scene): void {
  for (const bundle of CARD_ASSET_BUNDLES) {
    if (bundle.animated === false) continue
    for (const [owner, side] of [[Owner.PLAYER, bundle.player], [Owner.BOT, bundle.bot]] as const) {
      registerSideClips(scene, bundle.cardId, owner, side)
    }
  }
  registerHexShamanFx(scene)
}

export function registerTroopDeathAnim(scene: Phaser.Scene): void {
  const { key, animKey, frameStart, frameEnd, frameRate } = TROOP_DEATH_SHEET
  if (scene.anims.exists(animKey)) return
  if (!scene.textures.exists(key)) return

  scene.anims.create({
    key: animKey,
    frames: scene.anims.generateFrameNumbers(key, { start: frameStart, end: frameEnd }),
    frameRate,
    repeat: 0,
  })
}

export function registerDamageFireAnims(scene: Phaser.Scene): void {
  for (const sheet of DAMAGE_FIRE_SHEETS) {
    if (scene.anims.exists(sheet.animKey)) continue
    if (!scene.textures.exists(sheet.key)) continue

    scene.anims.create({
      key: sheet.animKey,
      frames: scene.anims.generateFrameNumbers(sheet.key, { start: 0, end: sheet.frameEnd }),
      frameRate: sheet.frameRate,
      repeat: -1,
    })
  }
}

/** Hex Shaman fireball — projectile frame 0, full explosion sheet on impact. */
export function registerHexShamanFx(scene: Phaser.Scene): void {
  const sheetKey = 'hex_shaman_explosion'
  const animKey = 'hex_shaman_explosion_anim'
  if (!scene.anims.exists(animKey) && scene.textures.exists(sheetKey)) {
    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(sheetKey, { start: 0, end: 8 }),
      frameRate: 18,
      repeat: 0,
    })
  }
}

export function playCardAnim(
  sprite: Phaser.GameObjects.Sprite,
  scene: Phaser.Scene,
  cardId: string,
  owner: Owner,
  anim: AnimClip,
  repeat = -1,
): void {
  const key = clipAnimKey(cardId, owner, anim)
  if (!scene.anims.exists(key)) {
    sprite.anims.stop()
    return
  }
  sprite.play({ key, repeat })
}

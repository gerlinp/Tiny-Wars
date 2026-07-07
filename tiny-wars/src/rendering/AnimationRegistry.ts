import Phaser from 'phaser'
import { Owner } from '@core/types'
import {
  CARD_ASSET_BUNDLES,
  clipAnimKey,
  DAMAGE_FIRE_SHEETS,
  DUST_SHEETS,
  MONK_HEAL_EFFECT_SHEETS,
  EXPLOSION_SHEET,
  GOBLIN_DYNAMITE_SHEET,
  GNOLL_BONE_SHEET,
  TROOP_DEATH_SHEET,
  WATER_SPLASH_SHEET,
  PADDLE_SHARK_IDLE_SHEET,
  PADDLE_SHARK_ROW_SHEET,
  HEX_SHAMAN_TRANSFORM_SPELL_SHEET,
  HEX_SHAMAN_EXPLOSION_SPELL_SHEET,
  LIGHTNING_ARC_SHEET,
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

  const frames = def.frames
    ? def.frames.map(frame => ({ key: def.sheet.key, frame }))
    : scene.anims.generateFrameNumbers(def.sheet.key, {
        start: def.start,
        end: def.end,
      })

  scene.anims.create({
    key,
    frames,
    frameRate: def.frameRate,
    repeat: def.repeat,
  })
}

/** Register only the run clip — used on the loading screen before the full asset pass. */
export function registerCardRunAnim(scene: Phaser.Scene, cardId: string, owner: Owner): void {
  const bundle = CARD_ASSET_BUNDLES.find(b => b.cardId === cardId)
  if (!bundle || bundle.animated === false) return
  const side = owner === Owner.PLAYER ? bundle.player : bundle.bot
  registerClip(scene, side.run, clipAnimKey(cardId, owner, 'run'))
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
  if (side.attackDownRight) {
    registerClip(scene, side.attackDownRight, clipAnimKey(cardId, owner, 'attack', 'down_right'))
  }
  if (side.attackDownLeft) {
    registerClip(scene, side.attackDownLeft, clipAnimKey(cardId, owner, 'attack', 'down_left'))
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
  for (const sheet of [TROOP_DEATH_SHEET, WATER_SPLASH_SHEET]) {
    const { key, animKey, frameStart, frameEnd, frameRate } = sheet
    if (scene.anims.exists(animKey)) continue
    if (!scene.textures.exists(key)) continue

    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(key, { start: frameStart, end: frameEnd }),
      frameRate,
      repeat: 0,
    })
  }
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

/** Per-card fire-colored orb projectile (3 frames, loops) + explosion (9 frames, one-shot).
 *  Keys are side-independent: the fire color is card-identity, not faction. */
export function registerShamanOrbFx(scene: Phaser.Scene): void {
  // elder_shaman uses HexTransformPool instead
  for (const cardId of ['wizard', 'lightning_shaman', 'voodoo_shaman']) {
    const projKey  = `${cardId}_projectile`
    const projAnim = `${cardId}_projectile_anim`
    if (!scene.anims.exists(projAnim) && scene.textures.exists(projKey)) {
      scene.anims.create({ key: projAnim, frames: scene.anims.generateFrameNumbers(projKey, { start: 0, end: 2 }), frameRate: 12, repeat: -1 })
    }
    const exKey  = `${cardId}_explosion`
    const exAnim = `${cardId}_explosion_anim`
    if (!scene.anims.exists(exAnim) && scene.textures.exists(exKey)) {
      scene.anims.create({ key: exAnim, frames: scene.anims.generateFrameNumbers(exKey, { start: 0, end: 8 }), frameRate: 18, repeat: 0 })
    }
  }
}

/**
 * Lightning Shaman bolt — a jagged arc stretched across the attack line, built from
 * 13 individually-authored crackle frames (each its own texture, not a spritesheet).
 * frameRate is a placeholder; LightningShamanPool overrides it per-play so the
 * animation always finishes exactly when the bolt should land.
 */
export function registerLightningArcFx(scene: Phaser.Scene): void {
  const { keys, animKey } = LIGHTNING_ARC_SHEET
  if (scene.anims.exists(animKey)) return
  if (!keys.every(key => scene.textures.exists(key))) return
  scene.anims.create({
    key: animKey,
    frames: keys.map(key => ({ key, frame: 0 })),
    frameRate: 26,
    repeat: 0,
  })
}

/** Elder Shaman transformation circle (11 frames) + explosion spell (10 frames). */
export function registerHexTransformFx(scene: Phaser.Scene): void {
  if (!scene.anims.exists(HEX_SHAMAN_TRANSFORM_SPELL_SHEET.animKey)
      && scene.textures.exists(HEX_SHAMAN_TRANSFORM_SPELL_SHEET.key)) {
    scene.anims.create({
      key: HEX_SHAMAN_TRANSFORM_SPELL_SHEET.animKey,
      frames: scene.anims.generateFrameNumbers(HEX_SHAMAN_TRANSFORM_SPELL_SHEET.key, {
        start: 0, end: HEX_SHAMAN_TRANSFORM_SPELL_SHEET.frameEnd,
      }),
      frameRate: HEX_SHAMAN_TRANSFORM_SPELL_SHEET.frameRate,
      repeat: 0,
    })
  }
  if (!scene.anims.exists(HEX_SHAMAN_EXPLOSION_SPELL_SHEET.animKey)
      && scene.textures.exists(HEX_SHAMAN_EXPLOSION_SPELL_SHEET.key)) {
    scene.anims.create({
      key: HEX_SHAMAN_EXPLOSION_SPELL_SHEET.animKey,
      frames: scene.anims.generateFrameNumbers(HEX_SHAMAN_EXPLOSION_SPELL_SHEET.key, {
        start: 0, end: HEX_SHAMAN_EXPLOSION_SPELL_SHEET.frameEnd,
      }),
      frameRate: HEX_SHAMAN_EXPLOSION_SPELL_SHEET.frameRate,
      repeat: 0,
    })
  }
}

/** Monk heal aura — blue/red Heal_Effect sheets (11 frames). */
export function registerMonkHealFx(scene: Phaser.Scene): void {
  for (const sheet of Object.values(MONK_HEAL_EFFECT_SHEETS)) {
    if (scene.anims.exists(sheet.animKey)) continue
    if (!scene.textures.exists(sheet.key)) continue
    scene.anims.create({
      key: sheet.animKey,
      frames: scene.anims.generateFrameNumbers(sheet.key, { start: 0, end: 10 }),
      frameRate: 16,
      repeat: 0,
    })
  }
}

/** Gnoll bone boomerang — spinning projectile (4 frames). */
export function registerGnollBoneFx(scene: Phaser.Scene): void {
  if (scene.anims.exists(GNOLL_BONE_SHEET.animKey)) return
  if (!scene.textures.exists(GNOLL_BONE_SHEET.key)) return
  scene.anims.create({
    key: GNOLL_BONE_SHEET.animKey,
    frames: scene.anims.generateFrameNumbers(GNOLL_BONE_SHEET.key, {
      start: GNOLL_BONE_SHEET.frameStart,
      end: GNOLL_BONE_SHEET.frameEnd,
    }),
    frameRate: GNOLL_BONE_SHEET.frameRate,
    repeat: -1,
  })
}

/** Paddle Shark idle + row — used by AirBoatCrew. */
export function registerAirBoatCrewFx(scene: Phaser.Scene): void {
  for (const sheet of [PADDLE_SHARK_IDLE_SHEET, PADDLE_SHARK_ROW_SHEET]) {
    if (scene.anims.exists(sheet.animKey)) continue
    if (!scene.textures.exists(sheet.key)) continue
    scene.anims.create({
      key: sheet.animKey,
      frames: scene.anims.generateFrameNumbers(sheet.key, { start: sheet.frameStart, end: sheet.frameEnd }),
      frameRate: sheet.frameRate,
      repeat: -1,
    })
  }
}

/** Goblin Demolisher dynamite stick — spinning projectile strip. */
export function registerGoblinDynamiteFx(scene: Phaser.Scene): void {
  const { key, animKey, frameEnd, frameRate } = GOBLIN_DYNAMITE_SHEET
  if (scene.anims.exists(animKey)) return
  if (!scene.textures.exists(key)) return
  scene.anims.create({
    key: animKey,
    frames: scene.anims.generateFrameNumbers(key, { start: 0, end: frameEnd }),
    frameRate,
    repeat: -1,
  })
}

/** Generic bomb blast — Effects/Explosion/Explosions.png. */
export function registerExplosionFx(scene: Phaser.Scene): void {
  if (scene.anims.exists(EXPLOSION_SHEET.animKey)) return
  if (!scene.textures.exists(EXPLOSION_SHEET.key)) return
  scene.anims.create({
    key: EXPLOSION_SHEET.animKey,
    frames: scene.anims.generateFrameNumbers(EXPLOSION_SHEET.key, {
      start: 0,
      end: EXPLOSION_SHEET.frameEnd,
    }),
    frameRate: EXPLOSION_SHEET.frameRate,
    repeat: 0,
  })
}

export function registerDustFx(scene: Phaser.Scene): void {
  for (const sheet of DUST_SHEETS) {
    if (scene.anims.exists(sheet.animKey)) continue
    if (!scene.textures.exists(sheet.key)) continue
    scene.anims.create({
      key: sheet.animKey,
      frames: scene.anims.generateFrameNumbers(sheet.key, { start: 0, end: sheet.frameEnd }),
      frameRate: sheet.frameRate,
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

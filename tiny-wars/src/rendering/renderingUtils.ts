import type Phaser from 'phaser'
import { Owner } from '@core/types'
import { idleSheetKey, cardAvatarKey, getCardAvatarDef, DAMAGE_FIRE_GRID } from '@data/AssetManifest'

// ─── Arrow texture helpers ────────────────────────────────────────────────────

/** Visible arrow bounds inside the 64×64 Arrow.png (matches Archer_Shoot frames). */
export const ARROW_SPRITE_CROP = { x: 10, y: 26, width: 43, height: 12 } as const

export const ARROW_DISPLAY_W = 44
export const ARROW_DISPLAY_H = 13

export function arrowTextureKey(owner: Owner): string {
  return owner === Owner.PLAYER ? 'arrow_blue' : 'arrow_red'
}

export function applyArrowSprite(img: Phaser.GameObjects.Image): void {
  img.setCrop(
    ARROW_SPRITE_CROP.x,
    ARROW_SPRITE_CROP.y,
    ARROW_SPRITE_CROP.width,
    ARROW_SPRITE_CROP.height,
  )
  img.setDisplaySize(ARROW_DISPLAY_W, ARROW_DISPLAY_H)
  img.setOrigin(0.35, 0.5)
}

// ─── Asset key helpers ────────────────────────────────────────────────────────

/** Returns the idle spritesheet key for in-map entity sprites */
export function cardTextureKey(cardId: string, owner: Owner): string {
  return idleSheetKey(cardId, owner)
}

/** Static portrait for the card hand UI */
export function cardIconKey(cardId: string): string {
  return cardAvatarKey(cardId)
}

/** Returns the texture key for a tower (King or Princess) */
export function towerTextureKey(isKing: boolean, owner: Owner, destroyed = false): string {
  if (destroyed) return isKing ? 'castle_destroyed' : 'tower_destroyed'
  if (isKing)    return owner === Owner.PLAYER ? 'castle_blue' : 'castle_red'
  return owner === Owner.PLAYER ? 'tower_blue' : 'tower_red'
}

// ─── Placeholder textures ─────────────────────────────────────────────────────

const PLACEHOLDER_COLORS: Record<string, number> = {
  placeholder_player: 0x4488ff,
  placeholder_bot:    0xff4444,
  placeholder_tower:  0xffcc44,
  placeholder_spell:  0xcc44ff,
}

/** Registers a solid-colour rectangle texture for every key that failed to load */
export function ensurePlaceholders(scene: Phaser.Scene): void {
  for (const [key, color] of Object.entries(PLACEHOLDER_COLORS)) {
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

// ─── Card avatar texture ──────────────────────────────────────────────────────

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

// ─── Damage fire logic ────────────────────────────────────────────────────────

export function damageFireTier(hpFraction: number): number {
  if (hpFraction > 0.75) return 0
  if (hpFraction > 0.50) return 1
  if (hpFraction > 0.25) return 2
  return 3
}

export function pickDamageFireGridCell(
  existing: readonly { col: number; row: number }[],
  cols = DAMAGE_FIRE_GRID.cols,
  rows = DAMAGE_FIRE_GRID.rows,
  rng: () => number = Math.random,
): { col: number; row: number } {
  const usedRows = new Set(existing.map(s => s.row))
  const unusedRows = Array.from({ length: rows }, (_, i) => i).filter(r => !usedRows.has(r))
  const row = unusedRows.length > 0
    ? unusedRows[Math.floor(rng() * unusedRows.length)]!
    : Math.floor(rng() * rows)
  const col = Math.floor(rng() * cols)
  return { col, row }
}

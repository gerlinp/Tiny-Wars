import { Owner } from '@core/types'

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
